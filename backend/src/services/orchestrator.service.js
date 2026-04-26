import { generateRoutes } from './planner.service.js';
import { evaluateRoutes } from './critic.service.js';
import { db, FieldValue } from '../config/firebase.js';

const MAX_ITERATIONS = 3;
const PASSING_SCORE = 0.85;

export async function runReflexionLoop(worldState, worldStateId) {
    console.log(`\n🧠 [ORCHESTRATOR] Starting Reflexion Loop for Disruption: ${worldState.location}`);
    
    let iteration = 1;
    let feedback = null;
    let bestPlan = null;
    let highestScore = 0;

    while (iteration <= MAX_ITERATIONS) {
        console.log(`\n--- ITERATION ${iteration} ---`);
        
        // 1. Planner Generates Routes
        console.log(`[PLANNER] Drafting routes... (Feedback applied: ${feedback ? 'YES' : 'NO'})`);
        const routes = await generateRoutes(worldState, feedback);
        
        // 2. Critic Evaluates Routes
        console.log(`[CRITIC] Auditing the ${routes.length} proposed routes...`);
        const evaluations = await evaluateRoutes(routes, worldState);

        // 3. Log this debate step to Firestore (for the UI HUD later)
        await db.collection('agent_logs').add({
            worldStateId,
            iteration,
            routes,
            evaluations,
            timestamp: FieldValue.serverTimestamp()
        });

        // 4. Find the best route in this batch
        let currentBestEval = evaluations.reduce((prev, current) => 
            (prev.composite_score > current.composite_score) ? prev : current
        );
        
        console.log(`[CRITIC] Highest score this round: ${currentBestEval.composite_score} (Route: ${currentBestEval.route_id})`);

        // Update all-time best plan just in case we hit the max iterations
        if (currentBestEval.composite_score > highestScore) {
            highestScore = currentBestEval.composite_score;
            bestPlan = {
                route: routes.find(r => r.route_id === currentBestEval.route_id),
                evaluation: currentBestEval
            };
        }

        // 5. Check if it's good enough
        if (currentBestEval.composite_score >= PASSING_SCORE) {
            console.log(`✅ [ORCHESTRATOR] Validated plan found! Score: ${currentBestEval.composite_score}`);
            break; 
        } else {
            console.log(`❌ [ORCHESTRATOR] Plan rejected. Generating feedback for Planner...`);
            feedback = currentBestEval.fatal_flaws;
            iteration++;
        }
    }

    // 6. Loop finished. Save the final validated plan to the original event.
    console.log(`\n💾 [ORCHESTRATOR] Saving final validated plan to database...`);
    await db.collection('world_state').doc(worldStateId).update({
        validated_plan: bestPlan,
        status: "PLAN_READY",
        updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`🚀 [ORCHESTRATOR] Reflexion Loop Complete!`);
}