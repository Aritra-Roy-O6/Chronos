import { db, FieldValue } from '../config/firebase.js';

// MOCK TOOL: Sends an alert to the carrier
export async function sendCarrierAlert(routeId, location) {
    console.log(`📡 [TOOL] Sending urgent carrier alert for ${routeId}...`);
    // In a real app, this would be a SendGrid or Twilio API call
    return { status: "SENT", timestamp: new Date().toISOString() };
}

// MOCK TOOL: Drafts a legal contract
export async function draftContract(routeData) {
    console.log(`📝 [TOOL] Drafting contract amendment for ${routeData.route_id}...`);
    return `CONTRACT AMENDMENT: Reroute via ${routeData.path_description}. Extra Cost: ${routeData.cost_usd}.`;
}

export async function executePlan(planData, worldStateId) {
    console.log(`⚡ [EXECUTOR] Executing validated plan for ${worldStateId}...`);
    
    // Trigger the tools
    const alert = await sendCarrierAlert(planData.route.route_id, planData.route.path_description);
    const contract = await draftContract(planData.route);

    // Update Firestore to show actions are complete
    await db.collection('world_state').doc(worldStateId).update({
        execution_status: 'EXECUTED',
        isActive: false,
        contract_draft: contract,
        alert_sent: true,
        executedAt: FieldValue.serverTimestamp()
    });

    console.log(`✅ [EXECUTOR] Actions complete. Carrier alerted and Contract drafted.`);
}