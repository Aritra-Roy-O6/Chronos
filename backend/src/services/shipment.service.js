import { Type } from '@google/genai';
import { getAI } from './ai.service.js';

// AI Schema for Shipment Ingestion
const shipmentSchema = {
    type: Type.OBJECT,
    properties: {
        origin: { type: Type.STRING },
        destination: { type: Type.STRING },
        stops: { type: Type.ARRAY, items: { type: Type.STRING } },
        cargo: { type: Type.STRING },
        priority: { type: Type.NUMBER }
    },
    required: ["origin", "destination", "stops", "cargo"]
};

// This function takes the raw form data and "structures" it
export async function structureShipment(rawInput) {
    console.log(`🧠 [SHIPMENT AI] Structuring raw user input...`);
    
    const ai = await getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Convert this shipment request into structured JSON. Extract origin, destination, any mentioned stops, cargo description, and estimate priority (1-10). If no stops mentioned, return an empty array. Input: ${rawInput}`,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: shipmentSchema,
            temperature: 0.1 
        }
    });
    
    return JSON.parse(response.text);
}