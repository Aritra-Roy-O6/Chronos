import { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Hardcoded coordinates for our demo ports to save API calls
const PORT_COORDS = {
  "Port of Rotterdam, Netherlands": { lat: 51.9225, lng: 4.4792 },
  "Singapore": { lat: 1.290270, lng: 103.851959 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 }
};

export default function GlobeView({ onStateChange }) {
  const globeEl = useRef();
  const [disruptions, setDisruptions] = useState([]);
  const [arcs, setArcs] = useState([]);

  useEffect(() => {
    // Listen to Firebase for active global disruptions
    const q = query(collection(db, 'world_state'), where('isActive', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeDisruptions = [];
      const activeArcs = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const coords = PORT_COORDS[data.location] || PORT_COORDS["Port of Rotterdam, Netherlands"];
        
        // 1. Plot the Disruption Point
        activeDisruptions.push({
          id: doc.id,
          lat: coords.lat,
          lng: coords.lng,
          size: data.disruption_level * 2, // Size based on severity
          color: data.disruption_level > 0.8 ? '#ef4444' : '#f59e0b', // Red if critical, orange if medium
          label: data.location,
          data: data
        });

        // Pass the latest state up to the main App
        onStateChange({ id: doc.id, ...data });

        // 2. Plot the AI's Validated Route (if Phase 2 is finished)
        if (data.validated_plan) {
            // For the visual demo, we'll draw a generic arc away from the disruption
            activeArcs.push({
                startLat: coords.lat,
                startLng: coords.lng,
                endLat: 40.7128, // e.g., to New York
                endLng: -74.0060,
                color: ['#10b981', '#3b82f6'], // Green to Blue gradient
                name: data.validated_plan.route.route_id
            });
        }
      });

      setDisruptions(activeDisruptions);
      setArcs(activeArcs);

      // Point the camera at the newest disruption
      if (activeDisruptions.length > 0 && globeEl.current) {
        globeEl.current.pointOfView({ 
            lat: activeDisruptions[0].lat, 
            lng: activeDisruptions[0].lng, 
            altitude: 1.5 
        }, 2000); // 2-second smooth fly-over animation
      }
    });

    return () => unsubscribe();
  }, [onStateChange]);

  return (
    <div className="absolute inset-0 cursor-move">
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="#0a0a0a"
        
        // 🌟 NEW: Beautiful Pulsing HTML Markers
        htmlElementsData={disruptions}
        htmlLat="lat"
        htmlLng="lng"
        htmlElement={(d) => {
          const el = document.createElement('div');
          // We use inline styles for dynamic colors and pure CSS for the pulse
          el.innerHTML = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; pointer-events: none;">
              <div style="position: absolute; width: 32px; height: 32px; background-color: ${d.color}; border-radius: 50%; opacity: 0.5; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              
              <div style="position: relative; width: 12px; height: 12px; background-color: ${d.color}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px ${d.color};"></div>
              
              <div style="position: absolute; top: 20px; padding: 4px 8px; background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.2); color: white; font-size: 10px; font-family: monospace; border-radius: 4px; white-space: nowrap; backdrop-filter: blur(4px);">
                ${d.label}
              </div>
            </div>
          `;
          return el;
        }}
        
        // Render Routes
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
      arcDashAnimateTime={1500}
    />
  </div>
  );
}