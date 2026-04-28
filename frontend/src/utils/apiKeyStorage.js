export const GEMINI_API_KEY_STORAGE = 'chronos_gemini_api_key';

export function getStoredGeminiApiKey() {
  return window.localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
}

export function setStoredGeminiApiKey(value) {
  window.localStorage.setItem(GEMINI_API_KEY_STORAGE, value);
}

export function hasStoredGeminiApiKey() {
  return Boolean(getStoredGeminiApiKey().trim());
}
