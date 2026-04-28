import express from 'express';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { db, FieldValue } from './config/firebase.js'; 
import { runReflexionLoop, initializeRoutePlanningForShipment } from './services/orchestrator.service.js';
import cors from 'cors';
import { calculatePriority } from './services/priority.service.js';
import { getCoordinates } from './services/geocoder.service.js';
import { createDisturbance, cleanExpiredDisturbances, scanActiveDisturbancesForRoutes } from './services/disturbance.service.js';
import { scanShipmentForThreats } from './services/watchman.service.js';
import { storeGeminiApiKey } from './services/ai.service.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/config/gemini-key', async (req, res) => {
    const { apiKey } = req.body;

    try {
        await storeGeminiApiKey(apiKey);
        res.status(200).json({ success: true, message: 'Gemini API key updated successfully.' });
    } catch (error) {
        console.error('[CONFIG] Failed to update Gemini key:', error);
        res.status(400).json({ error: error.message || 'Failed to update Gemini key.' });
    }
});

// ==========================================
// 1. PHASE 2: REAL-TIME FIRESTORE LISTENER
// ==========================================
console.log('[SYSTEM] Starting Firestore Watchman Listener...');
db.collection('world_state')
  .where('isActive', '==', true)
  .where('status', '==', 'NEW') // ✅ FIXED
  .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
              const stateData = change.doc.data();
              const docId = change.doc.id;

              if (stateData.disruption_level > 0.7) {
                  console.log(`\n🚨 [ALERT] Major disruption detected at ${stateData.location}! Waking up AI Agents...`);
                  
                  // Mark as processing so we don't trigger it twice
                  await db.collection('world_state').doc(docId).update({ status: 'PROCESSING' });
                  
                  // Kick off the AI debate!
                  runReflexionLoop(stateData, docId, {
                      disturbance: {
                          location: stateData.location,
                          reason: stateData.reason || stateData.headline || 'Disruption detected',
                          source: stateData.source || 'WORLD_STATE',
                          severity: stateData.disruption_level
                      }
                  }).catch(console.error);
              }
          }
      });
  }, (error) => {
      console.error("[ERROR] Firestore listener failed:", error);
  });

// ==========================================
// 2. PHASE 1: DEMO TRIGGER ENDPOINT
// ==========================================
app.post('/api/demo/trigger', async (req, res) => {
    console.log('\n[SYSTEM] Demo override triggered: Injecting Rotterdam Strike.');
    try {
        const filePath = path.join(__dirname, 'data', 'rotterdam_strike.json');
        const demoData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // 🌟 NEW: Calculate Priority before saving
        const impactAnalysis = await calculatePriority(demoData);

        const statePayload = {
            ...demoData,
            ...impactAnalysis, // Adds priority_score and priority_reason
            createdAt: FieldValue.serverTimestamp(),
            isActive: true,
            status: "NEW" 
        };

        const docRef = await db.collection('world_state').add(statePayload);
        res.status(200).json({ message: "Demo state injected successfully", documentId: docRef.id });
    } catch (error) {
        res.status(500).json({ error: "Failed to trigger demo state" });
    }
});

// 3. THE PUBLIC INGESTION ENDPOINT (Mobile Form)
app.post('/api/report', async (req, res) => {
    const { location, reason, disruption_level, duration_hours } = req.body;
    console.log(`\n📱 [PUBLIC SENTINEL] Disruption report received: ${location}`);
    
    try {
        if (!location || !reason) {
            return res.status(400).json({ error: "location and reason are required" });
        }

        const normalizedSeverity = Math.min(1, Math.max(0.1, parseFloat(disruption_level) || 0.5));
        const normalizedDuration = Math.min(168, Math.max(1, parseFloat(duration_hours) || 24));

        await createDisturbance({
            location,
            reason,
            severity: normalizedSeverity,
            duration_hours: normalizedDuration,
            source: 'PUBLIC_SENTINEL',
            triggerReroute: false
        });
        res.status(200).json({ success: true, message: "Disruption report saved. CHRONOS will include it in the next monitoring sweep." });
    } catch (error) {
        console.error("[PUBLIC SENTINEL] Report ingestion failed:", error);
        res.status(500).json({ error: "Execution failed" });
    }
});

// Sweep stored disturbances every 5 minutes and reroute only if a report actually intersects an active route.
cron.schedule('*/5 * * * *', async () => {
    console.log('\n🔎 [DISTURBANCE SWEEP] Checking stored disturbances against active routes...');
    try {
        const scanned = await scanActiveDisturbancesForRoutes();
        console.log(`✅ [DISTURBANCE SWEEP] Reviewed ${scanned} active disturbances.`);
    } catch (error) {
        console.error('[DISTURBANCE SWEEP] Failed:', error);
    }
});

// ==========================================
// 5. USER SHIPMENT INGESTION
// ==========================================
app.post('/api/shipment', async (req, res) => {
    // Destructure the perfectly formatted fields from the React form
    const { origin, destination, stops, cargo, priority, notes } = req.body;
    console.log(`\n📦 [LOGISTICS] New structured shipment: ${origin} to ${destination}`);

    try {
        const stopsArray = stops ? stops.split(',').map(s => s.trim()).filter(s => s) : [];
        const allRoutePoints = [origin, ...stopsArray, destination];

        // 1. Geocode every route node so the original path can render on the globe
        const pointCoordinates = await Promise.all(
            allRoutePoints.map(async (place) => {
                const coord = await getCoordinates(place);
                return {
                    lat: coord?.lat || 0,
                    lng: coord?.lng || 0,
                    label: place
                };
            })
        );

        const tracking_id = crypto.randomUUID().slice(0, 6).toUpperCase();
        const payload = {
            tracking_id,
            origin,
            destination,
            stops: stopsArray,
            cargo,
            priority,
            notes,
            lat: pointCoordinates[0]?.lat || 0,
            lng: pointCoordinates[0]?.lng || 0,
            original_route: pointCoordinates,
            type: 'USER_SHIPMENT',
            status: 'SAFE',
            isActive: true,
            createdAt: FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('world_state').add(payload);
        initializeRoutePlanningForShipment(docRef.id).catch((error) => {
            console.error('[ROUTER] Initial route planning failed:', error);
        });

        res.status(200).json({ success: true, id: docRef.id, tracking_id });
    } catch (error) {
        console.error("[ERROR] Failed to create shipment:", error);
        res.status(500).json({ error: "Failed to create shipment" });
    }
});

// ==========================================
// 5.5. ROUTE DELETE ENDPOINT
// ==========================================
app.post('/api/route/delete', async (req, res) => {
    const { worldStateId } = req.body;
    console.log(`\n🗑️ [ROUTE] Delete requested for ${worldStateId}`);

    try {
        await db.collection('world_state').doc(worldStateId).update({
            isActive: false,
            status: 'DELETED',
            deletedAt: FieldValue.serverTimestamp()
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[ERROR] Failed to delete route:', error);
        res.status(500).json({ error: 'Route deletion failed' });
    }
});

// ==========================================
// 6. THE AUTONOMOUS HEARTBEAT (Cron Jobs)
// ==========================================
// Runs every 2 minutes to scan the web for active shipments
cron.schedule('*/2 * * * *', async () => {
    console.log('\n⏱️ [HEARTBEAT] Waking up Watchman to scan active shipments...');
    
    try {
        const snapshot = await db.collection('world_state')
            .where('type', '==', 'USER_SHIPMENT')
            .where('isActive', '==', true)
            .get();

        if (snapshot.empty) {
            console.log('💤 No active shipments to monitor.');
            return;
        }

        snapshot.forEach(doc => {
            scanShipmentForThreats(doc.data(), doc.id);
        });
    } catch (error) {
        console.error("[HEARTBEAT] Failed:", error);
    }
});

// Every 10 minutes, expire disturbances so they are no longer considered by rerouting logic.
cron.schedule('*/10 * * * *', async () => {
    console.log('\n🧹 [HOUSEKEEPING] Expiring old disturbances from database...');
    try {
        const count = await cleanExpiredDisturbances();
        console.log(`✅ [HOUSEKEEPING] Removed ${count} expired disturbances.`);
    } catch (error) {
        console.error("[HOUSEKEEPING] Failed:", error);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 CHRONOS Backend running on http://localhost:${PORT}`);
});