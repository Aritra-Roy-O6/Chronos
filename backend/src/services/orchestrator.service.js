import { generateRoutes } from './planner.service.js';
import { evaluateRoutes } from './critic.service.js';
import { db, FieldValue } from '../config/firebase.js';
import { executePlan } from './executor.service.js';
import { getActiveDisturbances } from './disturbance.service.js';

const MAX_ITERATIONS = 3;
const PASSING_SCORE = 0.85;

function toFiniteNumber(value, fallback = Number.MAX_SAFE_INTEGER) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function selectBestRouteFast(routes = []) {
    if (!routes.length) return null;

    let best = routes[0];
    let bestScore = Number.MAX_SAFE_INTEGER;

    for (const route of routes) {
        // Lower weighted score is better (time + carbon + cost).
        const score = (
            toFiniteNumber(route.estimated_days, 999) * 0.45 +
            toFiniteNumber(route.carbon_kg, 999999) * 0.35 +
            toFiniteNumber(route.cost_usd, 999999) * 0.20
        );

        if (score < bestScore) {
            best = route;
            bestScore = score;
        }
    }

    return best;
}

function buildFallbackRoute(worldState) {
    const waypoints = (worldState.original_route || [])
        .filter((point) => point?.lat != null && point?.lng != null)
        .map((point) => ({ lat: point.lat, lng: point.lng }));

    return {
        route_id: 'ROUTE_FALLBACK',
        path_description: worldState.original_route?.length
            ? worldState.original_route.map((point) => point.label).join(' -> ')
            : `${worldState.origin || 'Origin'} -> ${worldState.destination || 'Destination'}`,
        estimated_days: worldState.priority >= 8 ? 3 : 5,
        cost_usd: 5000,
        carbon_kg: 2500,
        waypoints
    };
}

async function logDisturbanceFound(worldStateId, disturbance) {
    if (!disturbance) return;
    await db.collection('agent_logs').add({
        worldStateId,
        type: 'DISTURBANCE_FOUND',
        iteration: 0,
        disturbance: {
            location: disturbance.location || 'Unknown location',
            reason: disturbance.reason || 'Unknown disturbance',
            source: disturbance.source || 'UNKNOWN',
            severity: disturbance.severity ?? null
        },
        timestamp: FieldValue.serverTimestamp()
    });
}

export async function runReflexionLoop(worldState, worldStateId, { autoExecute = false, disturbance = null } = {}) {
    const activeReports = await getActiveDisturbances();
    const planningInput = disturbance
        ? { ...worldState, current_disturbance: disturbance, disruption: disturbance, known_reports: activeReports }
        : { ...worldState, known_reports: activeReports };
    console.log(`\n🧠 [ORCHESTRATOR] Starting Reflexion Loop for: ${worldState.location || `${worldState.origin} → ${worldState.destination}`}${disturbance ? ` with disruption at ${disturbance.location}` : ''}`);
    
    let iteration = 1;
    let feedback = null;
    let bestPlan = null;
    let highestScore = Number.NEGATIVE_INFINITY;

    await logDisturbanceFound(worldStateId, disturbance);

    while (iteration <= MAX_ITERATIONS) {
        console.log(`\n--- ITERATION ${iteration} ---`);
        
        // 1. Planner Generates Routes
        console.log(`[PLANNER] Drafting routes... (Feedback applied: ${feedback ? 'YES' : 'NO'})`);
        const routes = await generateRoutes(planningInput, feedback);
        if (!routes?.length) {
            console.log('[ORCHESTRATOR] Planner returned no routes.');
            break;
        }
        
        // 2. Critic Evaluates Routes
        console.log(`[CRITIC] Auditing the ${routes.length} proposed routes...`);
        const evaluations = await evaluateRoutes(routes, worldState);
        if (!evaluations?.length) {
            const fallbackRoute = routes[0];
            bestPlan = {
                route: fallbackRoute,
                evaluation: {
                    route_id: fallbackRoute.route_id,
                    composite_score: 0.5,
                    fatal_flaws: ['Critic unavailable; selected planner fallback route.']
                }
            };
            break;
        }

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
            const matchedRoute = routes.find(r => r.route_id?.toLowerCase() === currentBestEval.route_id?.toLowerCase()) || routes[0];
            bestPlan = {
                route: matchedRoute,
                evaluation: currentBestEval
            };
        }

        // 5. Check if it's good enough
        if (currentBestEval.composite_score >= PASSING_SCORE) {
            console.log(`✅ [ORCHESTRATOR] Validation threshold reached. Best route prepared.`);
            break;
        }

        if (iteration < MAX_ITERATIONS) {
            console.log(`❌ [ORCHESTRATOR] Plan rejected. Generating feedback for Planner...`);
            feedback = currentBestEval.fatal_flaws;
            iteration++;
            continue;
        }

        console.log(`⚠️ [ORCHESTRATOR] Maximum iterations reached. Storing best available route.`);
        break;
    }

    // 6. Loop finished. Save the final validated plan to the original event.
    console.log(`\n💾 [ORCHESTRATOR] Saving final validated plan to database...`);

    if (!bestPlan) {
        const fallbackRoute = buildFallbackRoute(worldState);
        bestPlan = {
            route: fallbackRoute,
            evaluation: {
                route_id: fallbackRoute.route_id,
                composite_score: 0.2,
                fatal_flaws: ['Fallback route selected because no candidate passed validation.']
            }
        };
    }

    const updatePayload = {
        validated_plan: bestPlan,
        status: "PLAN_READY",
        updatedAt: FieldValue.serverTimestamp()
    };

    await db.collection('world_state').doc(worldStateId).update(updatePayload);

    if (autoExecute && bestPlan) {
        await executePlan(bestPlan, worldStateId);
    }

    console.log(`🚀 [ORCHESTRATOR] Reflexion Loop Complete!`);
}

export async function initializeRoutePlanningForShipment(worldStateId) {
    const doc = await db.collection('world_state').doc(worldStateId).get();
    if (!doc.exists) {
        console.warn(`[ORCHESTRATOR] Shipment ${worldStateId} not found for initial planning.`);
        return;
    }

    const worldState = doc.data();
    const activeReports = await getActiveDisturbances();
    const planningInput = { ...worldState, known_reports: activeReports };

    try {
        // Initial shipment planning is intentionally single-pass for speed.
        const routes = await generateRoutes(planningInput, null);
        const selectedRoute = selectBestRouteFast(routes);

        if (!selectedRoute) {
            const fallbackRoute = buildFallbackRoute(worldState);
            const fallbackPlan = {
                route: fallbackRoute,
                evaluation: {
                    route_id: fallbackRoute.route_id,
                    composite_score: 0.2,
                    fatal_flaws: ['Fallback route selected because planner returned no candidates.']
                }
            };

            await db.collection('world_state').doc(worldStateId).update({
                validated_plan: fallbackPlan,
                status: 'PLAN_READY',
                updatedAt: FieldValue.serverTimestamp()
            });
            await executePlan(fallbackPlan, worldStateId);
            return;
        }

        const initialPlan = {
            route: selectedRoute,
            evaluation: {
                route_id: selectedRoute.route_id,
                composite_score: 0.9,
                fatal_flaws: []
            }
        };

        await db.collection('world_state').doc(worldStateId).update({
            validated_plan: initialPlan,
            status: 'PLAN_READY',
            updatedAt: FieldValue.serverTimestamp()
        });
        await executePlan(initialPlan, worldStateId);
    } catch (error) {
        console.error('[ORCHESTRATOR] Initial single-pass planning failed:', error);
        const fallbackRoute = buildFallbackRoute(worldState);
        const fallbackPlan = {
            route: fallbackRoute,
            evaluation: {
                route_id: fallbackRoute.route_id,
                composite_score: 0.2,
                fatal_flaws: ['Fallback route selected because initial planning failed.']
            }
        };
        await db.collection('world_state').doc(worldStateId).update({
            validated_plan: fallbackPlan,
            status: 'PLAN_READY',
            updatedAt: FieldValue.serverTimestamp()
        });
        await executePlan(fallbackPlan, worldStateId);
    }
}
