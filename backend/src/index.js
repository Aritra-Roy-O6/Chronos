import express from 'express';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, FieldValue } from './config/firebase.js'; 
import { runReflexionLoop } from './services/orchestrator.service.js';
import { executePlan } from './services/executor.service.js';
import cors from 'cors';

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
        
        const statePayload = {
            ...demoData,
            createdAt: FieldValue.serverTimestamp(),
            isActive: true,
            status: "NEW" // Explicitly mark as NEW for the listener
        };

        const docRef = await db.collection('world_state').add(statePayload);
        res.status(200).json({ message: "Demo state injected successfully", documentId: docRef.id });
    } catch (error) {
        res.status(500).json({ error: "Failed to trigger demo state" });
    }
});

app.post('/api/plan/approve', async (req, res) => {
    const { worldStateId } = req.body;
    console.log(`\n👨‍💼 [HUMAN] Plan for ${worldStateId} approved. Triggering Executor...`);
    
    try {
        const doc = await db.collection('world_state').doc(worldStateId).get();
        const planData = doc.data().validated_plan;

        await executePlan(planData, worldStateId);

        res.status(200).json({ message: "Plan executed successfully" });
    } catch (error) {
        res.status(500).json({ error: "Execution failed" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 CHRONOS Backend running on http://localhost:${PORT}`);
});