import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The strict schema for 3 alternative routes
const plannerSchema = {
    type: Type.ARRAY,
    description: "Exactly 3 alternative shipping routes.",
    items: {
        type: Type.OBJECT,
        properties: {
            route_id: { type: Type.STRING, description: "Unique ID like 'ROUTE_A'" },
            path_description: { type: Type.STRING, description: "Step-by-step path (e.g., 'Rotterdam -> Rail to Genoa -> Sea to Asia')" },
            estimated_days: { type: Type.NUMBER, description: "Total transit time in days" },
            cost_usd: { type: Type.NUMBER, description: "Estimated cost in USD" },
            carbon_kg: { type: Type.NUMBER, description: "Estimated carbon footprint in KG" },
            // 🌟 NEW: Force the AI to plot the coordinates!
            waypoints: {
                type: Type.ARRAY,
                description: "List of 4 to 6 rough [lat, lng] coordinates tracing the route geographically.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER }
                    },
                    required: ["lat", "lng"]
                }
            }
        },
        required: ["route_id", "path_description", "estimated_days", "cost_usd", "carbon_kg", "waypoints"]
    }
};

export async function generateRoutes(worldState, previousFeedback = null) {
    let prompt = `You are the CHRONOS Chief Planner. A disruption occurred: ${JSON.stringify(worldState)}.
    You MUST consider known_reports from the database as hard constraints when generating routes, and avoid all reported hotspots.
    Generate 3 alternative routes.`;
    
    if (previousFeedback) {
        prompt += `\n\nCRITICAL FEEDBACK ON PREVIOUS ATTEMPT: The critic rejected your last plan for these reasons: ${JSON.stringify(previousFeedback)}. Fix these fatal flaws in your new routes.`;
    }

    try {
        const response = await ai.models.generateContent({
            // We use Pro here because routing requires complex logistical reasoning
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: plannerSchema,
                temperature: 0.2 
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("[PLANNER] Failed to generate routes:", error);
        throw error;
    }
}