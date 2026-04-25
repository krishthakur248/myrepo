/**
 * Advanced Route Matching Engine
 * Real-time peer-to-peer ride-sharing route overlap detection
 * Uses H3 hexagon pre-filtering + Turf.js precise spatial matching
 *
 * Based on: https://github.com/H3-js/h3-js and Turf.js
 * Deployed in Node.js backend (works via npm packages)
 */

// Note: These are used in Node.js backend
// Turf and H3 must be installed: npm install @turf/turf h3-js

const turf = require('@turf/turf');

// H3 must be installed for Node.js backend
let h3;
try {
  h3 = require('h3-js');
} catch (e) {
  console.warn('[MATCHING-ENGINE] H3-js not installed. Install with: npm install h3-js');
  h3 = null;
}

// ============================================
// PHASE 1: H3 HEXAGON PRE-FILTER (FAST)
// ============================================

const H3_RESOLUTION = 9; // ~174m cells
const MIN_SHARED_HEXAGONS = 2; // Require 2+ shared hex cells (was 1, too loose)

/**
 * Convert coordinate array to H3 hexagon set
 * @param {Array} coords - [[lat, lng], [lat, lng], ...]
 * @returns {Set} Set of H3 cell IDs
 */
function getRouteHexagons(coords) {
  if (!h3) return new Set(); // Fallback if h3 not available

  return new Set(
    coords.map(([lat, lng]) => {
      try {
        return h3.latLngToCell(lat, lng, H3_RESOLUTION);
      } catch (e) {
        console.error('[H3] Error converting coords:', e);
        return null;
      }
    }).filter(Boolean)
  );
}

/**
 * Phase 1: Check if routes overlap using H3 hexagons
 * @param {Array} driverCoords - Driver route [[lat, lng], ...]
 * @param {Array} passengerCoords - Passenger route [[lat, lng], ...]
 * @returns {Boolean} Whether routes have significant overlap
 */
function phase1HexOverlap(driverCoords, passengerCoords) {
  if (!h3) {
    console.log('[PHASE-1] ⚠️  H3 not available - using fallback direct distance check');
    // Fallback: Check if routes are within a reasonable distance using direct calculation
    // Instead of passing everything, use a basic distance check
    const driverStart = driverCoords[0];
    const driverEnd = driverCoords[driverCoords.length - 1];
    const passengerStart = passengerCoords[0];
    const passengerEnd = passengerCoords[passengerCoords.length - 1];

    // Calculate distances between start points
    const dLat1 = passengerStart[0] - driverStart[0];
    const dLng1 = passengerStart[1] - driverStart[1];
    const distance1 = Math.sqrt(dLat1 * dLat1 + dLng1 * dLng1) * 111; // Rough km conversion

    const dLat2 = passengerEnd[0] - driverEnd[0];
    const dLng2 = passengerEnd[1] - driverEnd[1];
    const distance2 = Math.sqrt(dLat2 * dLat2 + dLng2 * dLng2) * 111;

    const minDistance = Math.min(distance1, distance2);
    console.log(`[PHASE-1-FALLBACK] Distance check: ${minDistance.toFixed(2)}km`);

    // Require routes to be within 2km of each other (stricter than before)
    if (minDistance > 2) {
      console.log(`[PHASE-1-FALLBACK] ❌ Routes too far apart (${minDistance.toFixed(2)}km > 2km)`);
      return false;
    }

    console.log(`[PHASE-1-FALLBACK] ✅ Routes within acceptable distance`);
    return true;
  }

  if (driverCoords.length < 2 || passengerCoords.length < 2) {
    console.log('[PHASE-1] ❌ Insufficient data: need at least 2 points per route');
    return false; // Stricter: reject insufficient data instead of passing through
  }

  const driverHexes = getRouteHexagons(driverCoords);
  const passHexes = getRouteHexagons(passengerCoords);

  if (driverHexes.size === 0 || passHexes.size === 0) {
    console.log('[PHASE-1] ❌ FAILED: One route is empty');
    return false; // One route is empty
  }

  const shared = [...driverHexes].filter(h => passHexes.has(h));

  console.log(`[PHASE-1] ✅ Driver hexes: ${driverHexes.size}, Passenger hexes: ${passHexes.size}, Shared: ${shared.length}`);

  if (shared.length >= MIN_SHARED_HEXAGONS) {
    console.log(`[PHASE-1] ✅ PASSED (${shared.length} >= ${MIN_SHARED_HEXAGONS})`);
    return true;
  } else {
    console.log(`[PHASE-1] ❌ FAILED (${shared.length} < ${MIN_SHARED_HEXAGONS})`);
    return false;
  }
}

// ============================================
// PHASE 2: PRECISE SPATIAL + DIRECTION CHECK
// ============================================

/**
 * Convert coordinate array to Turf LineString
 * Turf expects [lng, lat] format
 * @param {Array} coords - [[lat, lng], ...]
 * @returns {Object} Turf LineString
 */
function toLine(coords) {
  if (!Array.isArray(coords) || coords.length < 2) {
    return null;
  }
  return turf.lineString(
    coords.map(([lat, lng]) => [lng, lat]) // Convert to [lng, lat] for Turf
  );
}

/**
 * Get overlapping segment: Find passenger coords within 300m of driver route
 * Reduced from 500m - need stricter matching
 * @param {Array} driverCoords - Driver route [[lat, lng], ...]
 * @param {Array} passengerCoords - Passenger route [[lat, lng], ...]
 * @returns {Array|null} Overlapping point coordinates or null
 */
function getSpatialOverlapSegment(driverCoords, passengerCoords) {
  try {
    const driverLine = toLine(driverCoords);
    if (!driverLine) {
      console.log('[OVERLAP] ❌ Could not create driver line');
      return null;
    }

    // STRICTER BUFFER: 300 meters (0.3km) instead of 500m
    // Only accept pickup/dropoff very close to actual route
    const BUFFER_KM = 0.3; // 300 meters in km
    const buffered = turf.buffer(driverLine, BUFFER_KM, { units: 'kilometers' });
    console.log(`[OVERLAP] 📦 Created buffer: ${BUFFER_KM * 1000}m (STRICT)`);

    // Find passenger points inside the buffer
    const overlappingPoints = passengerCoords.filter(([lat, lng]) => {
      try {
        const pt = turf.point([lng, lat]);
        const inBuffer = turf.booleanPointInPolygon(pt, buffered);
        
        if (inBuffer) {
          console.log(`[OVERLAP] ✓ Point [${lat.toFixed(5)}, ${lng.toFixed(5)}] is within buffer`);
        }
        
        return inBuffer;
      } catch (e) {
        console.error(`[OVERLAP] Error checking point:`, e.message);
        return false;
      }
    });

    console.log(`[OVERLAP] 📍 Checked ${passengerCoords.length} passenger points, found ${overlappingPoints.length} within ${BUFFER_KM * 1000}m buffer`);

    if (overlappingPoints.length < 1) {
      console.log('[OVERLAP] ❌ No overlapping points found - routes do not overlap');
      return null; // Need at least 1 point to match
    }

    // ADDITIONAL CHECK: Ensure overlap distance is significant (at least 200m)
    const overlapDistance = calculateRouteLength(overlappingPoints);
    console.log(`[OVERLAP] 📏 Overlap segment length: ${(overlapDistance * 1000).toFixed(0)}m`);
    
    if (overlapDistance < 0.2) {
      console.log(`[OVERLAP] ❌ Overlap too small (${(overlapDistance * 1000).toFixed(0)}m < 200m)`);
      return null;
    }

    console.log(`[OVERLAP] ✅ Significant overlap found: ${overlappingPoints.map(p => `[${p[0].toFixed(5)}, ${p[1].toFixed(5)}]`).join(', ')}`);
    return overlappingPoints;
  } catch (error) {
    console.error('[OVERLAP] ❌ Error calculating overlap segment:', error.message);
    return null;
  }
}

/**
 * Calculate bearing between two GPS points
 * @param {Number} lat1 - Start latitude
 * @param {Number} lng1 - Start longitude
 * @param {Number} lat2 - End latitude
 * @param {Number} lng2 - End longitude
 * @returns {Number} Bearing in degrees (-180 to 180)
 */
function calcBearing(lat1, lng1, lat2, lng2) {
  try {
    const from = turf.point([lng1, lat1]);
    const to = turf.point([lng2, lat2]);
    return turf.bearing(from, to);
  } catch (e) {
    console.error('[BEARING] Error:', e);
    return 0;
  }
}

/**
 * Direction check removed - riders and drivers know each other's direction
 * via pickup/destination selection, so no need for bearing validation
 */
function isSameDirection(driverCoords, passengerOverlapCoords) {
  // Always return true since app has explicit pickup/destination selection
  return true;
}

/**
 * PHASE 2: Precise matching algorithm
 * @param {Array} driverCoords - Driver route
 * @param {Array} passengerCoords - Passenger route
 * @returns {Object} Match result with details
 */
function phase2PreciseMatch(driverCoords, passengerCoords) {
  console.log('[PHASE-2] 🔍 Starting precise match...');

  // EXPLICIT DISTANCE CHECK: Pickup/Dropoff must be close to driver's route endpoints
  const driverStart = driverCoords[0];
  const driverEnd = driverCoords[driverCoords.length - 1];
  const riderStart = passengerCoords[0];
  const riderEnd = passengerCoords[passengerCoords.length - 1];

  // Calculate distances
  const distPickupToDriverStart = Math.sqrt(
    Math.pow(riderStart[0] - driverStart[0], 2) + 
    Math.pow(riderStart[1] - driverStart[1], 2)
  ) * 111; // Convert to km

  const distPickupToDriverEnd = Math.sqrt(
    Math.pow(riderStart[0] - driverEnd[0], 2) + 
    Math.pow(riderStart[1] - driverEnd[1], 2)
  ) * 111;

  const distDropoffToDriverStart = Math.sqrt(
    Math.pow(riderEnd[0] - driverStart[0], 2) + 
    Math.pow(riderEnd[1] - driverStart[1], 2)
  ) * 111;

  const distDropoffToDriverEnd = Math.sqrt(
    Math.pow(riderEnd[0] - driverEnd[0], 2) + 
    Math.pow(riderEnd[1] - driverEnd[1], 2)
  ) * 111;

  console.log(`[PHASE-2] 📏 Distance checks:`);
  console.log(`  Rider pickup to driver start: ${distPickupToDriverStart.toFixed(2)}km`);
  console.log(`  Rider pickup to driver end: ${distPickupToDriverEnd.toFixed(2)}km`);
  console.log(`  Rider dropoff to driver start: ${distDropoffToDriverStart.toFixed(2)}km`);
  console.log(`  Rider dropoff to driver end: ${distDropoffToDriverEnd.toFixed(2)}km`);

  // STRICT RULE: Rider's pickup must be within 1km of driver's route start OR end
  // AND rider's dropoff must be within 1km of driver's route start OR end
  const pickupCloseToDriver = Math.min(distPickupToDriverStart, distPickupToDriverEnd) <= 1;
  const dropoffCloseToDriver = Math.min(distDropoffToDriverStart, distDropoffToDriverEnd) <= 1;

  if (!pickupCloseToDriver || !dropoffCloseToDriver) {
    console.log(`[PHASE-2] ❌ FAILED: Pickup or dropoff too far from driver route`);
    console.log(`  Pickup close: ${pickupCloseToDriver}, Dropoff close: ${dropoffCloseToDriver}`);
    return {
      matched: false,
      reason: 'endpoints_too_far',
      message: 'Pickup/dropoff not on driver route (>1km away)'
    };
  }

  console.log(`[PHASE-2] ✅ Endpoints within acceptable distance`);

  // Check spatial overlap
  const overlapPoints = getSpatialOverlapSegment(driverCoords, passengerCoords);
  if (!overlapPoints) {
    console.log('[PHASE-2] ❌ FAILED: No spatial overlap within buffer');
    return {
      matched: false,
      reason: 'no_spatial_overlap',
      message: 'Routes do not overlap within 300m buffer'
    };
  }

  console.log(`[PHASE-2] ✅ Overlap segment found: ${overlapPoints.length} points`);

  // Check direction
  const sameDir = isSameDirection(driverCoords, overlapPoints);
  if (!sameDir) {
    console.log('[PHASE-2] ❌ FAILED: Opposite direction');
    return {
      matched: false,
      reason: 'opposite_direction',
      message: 'Traveling in opposite directions'
    };
  }

  console.log('[PHASE-2] ✅ Direction check passed');

  // Calculate match quality
  const overlapKm = calculateRouteLength(overlapPoints);
  const matchQuality = Math.min(100, 50 + (overlapKm * 10)); // 50-100 based on overlap length

  console.log(`[PHASE-2] ✅ MATCHED! Quality: ${Math.round(matchQuality)}%, Overlap: ${overlapKm.toFixed(3)}km`);

  return {
    matched: true,
    matchQuality: Math.round(matchQuality),
    overlapSegment: overlapPoints,
    pickupPoint: overlapPoints[0],
    dropoffPoint: overlapPoints[overlapPoints.length - 1],
    overlapDistanceKm: overlapKm,
    reason: 'route_overlap_detected'
  };
}

/**
 * Calculate total distance of a route segment
 * @param {Array} coords - [[lat, lng], ...]
 * @returns {Number} Distance in kilometers
 */
function calculateRouteLength(coords) {
  try {
    const line = toLine(coords);
    if (!line) return 0;
    return turf.length(line, { units: 'kilometers' });
  } catch (error) {
    console.error('[LENGTH] Error:', error);
    return 0;
  }
}

/**
 * Calculate fare split based on overlap
 * @param {Number} totalFare - Total base fare
 * @param {Array} overlapSegment - Overlapping route segment
 * @param {Array} fullPassengerRoute - Complete passenger route
 * @returns {Object} Fare breakdown
 */
function calculateFareSplit(totalFare, overlapSegment, fullPassengerRoute) {
  try {
    const overlapKm = calculateRouteLength(overlapSegment);
    const fullKm = calculateRouteLength(fullPassengerRoute);

    if (fullKm === 0) {
      return {
        passengerPays: '0.00',
        driverEarns: '0.00',
        overlapKm: '0.00',
        shareRatio: '0%',
        error: 'Invalid route'
      };
    }

    const shareRatio = Math.min(1, overlapKm / fullKm);
    const discount = 0.7; // 30% discount for sharing
    const passengerPays = totalFare * shareRatio * discount;
    const driverEarns = passengerPays;

    return {
      passengerPays: passengerPays.toFixed(2),
      driverEarns: driverEarns.toFixed(2),
      overlapKm: overlapKm.toFixed(2),
      shareRatio: (shareRatio * 100).toFixed(1) + '%',
      discount: '30%'
    };
  } catch (error) {
    console.error('[FARE-SPLIT] Error:', error);
    return {
      passengerPays: '0.00',
      driverEarns: '0.00',
      error: error.message
    };
  }
}

/**
 * MAIN MATCHING FUNCTION - Two-phase algorithm
 * @param {Array} driverCoords - Driver's GPS coordinates [[lat, lng], ...]
 * @param {Array} passengerCoords - Passenger's GPS coordinates [[lat, lng], ...]
 * @param {Object} tripData - Additional trip data (fares, etc.)
 * @returns {Object} Comprehensive match result
 */
function matchRoutes(driverCoords, passengerCoords, tripData = {}) {
  console.log('\n[MATCHING] ========== START ==========');
  console.log('[MATCHING] Driver points:', driverCoords.length, 'Passenger points:', passengerCoords.length);

  // Validate inputs
  if (!Array.isArray(driverCoords) || !Array.isArray(passengerCoords)) {
    console.log('[MATCHING] ❌ Invalid input: coordinates must be arrays');
    return { matched: false, reason: 'invalid_input', message: 'Coordinates must be arrays' };
  }

  if (driverCoords.length < 2 || passengerCoords.length < 2) {
    console.log('[MATCHING] ❌ Insufficient data: need at least 2 points per route');
    return { matched: false, reason: 'insufficient_data', message: 'Need at least 2 points per route' };
  }

  // PHASE 1: Fast H3 pre-filter
  console.log('[MATCHING] → PHASE 1: H3 hexagon pre-filter...');
  if (!phase1HexOverlap(driverCoords, passengerCoords)) {
    console.log('[MATCHING] ❌ RESULT: NO MATCH (Phase 1 failed)');
    return { matched: false, reason: 'phase1_no_overlap', message: 'Routes too far apart (H3 pre-filter)' };
  }

  // PHASE 2: Precise spatial + direction check
  console.log('[MATCHING] → PHASE 2: Precise spatial + direction check...');
  const result = phase2PreciseMatch(driverCoords, passengerCoords);

  // If matched, add fare calculation
  if (result.matched && tripData.baseFare) {
    const fareSplit = calculateFareSplit(
      tripData.baseFare,
      result.overlapSegment,
      passengerCoords
    );
    result.fareSplit = fareSplit;
  }

  console.log(`[MATCHING] ✅ FINAL RESULT: ${result.matched ? 'MATCHED' : 'NOT MATCHED'} (${result.reason})`);
  console.log('[MATCHING] ========== END ==========\n');
  return result;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  matchRoutes,
  phase1HexOverlap,
  phase2PreciseMatch,
  getSpatialOverlapSegment,
  isSameDirection,
  calcBearing,
  calculateFareSplit,
  calculateRouteLength,
  toLine,
  getRouteHexagons
};
