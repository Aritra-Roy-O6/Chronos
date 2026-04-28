import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createDisturbance } from './disturbance.service.js';
import { getActiveDisturbances, routeAffectedByDisturbance } from './disturbance.service.js';
import { runReflexionLoop } from './orchestrator.service.js';
import { db, FieldValue } from '../config/firebase.js';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The schema for what the Watchman is looking for
const threatSchema = {
    type: Type.OBJECT,
    properties: {
        threatDetected: { type: Type.BOOLEAN, description: "True if a severe weather or news event disrupts the route." },
        location: { type: Type.STRING, description: "The city, port, or coordinate of the threat." },
        reason: { type: Type.STRING, description: "Short headline of the news/weather event." },
        severity: { type: Type.NUMBER, description: "Scale 0.1 to 1.0" },
        duration_hours: { type: Type.NUMBER, description: "Estimated hours until the disruption clears." }
    },
    required: ["threatDetected", "location", "reason", "severity", "duration_hours"]
};

export async function scanShipmentForThreats(shipmentData, shipmentId) {
    console.log(`📡 [WATCHMAN] Scraping global feeds for shipment: ${shipmentId} (${shipmentData.origin} -> ${shipmentData.destination})`);

    const routePoints = [shipmentData.origin, ...(shipmentData.stops || []), shipmentData.destination].join(', ');
    const prompt = `
        You are the CHRONOS Threat Intelligence Agent.
        Review current global weather and news to determine whether this route is disrupted: ${routePoints}.
        Consider sea, port, rail, and highway conditions that could affect the shipment.
        If a disruption exists, return threatDetected=true with a location, reason, severity, and approximate duration in hours.
        Otherwise return threatDetected=false.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: threatSchema,
                temperature: 0.4
            }
        });

        const report = JSON.parse(response.text);

        if (report.threatDetected && report.severity > 0.6) {
            console.log(`🚨 [WATCHMAN] THREAT DETECTED at ${report.location}: ${report.reason}`);
            await createDisturbance({
                location: report.location,
                reason: report.reason,
                severity: report.severity,
                duration_hours: report.duration_hours,
                source: 'AUTOMATED'
            });
        } else {
            console.log(`✅ [WATCHMAN] Route Clear. No threats detected.`);
        }
    } catch (error) {
        console.error("[WATCHMAN] External intelligence scan failed. Falling back to database reports:", error);
        await fallbackToDatabaseReports(shipmentData, shipmentId);
    }
}

async function fallbackToDatabaseReports(shipmentData, shipmentId) {
    try {
        const activeReports = await getActiveDisturbances();
        if (!activeReports.length) {
            console.log(`[WATCHMAN] No active database reports for fallback check on ${shipmentId}.`);
            return;
        }

        const matched = activeReports
            .filter((disturbance) => routeAffectedByDisturbance(shipmentData, disturbance))
            .sort((a, b) => (b.severity || 0) - (a.severity || 0));

        if (!matched.length) {
            console.log(`[WATCHMAN] Database fallback found no route-impacting reports for ${shipmentId}.`);
            return;
        }

        const topReport = matched[0];
        console.log(`🚨 [WATCHMAN] DB fallback matched active report at ${topReport.location}. Triggering reroute for ${shipmentId}.`);

        await db.collection('world_state').doc(shipmentId).update({
            status: 'PROCESSING',
            lastDisturbanceAt: FieldValue.serverTimestamp()
        });
        await runReflexionLoop(shipmentData, shipmentId, { autoExecute: true, disturbance: topReport });
    } catch (fallbackError) {
        console.error('[WATCHMAN] Database fallback failed:', fallbackError);
    }
}