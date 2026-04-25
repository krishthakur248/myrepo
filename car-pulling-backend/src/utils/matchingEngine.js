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
const MIN_SHARED_HEXAGONS = 1; // Require 1+ shared hex cells (paths in same geographic area)

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
    console.log('[PHASE-1] ⚠️  H3 not available - skipping pre-filter, moving to Phase 2');
    return true; // Continue to Phase 2 if H3 unavailable
  }

  if (driverCoords.length < 2 || passengerCoords.length < 2) {
    console.log('[PHASE-1] ❌ Insufficient data: need at least 2 points per route');
    return false;
  }

  const driverHexes = getRouteHexagons(driverCoords);
  const passHexes = getRouteHexagons(passengerCoords);

  if (driverHexes.size === 0 || passHexes.size === 0) {
    console.log('[PHASE-1] ❌ FAILED: One route is empty');
    return false;
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
 * Get overlapping segment: Proximity-based approach
 * Checks if rider pickup & dropoff are close to driver route,
 * in the correct travel order, with sufficient path coverage.
 * @param {Array} driverCoords - Driver route [[lat, lng], ...]
 * @param {Array} passengerCoords - Rider route [[lat, lng], ...]
 * @returns {Object|null} Match data or null
 */
function getSpatialOverlapSegment(driverCoords, passengerCoords) {
  try {
    if (!driverCoords || !passengerCoords || driverCoords.length < 2 || passengerCoords.length < 2) {
      console.log('[OVERLAP] ❌ Invalid route coordinates');
      return null;
    }

    const driverLine = toLine(driverCoords);
    if (!driverLine) {
      console.log('[OVERLAP] ❌ Could not create driver line');
      return null;
    }

    // Rider's pickup = first point, dropoff = last point
    const riderPickup  = passengerCoords[0];
    const riderDropoff = passengerCoords[passengerCoords.length - 1];

    const pickupPoint  = turf.point([riderPickup[1],  riderPickup[0]]);
    const dropoffPoint = turf.point([riderDropoff[1], riderDropoff[0]]);

    // Snap pickup & dropoff onto the driver's route
    const nearestPickup  = turf.nearestPointOnLine(driverLine, pickupPoint,  { units: 'kilometers' });
    const nearestDropoff = turf.nearestPointOnLine(driverLine, dropoffPoint, { units: 'kilometers' });

    // dist is in km when units:'kilometers' is set
    const pickupDistMeters  = nearestPickup.properties.dist  * 1000;
    const dropoffDistMeters = nearestDropoff.properties.dist * 1000;
    const pickupLocKm  = nearestPickup.properties.location  || 0;
    const dropoffLocKm = nearestDropoff.properties.location || 0;

    // Generous buffer — real-world roads curve, so 800 m is reasonable
    const MAX_DETOUR_M = 800;

    console.log(`[OVERLAP] 🎯 Rider PICKUP  : ${pickupDistMeters.toFixed(0)}m from driver route (at ${pickupLocKm.toFixed(3)}km along driver route)`);
    console.log(`[OVERLAP] 🎯 Rider DROPOFF : ${dropoffDistMeters.toFixed(0)}m from driver route (at ${dropoffLocKm.toFixed(3)}km along driver route)`);

    if (pickupDistMeters > MAX_DETOUR_M) {
      console.log(`[OVERLAP] ❌ PICKUP TOO FAR: ${pickupDistMeters.toFixed(0)}m > ${MAX_DETOUR_M}m`);
      return null;
    }
    if (dropoffDistMeters > MAX_DETOUR_M) {
      console.log(`[OVERLAP] ❌ DROPOFF TOO FAR: ${dropoffDistMeters.toFixed(0)}m > ${MAX_DETOUR_M}m`);
      return null;
    }

    // Pickup must come before dropoff on the driver's path
    if (pickupLocKm >= dropoffLocKm) {
      // Allow a tiny tolerance (0.05 km = 50 m) for rounding
      if (pickupLocKm - dropoffLocKm > 0.05) {
        console.log(`[OVERLAP] ❌ WRONG ORDER: Pickup at ${pickupLocKm.toFixed(3)}km, Dropoff at ${dropoffLocKm.toFixed(3)}km`);
        return null;
      }
    }

    // Segment the driver covers while carrying the rider
    const overlapDistanceKm = Math.max(0, dropoffLocKm - pickupLocKm);

    // Rider's straight-line distance (haversine via turf)
    const riderStraightKm = turf.distance(pickupPoint, dropoffPoint, { units: 'kilometers' });

    // Use the larger of actual rider distance or overlap as denominator
    // This prevents a tiny rider route inflating the ratio artificially
    const denominator = Math.max(riderStraightKm, 0.1);
    const overlapRatio = Math.min(1.0, overlapDistanceKm / denominator);

    console.log(`[OVERLAP] 📏 Rider straight-line: ${riderStraightKm.toFixed(3)}km`);
    console.log(`[OVERLAP] 📏 Driver segment for rider: ${overlapDistanceKm.toFixed(3)}km`);
    console.log(`[OVERLAP] 📏 Coverage ratio: ${(overlapRatio * 100).toFixed(1)}%`);

    // Minimum 20% coverage — generous for real-world city trips
    const MIN_OVERLAP_RATIO = 0.20;
    if (overlapRatio < MIN_OVERLAP_RATIO) {
      console.log(`[OVERLAP] ❌ INSUFFICIENT OVERLAP: ${(overlapRatio * 100).toFixed(1)}% < ${MIN_OVERLAP_RATIO * 100}%`);
      return null;
    }

    console.log(`[OVERLAP] ✅ VALID OVERLAP: ${(overlapRatio * 100).toFixed(1)}% coverage`);

    return {
      pickupDistMeters:  Math.round(pickupDistMeters),
      dropoffDistMeters: Math.round(dropoffDistMeters),
      pickupLocationKm:  pickupLocKm,
      dropoffLocationKm: dropoffLocKm,
      overlapDistanceKm: overlapDistanceKm,
      overlapRatio:      overlapRatio,
      pickupPoint:       nearestPickup.geometry.coordinates,
      dropoffPoint:      nearestDropoff.geometry.coordinates
    };

  } catch (error) {
    console.error('[OVERLAP] ❌ Error:', error.message);
    console.error(error.stack);
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
 * Direction check: Verify pickup < dropoff on driver route
 * @param {Number} pickupLocationKm - Distance of pickup along driver route
 * @param {Number} dropoffLocationKm - Distance of dropoff along driver route
 * @returns {Boolean} True if order is correct
 */
function isSameDirection(pickupLocationKm, dropoffLocationKm) {
  const isCorrectOrder = pickupLocationKm < dropoffLocationKm;
  if (isCorrectOrder) {
    console.log(`[DIRECTION] ✅ Correct order: Pickup (${pickupLocationKm.toFixed(3)}km) before Dropoff (${dropoffLocationKm.toFixed(3)}km)`);
  } else {
    console.log(`[DIRECTION] ❌ Wrong order: Pickup (${pickupLocationKm.toFixed(3)}km) after Dropoff (${dropoffLocationKm.toFixed(3)}km)`);
  }
  return isCorrectOrder;
}

/**
 * PHASE 2: Precise matching algorithm
 * Validates that rider's entire path is subset of driver's path
 * @param {Array} driverCoords - Driver route [[lat, lng], ...]
 * @param {Array} passengerCoords - Passenger route [[lat, lng], ...]
 * @returns {Object} Match result with details
 */
function phase2PreciseMatch(driverCoords, passengerCoords) {
  console.log('[PHASE-2] 🔍 Starting precise match validation...');
  console.log('[PHASE-2] ⚠️  CRITICAL CHECKS:');
  console.log('[PHASE-2]   1. Rider PICKUP must be on driver route (≤500m)');
  console.log('[PHASE-2]   2. Rider DROPOFF must be on driver route (≤500m)');
  console.log('[PHASE-2]   3. Pickup must occur BEFORE dropoff on driver route');
  console.log('[PHASE-2]   4. Overlap must be ≥30% of rider\'s journey');

  // Check spatial overlap + validate rider path is subset of driver path
  const overlapData = getSpatialOverlapSegment(driverCoords, passengerCoords);
  if (!overlapData) {
    console.log('[PHASE-2] ❌ FAILED: Rider\'s path is NOT a valid subset of driver\'s path');
    return {
      matched: false,
      reason: 'invalid_path_subset',
      message: 'Rider\'s pickup/dropoff not on driver\'s route or insufficient overlap'
    };
  }

  console.log(`[PHASE-2] ✅ Rider path validated as subset of driver path`);

  // Verify direction (pickup before dropoff)
  const correctOrder = isSameDirection(overlapData.pickupLocationKm, overlapData.dropoffLocationKm);
  if (!correctOrder) {
    console.log('[PHASE-2] ❌ FAILED: Pickup/Dropoff in wrong order');
    return {
      matched: false,
      reason: 'wrong_order',
      message: 'Rider pickup appears after dropoff on driver route'
    };
  }

  console.log('[PHASE-2] ✅ Direction/order validation passed');

  // All checks passed - match approved
  console.log(`[PHASE-2] ✅ MATCHED!`);
  console.log(`[PHASE-2]    Pickup detour: ${overlapData.pickupDistMeters}m`);
  console.log(`[PHASE-2]    Dropoff detour: ${overlapData.dropoffDistMeters}m`);
  console.log(`[PHASE-2]    Overlap distance: ${overlapData.overlapDistanceKm.toFixed(3)}km`);
  console.log(`[PHASE-2]    Overlap ratio: ${(overlapData.overlapRatio * 100).toFixed(1)}%`);

  return {
    matched: true,
    pickupDetourMeters: overlapData.pickupDistMeters,
    dropoffDetourMeters: overlapData.dropoffDistMeters,
    overlapSegment: [overlapData.pickupPoint, overlapData.dropoffPoint],
    pickupPoint: overlapData.pickupPoint,
    dropoffPoint: overlapData.dropoffPoint,
    overlapDistanceKm: overlapData.overlapDistanceKm,
    overlapRatio: overlapData.overlapRatio,
    reason: 'rider_path_subset_of_driver_path'
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
 * @param {Object} matchResult - Match result from phase2PreciseMatch
 * @returns {Object} Fare breakdown
 */
function calculateFareSplit(totalFare, matchResult) {
  try {
    if (!matchResult || matchResult.overlapRatio === undefined) {
      return {
        passengerPays: '0.00',
        driverEarns: '0.00',
        error: 'Invalid match data'
      };
    }

    const overlapRatio = matchResult.overlapRatio;
    const discount = 0.7; // 30% discount for sharing
    const passengerPays = totalFare * overlapRatio * discount;
    const driverEarns = passengerPays;

    return {
      passengerPays: passengerPays.toFixed(2),
      driverEarns: driverEarns.toFixed(2),
      overlapKm: matchResult.overlapDistanceKm.toFixed(2),
      shareRatio: (overlapRatio * 100).toFixed(1) + '%',
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
 * Validates rider path is a SUBSET of driver path
 * @param {Array} driverCoords - Driver's GPS coordinates [[lat, lng], ...]
 * @param {Array} passengerCoords - Passenger's GPS coordinates [[lat, lng], ...]
 * @param {Object} tripData - Additional trip data (fares, etc.)
 * @returns {Object} Comprehensive match result
 */
function matchRoutes(driverCoords, passengerCoords, tripData = {}) {
  console.log('\n[MATCHING] ========== START MATCHING (SUBSET VALIDATION) ==========');
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
  console.log('[MATCHING] → PHASE 1: H3 hexagon pre-filter (quick geographic check)...');
  if (!phase1HexOverlap(driverCoords, passengerCoords)) {
    console.log('[MATCHING] ❌ RESULT: NO MATCH (Phase 1 failed - routes too far apart)');
    return { matched: false, reason: 'phase1_no_overlap', message: 'Routes too far apart (H3 pre-filter)' };
  }

  // PHASE 2: Precise spatial validation - CRITICAL: CHECK RIDER PATH IS SUBSET
  console.log('[MATCHING] → PHASE 2: Precise validation (rider path subset check)...');
  const result = phase2PreciseMatch(driverCoords, passengerCoords);

  // If matched, add fare calculation
  if (result.matched && tripData.baseFare) {
    const fareSplit = calculateFareSplit(tripData.baseFare, result);
    result.fareSplit = fareSplit;
  }

  console.log(`[MATCHING] ✅ FINAL RESULT: ${result.matched ? 'MATCHED ✓' : 'NOT MATCHED ✗'}`);
  console.log(`[MATCHING] Reason: ${result.reason}`);
  console.log('[MATCHING] ========== END MATCHING ==========\n');
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
