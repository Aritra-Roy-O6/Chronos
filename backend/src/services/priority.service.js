import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const prioritySchema = {
    type: Type.OBJECT,
    properties: {
        priority_score: { type: Type.NUMBER, description: "Integer from 1 to 10. 10 is global catastrophic failure." },
        priority_reason: { type: Type.STRING, description: "One sentence explaining the score based on cargo volume and route criticality." }
    },
    required: ["priority_score", "priority_reason"]
};

export async function calculatePriority(worldState) {
    console.log(`⚖️ [PRIORITY SCORER] Analyzing impact for ${worldState.location}...`);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this supply chain disruption and score its global urgency from 1 to 10: ${JSON.stringify(worldState)}`,
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