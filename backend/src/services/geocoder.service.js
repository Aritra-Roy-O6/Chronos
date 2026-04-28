// src/services/geocoder.service.js
export async function getCoordinates(locationName) {
    console.log(`🌍 [GEOCODER] Fetching real-world coordinates for: ${locationName}`);
    try {
        // We use OpenStreetMap's free Nominatim API. 
        // Note: It requires a User-Agent header to work.
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'ChronosSupplyChainApp/1.0' }
        });
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            console.log(`✅ [GEOCODER] Found: ${data[0].lat}, ${data[0].lon}`);
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } else {
            console.warn(`⚠️ [GEOCODER] Could not find ${locationName}. Falling back to 0,0.`);
            return null;
        }
    } catch (error) {
        console.error("[GEOCODER] API Error:", error);
        return null;
    }
}