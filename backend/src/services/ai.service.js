import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { db, FieldValue } from '../config/firebase.js';

dotenv.config();

const CONFIG_COLLECTION = 'system_config';
const CONFIG_DOC = 'llm';

export async function getGeminiApiKey() {
  const configDoc = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
  const storedKey = configDoc.exists ? configDoc.data()?.geminiApiKey : null;
  return storedKey || process.env.GEMINI_API_KEY || null;
}

export async function getAI() {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key configured. Add one from the landing page.');
  }
  return new GoogleGenAI({ apiKey });
}

export async function storeGeminiApiKey(apiKey) {
  const trimmed = apiKey?.trim();
  if (!trimmed) {
    throw new Error('Gemini API key is required.');
  }

  await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).set({
    geminiApiKey: trimmed,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}
