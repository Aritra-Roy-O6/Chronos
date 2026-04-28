import { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function GlobeView({ onStateChange, historicalFocus }) {
  const globeEl = useRef();
  const [disruptions, setDisruptions] = useState([]);
  const [paths, setPaths] = useState([]);

  // 1. Listen for Live Active Events
  useEffect(() => {
    const q = query(collection(db, 'world_state'), where('isActive', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activeEvents = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        activeEvents.push({ id: doc.id, ...data });
      });

      // 🌟 THE FIX: Sort by Priority (Highest first), then by Date (Oldest first)
      activeEvents.sort((a, b) => {
          if (b.priority_score !== a.priority_score) {
              return (b.priority_score || 0) - (a.priority_score || 0);
          }
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeA - timeB;
      });

      const urgentDoc = activeEvents.length > 0 ? activeEvents[0] : null;

      if (urgentDoc) {
          const locationLabel = urgentDoc.location || (urgentDoc.origin && urgentDoc.destination ? `${urgentDoc.origin} → ${urgentDoc.destination}` : 'Active Event');
          const isThreat = urgentDoc.disruption_level != null && urgentDoc.disruption_level > 0.6;
          const disruptionColor = urgentDoc.status === 'SAFE'
              ? '#10b981'
              : urgentDoc.status === 'PLAN_READY'
              ? '#3b82f6'
              : isThreat
              ? '#f59e0b'
              : '#ef4444';

          const disruptionData = {
              ...urgentDoc,
              lat: urgentDoc.lat || 0,
              lng: urgentDoc.lng || 0,
              color: disruptionColor,
              label: locationLabel,
              isHistorical: false
          };
          
          setDisruptions([disruptionData]);
          onStateChange(disruptionData);

          const activeArcs = [];
          if (urgentDoc.validated_plan && urgentDoc.validated_plan.route.waypoints) {
              const wps = urgentDoc.validated_plan.route.waypoints;
              for (let i = 0; i < wps.length - 1; i++) {
                  if (wps[i].lat != null && wps[i+1].lat != null) {
                      activeArcs.push({
                          startLat: wps[i].lat,
                          startLng: wps[i].lng,
                          endLat: wps[i+1].lat,
                          endLng: wps[i+1].lng,
                          color: ['#facc15', '#fde047'],
                          name: `seg-${i}`
                      });
                  }
              }
          }
          setPaths(activeArcs);

          if (globeEl.current && !historicalFocus) {
              globeEl.current.pointOfView({ lat: disruptionData.lat, lng: disruptionData.lng, altitude: 1.5 }, 2000);
          }
      } else {
          setDisruptions([]);
          setPaths([]);
          onStateChange(null);
      }
    });

    return () => unsubscribe();
  }, [onStateChange, historicalFocus]);

  // 2. Listen for History Clicks
  const [historyPoint, setHistoryPoint] = useState(null);
  const [historyArcs, setHistoryArcs] = useState([]);
  
  useEffect(() => {
    if (historicalFocus && globeEl.current) {
        const coords = { lat: historicalFocus.lat || 0, lng: historicalFocus.lng || 0 };
        
        setHistoryPoint({
            id: 'history-' + historicalFocus.id,
            lat: coords.lat,
            lng: coords.lng,
            color: '#3b82f6',
            label: `[SELECTED ROUTE] ${historicalFocus.origin || historicalFocus.location}`,
            isHistorical: true
        });

        // Render only the selected route path (no original/past path overlays)
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
                        color: ['#facc15', '#fde047'],
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

  const allPoints = historicalFocus ? (historyPoint ? [historyPoint] : []) : disruptions;
  const allRenderedArcs = historicalFocus ? historyArcs : paths;

  return (
    <div className="absolute inset-0 cursor-move">
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="#020914"
        atmosphereColor="#1e4d62"
        atmosphereAltitude={0.12}
        
        // Render Points
        htmlElementsData={allPoints}
        htmlLat="lat"
        htmlLng="lng"
        htmlElement={(d) => {
          const el = document.createElement('div');
          const pulseCss = d.isHistorical || d.isCity ? '' : 'animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;';
          const ringSize = d.isCity ? 18 : 32;
          const dotSize = d.isCity ? 8 : 12;
          const label = d.isCity ? d.label : d.label;
          const labelOpacity = d.isCity ? '0.65' : '1';
          
          el.innerHTML = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; pointer-events: none;">
              <div style="position: absolute; width: ${ringSize}px; height: ${ringSize}px; background-color: ${d.color}; border-radius: 50%; opacity: 0.35; ${pulseCss}"></div>
              <div style="position: relative; width: ${dotSize}px; height: ${dotSize}px; background-color: ${d.color}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px ${d.color};"></div>
              <div style="position: absolute; top: 22px; padding: 3px 6px; background: rgba(2, 15, 26, 0.85); border: 1px solid rgba(255,255,255,0.12); color: white; font-size: ${d.isCity ? 9 : 10}px; font-family: monospace; border-radius: 4px; white-space: nowrap; opacity: ${labelOpacity};">
                ${label}
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