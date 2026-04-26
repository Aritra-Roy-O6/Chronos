import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the new Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Define the strict schema for the World State
const worldStateSchema = {
    type: Type.OBJECT,
    properties: {
        location: {
            type: Type.STRING,
            description: "The specific port, canal, or city affected."
        },
        disruption_level: {
            type: Type.NUMBER,
            description: "Float between 0.0 and 1.0 indicating severity."
        },
        reason: {
            type: Type.STRING,
            description: "A one-sentence summary of the disruption."
        },
        affected_routes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Major shipping lanes impacted."
        }
    },
    required: ["location", "disruption_level", "reason", "affected_routes"]
};

export async function analyzeWorldState(rawDataString) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are CHRONOS Watchman. Analyze this data and extract logistics disruptions: ${rawDataString}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: worldStateSchema,
                temperature: 0.1 // Keep it analytical and deterministic
            }
        });

        // The SDK automatically validates against the schema, so we can safely parse
        const structuredData = JSON.parse(response.text);
        return structuredData;

    } catch (error) {
        console.error("Watchman Agent failed to process data:", error);
        throw error;
    }
}