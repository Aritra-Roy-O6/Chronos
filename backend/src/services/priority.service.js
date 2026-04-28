import { Type } from '@google/genai';
import { getAI } from './ai.service.js';

const prioritySchema = {
    type: Type.OBJECT,
    properties: {
        priority_score: { type: Type.NUMBER, description: "Integer from 1 to 10." },
        priority_reason: { type: Type.STRING, description: "One sentence explaining the score." },
        // 🌟 NEW: The AI Geocoder
        lat: { type: Type.NUMBER, description: "The exact geographical latitude of the location." },
        lng: { type: Type.NUMBER, description: "The exact geographical longitude of the location." }
    },
    required: ["priority_score", "priority_reason", "lat", "lng"]
};

export async function calculatePriority(worldState) {
    console.log(`⚖️ [PRIORITY SCORER] Analyzing impact & geocoding for ${worldState.location}...`);
    try {
        const ai = await getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this supply chain disruption, score its urgency (1-10), and provide the exact GPS coordinates (lat, lng) for the location: ${JSON.stringify(worldState)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: prioritySchema,
                temperature: 0.1
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("[PRIORITY] Failed to score:", error);
        return { priority_score: 5, priority_reason: "Fallback score due to analysis failure." };
    }
}