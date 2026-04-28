import { db, FieldValue } from '../config/firebase.js';
import { getCoordinates } from './geocoder.service.js';
import { runReflexionLoop } from './orchestrator.service.js';

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function haversineDistanceKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(b.lat - a.lat);
  const dLng = degreesToRadians(b.lng - a.lng);
  const lat1 = degreesToRadians(a.lat);
  const lat2 = degreesToRadians(b.lat);

  const sinLat = Math.sin(dLat / 2) ** 2;
  const sinLng = Math.sin(dLng / 2) ** 2;
  const cosLat1 = Math.cos(lat1);
  const cosLat2 = Math.cos(lat2);

  return earthRadiusKm * 2 * Math.asin(Math.sqrt(sinLat + cosLat1 * cosLat2 * sinLng));
}

function routeMatchesText(originalRoute, location) {
  if (!location || !originalRoute?.length) return false;
  const normalizedLocation = location.toLowerCase();
  return originalRoute.some((point) => point.label?.toLowerCase().includes(normalizedLocation));
}

function routeWithinDistance(originalRoute, disturbanceCoords, thresholdKm = 750) {
  if (!disturbanceCoords || !originalRoute?.length) return false;
  return originalRoute.some((point) => {
    if (point.lat == null || point.lng == null) return false;
    return haversineDistanceKm(point, disturbanceCoords) <= thresholdKm;
  });
}

function disturbanceAlreadyProcessed(route, disturbanceId) {
  const processed = route.processed_disturbance_ids || [];
  return processed.includes(disturbanceId);
}

export async function createDisturbance({ location, reason, severity, duration_hours = 24, source = 'PUBLIC', triggerReroute = true }) {
  const coords = await getCoordinates(location) || { lat: 0, lng: 0 };
  const now = new Date();
  const expiresAt = new Date(now.getTime() + duration_hours * 60 * 60 * 1000);

  console.log(`📍 [DISTURBANCE] Creating ${severity > 0.6 ? 'HIGH' : 'MEDIUM'} severity disturbance at ${location} (source: ${source}, expires in ${duration_hours}h)`);

  const disturbance = {
    location,
    reason,
    severity,
    duration_hours,
    source,
    coords,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    active: true
  };

  const docRef = await db.collection('disturbances').add(disturbance);
  const savedDisturbance = { id: docRef.id, ...disturbance, expiresAt };

  if (triggerReroute) {
    await rerouteAffectedRoutes(savedDisturbance);
  }
  return savedDisturbance;
}

export async function cleanExpiredDisturbances() {
  const now = new Date();
  const snapshot = await db.collection('disturbances')
    .where('expiresAt', '<=', now)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  let expiredCount = 0;
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.active) {
      expiredCount += 1;
      batch.update(doc.ref, { active: false, expiredAt: FieldValue.serverTimestamp() });
    }
  });

  if (expiredCount > 0) {
    await batch.commit();
  }
  return expiredCount;
}

export async function getActiveDisturbances(limit = 25) {
  const snapshot = await db.collection('disturbances')
    .where('active', '==', true)
    .get();

  if (snapshot.empty) return [];

  const active = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  active.sort((a, b) => {
    const severityDelta = (b.severity || 0) - (a.severity || 0);
    if (severityDelta !== 0) return severityDelta;
    const timeA = a.createdAt?.toMillis?.() || 0;
    const timeB = b.createdAt?.toMillis?.() || 0;
    return timeB - timeA;
  });
  return active.slice(0, limit);
}

export function routeAffectedByDisturbance(route, disturbance) {
  if (!route || !disturbance) return false;
  const originalRoute = route.original_route || [];
  const locationMatch = routeMatchesText(originalRoute, disturbance.location);
  const distanceMatch = routeWithinDistance(originalRoute, disturbance.coords, 750);
  return locationMatch || distanceMatch;
}

export async function rerouteAffectedRoutes(disturbance) {
  const snapshot = await db.collection('world_state')
    .where('type', '==', 'USER_SHIPMENT')
    .where('isActive', '==', true)
    .get();

  if (snapshot.empty) return;

  for (const doc of snapshot.docs) {
    const routeDoc = { id: doc.id, ...doc.data() };
    if (disturbanceAlreadyProcessed(routeDoc, disturbance.id)) {
      continue;
    }

    if (routeAffectedByDisturbance(routeDoc, disturbance)) {
      console.log(`🔁 [DISTURBANCE] Route ${routeDoc.route_id || routeDoc.id} affected by ${disturbance.location}. Triggering autonomous reroute.`);
      await db.collection('world_state').doc(routeDoc.id).update({
        status: 'PROCESSING',
        lastDisturbanceAt: FieldValue.serverTimestamp(),
        processed_disturbance_ids: FieldValue.arrayUnion(disturbance.id)
      });
      await runReflexionLoop(routeDoc, routeDoc.id, { autoExecute: true, disturbance });
    }
  }
}

export async function scanActiveDisturbancesForRoutes() {
  const activeDisturbances = await getActiveDisturbances(100);
  if (!activeDisturbances.length) {
    return 0;
  }

  for (const disturbance of activeDisturbances) {
    await rerouteAffectedRoutes(disturbance);
  }

  return activeDisturbances.length;
}
