import express from 'express';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, FieldValue } from './config/firebase.js'; 
import { runReflexionLoop } from './services/orchestrator.service.js';
import { executePlan } from './services/executor.service.js';
import cors from 'cors';
import { calculatePriority } from './services/priority.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
                  runReflexionLoop(stateData, docId).catch(console.error);
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

// 3. The Approval Endpoint (Now with Human-In-The-Loop Overwrites)
app.post('/api/plan/approve', async (req, res) => {
    const { worldStateId, overwriteData } = req.body;
    console.log(`\n👨‍💼 [HUMAN] Plan for ${worldStateId} approved.`);
    
    try {
        const doc = await db.collection('world_state').doc(worldStateId).get();
        let planData = doc.data().validated_plan;

        // 🌟 NEW: Check if the human changed the AI's math or route
        if (overwriteData && overwriteData.isEdited) {
            console.log(`[SECURITY] Human overwrite detected! Logging audit trail...`);
            
            await db.collection('agent_logs').add({
                worldStateId,
                iteration: 99,
                type: 'HUMAN_OVERWRITE',
                diff: `Human override applied. Reason: ${overwriteData.editReason}`,
                timestamp: FieldValue.serverTimestamp()
            });

            // Apply modifications
            if (overwriteData.estimated_days) planData.route.estimated_days = overwriteData.estimated_days;
            if (overwriteData.route_path) planData.route.path_description = overwriteData.route_path; // ✅ Added Route Editing
        }

        await executePlan(planData, worldStateId);
        res.status(200).json({ message: "Plan executed successfully" });
    } catch (error) {
        res.status(500).json({ error: "Execution failed" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 CHRONOS Backend running on http://localhost:${PORT}`);
});