import { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const PORT_COORDS = {
  "Port of Rotterdam, Netherlands": { lat: 51.9225, lng: 4.4792 },
  "Singapore": { lat: 1.290270, lng: 103.851959 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 }
};

export default function GlobeView({ onStateChange, historicalFocus }) {
  const globeEl = useRef();
  const [disruptions, setDisruptions] = useState([]);
  const [paths, setPaths] = useState([]);

  // 1. Listen for Live Active Events
  useEffect(() => {
    const q = query(collection(db, 'world_state'), where('isActive', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeDisruptions = [];
      const activeArcs = [];
      let latestDoc = null;
      let latestTime = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const coords = PORT_COORDS[data.location] || { lat: 0, lng: 0 };
        
        const disruptionData = {
          id: doc.id,
          lat: coords.lat,
          lng: coords.lng,
          color: data.disruption_level > 0.8 ? '#ef4444' : '#f59e0b', 
          label: data.location,
          isHistorical: false,
          ...data
        };

        activeDisruptions.push(disruptionData);

        const docTime = data.createdAt?.toMillis() || Date.now();
        if (docTime >= latestTime) {
            latestTime = docTime;
            latestDoc = disruptionData;
        }

        // 🌟 NEW: Convert AI waypoints into connected 3D arcs
        if (data.validated_plan && data.validated_plan.route.waypoints && data.validated_plan.route.waypoints.length > 1) {
            const wps = data.validated_plan.route.waypoints;
            for (let i = 0; i < wps.length - 1; i++) {
                // Check if the AI actually returned valid numbers
                if (wps[i].lat != null && wps[i+1].lat != null) {
                    activeArcs.push({
                        startLat: wps[i].lat,
                        startLng: wps[i].lng,
                        endLat: wps[i+1].lat,
                        endLng: wps[i+1].lng,
                        color: ['#10b981', '#3b82f6'], // Glowing Green to Blue
                        name: `${data.validated_plan.route.route_id}-seg-${i}`
                    });
                }
            }
        }
      });

      setDisruptions(activeDisruptions);
      setPaths(activeArcs); // We store arcs in the paths state variable
      onStateChange(latestDoc ? latestDoc : null);

      if (latestDoc && globeEl.current && !historicalFocus) {
        globeEl.current.pointOfView({ lat: latestDoc.lat, lng: latestDoc.lng, altitude: 1.5 }, 2000); 
      }
    });

    return () => unsubscribe();
  }, [onStateChange, historicalFocus]);

  // 2. Listen for History Clicks
  const [historyPoint, setHistoryPoint] = useState(null);
  const [historyArcs, setHistoryArcs] = useState([]);
  
  useEffect(() => {
    if (historicalFocus && globeEl.current) {
        const coords = PORT_COORDS[historicalFocus.location] || { lat: 0, lng: 0 };
        
        setHistoryPoint({
            id: 'history-' + historicalFocus.id,
            lat: coords.lat,
            lng: coords.lng,
            color: '#9ca3af', 
            label: `[RESOLVED] ${historicalFocus.location}`,
            isHistorical: true
        });

        // 🌟 NEW: Draw Historical waypoints as Gray Arcs
        const hArcs = [];
        if (historicalFocus.validated_plan && historicalFocus.validated_plan.route.waypoints && historicalFocus.validated_plan.route.waypoints.length > 1) {
             const wps = historicalFocus.validated_plan.route.waypoints;
             for (let i = 0; i < wps.length - 1; i++) {
                 if (wps[i].lat != null && wps[i+1].lat != null) {
                    hArcs.push({
                        startLat: wps[i].lat,
                        startLng: wps[i].lng,
                        endLat: wps[i+1].lat,
                        endLng: wps[i+1].lng,
                        color: ['#6b7280', '#4b5563'], // Gray fade
                        name: `hist-seg-${i}`
                    });
                 }
             }
        }
        setHistoryArcs(hArcs);

        globeEl.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.5 }, 1500);
    } else {
        setHistoryPoint(null);
        setHistoryArcs([]);
    }
  }, [historicalFocus]);

  const allPoints = historyPoint ? [...disruptions, historyPoint] : disruptions;
  const allRenderedArcs = historicalFocus ? historyArcs : paths;

  return (
    <div className="absolute inset-0 cursor-move">
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="#0a0a0a"
        
        // Render Points
        htmlElementsData={allPoints}
        htmlLat="lat"
        htmlLng="lng"
        htmlElement={(d) => {
          const el = document.createElement('div');
          const pulseCss = d.isHistorical ? '' : 'animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;';
          
          el.innerHTML = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; pointer-events: none;">
              <div style="position: absolute; width: 32px; height: 32px; background-color: ${d.color}; border-radius: 50%; opacity: 0.5; ${pulseCss}"></div>
              <div style="position: relative; width: 12px; height: 12px; background-color: ${d.color}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px ${d.color};"></div>
              <div style="position: absolute; top: 20px; padding: 4px 8px; background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.2); color: white; font-size: 10px; font-family: monospace; border-radius: 4px; white-space: nowrap;">
                ${d.label}
              </div>
            </div>
          `;
          return el;
        }}

        // 🌟 NEW: Render Accurate AI Paths as Arcs
        arcsData={allRenderedArcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcStroke={1}
      />
    </div>
  );
}