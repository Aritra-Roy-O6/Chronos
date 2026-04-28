import { Type } from '@google/genai';
import { getAI } from './ai.service.js';

// The strict schema for the Critic's grading rubric
const criticSchema = {
    type: Type.ARRAY,
    description: "Evaluations for the 3 proposed routes.",
    items: {
        type: Type.OBJECT,
        properties: {
            route_id: { type: Type.STRING },
            fatal_flaws: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of logistical, cost, or carbon flaws. Must have at least 1 flaw unless the route is perfect."
            },
            composite_score: { 
                type: Type.NUMBER, 
                description: "Float between 0.0 and 1.0. 1.0 is a perfect, flawless route." 
            }
        },
        required: ["route_id", "fatal_flaws", "composite_score"]
    }
};

export async function evaluateRoutes(proposedRoutes, worldState) {
    const prompt = `You are the CHRONOS Critic. The Planner suggested these routes: ${JSON.stringify(proposedRoutes)} to bypass this disruption: ${JSON.stringify(worldState)}. 
    
    Audit them ruthlessly. Reject any route that crosses or approaches active known_reports from the database.
    Look for unrealistic transit times, exorbitant costs, or massive carbon emissions. Score them from 0.0 to 1.0.`;

    try {
        const ai = await getAI();
        const response = await ai.models.generateContent({
            // We use Flash for rapid auditing
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: criticSchema,
                temperature: 0.1
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("[CRITIC] Failed to evaluate routes:", error);
        throw error;
    }
}