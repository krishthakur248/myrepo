/**
 * Advanced Route Matching Engine v2
 * Comprehensive geographic overlap analysis using Turf.js and OSRM
 * 
 * Implements:
 * - OSRM routing for real road-following polylines
 * - Turf.js precise spatial analysis
 * - Overlap ratio calculation
 * - Direction verification
 * - Pickup/dropoff proximity validation
 * 
 * Output: Standardized JSON match result with reasoning
 */

const turf = require('@turf/turf');
const axios = require('axios');

// Configuration
const CONFIG = {
  OSRM_API: 'https://router.project-osrm.org/route/v1/driving',
  PICKUP_DROPOFF_BUFFER_M: 500,        // 500 meters
  OVERLAP_TOLERANCE_M: 25,             // 25 meters for line overlap detection
  MIN_OVERLAP_RATIO: 0.30,             // 30% minimum overlap
  DIRECTION_TOLERANCE_DEG: 60,         // 60 degree tolerance for direction
};

/**
 * Fetch actual road-following route from OSRM
 * Returns GeoJSON LineString with real routing geometry
 * 
 * @param {Number} startLat - Start latitude
 * @param {Number} startLng - Start longitude
 * @param {Number} endLat - End latitude
 * @param {Number} endLng - End longitude
 * @returns {Promise<Object>} Turf LineString or null on failure
 */
async function getOSRMRoute(startLat, startLng, endLat, endLng) {
  try {
    console.log(`[OSRM] Fetching route: (${startLat}, ${startLng}) → (${endLat}, ${endLng})`);
    
    const url = `${CONFIG.OSRM_API}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    
    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'RideShare-Matching-Engine' }
    });

    if (!response.data.routes || response.data.routes.length === 0) {
      console.log('[OSRM] ⚠️  No route found');
      return null;
    }

    const geometry = response.data.routes[0].geometry;
    if (!geometry || !geometry.coordinates) {
      console.log('[OSRM] ⚠️  Invalid geometry in response');
      return null;
    }

    // geometry.coordinates is already [lng, lat] format for Turf
    const line = turf.lineString(geometry.coordinates);
    const distanceKm = turf.length(line, { units: 'kilometers' });
    
    console.log(`[OSRM] ✅ Route fetched: ${distanceKm.toFixed(2)}km, ${geometry.coordinates.length} points`);
    return line;

  } catch (error) {
    console.error(`[OSRM] ❌ Error fetching route:`, error.message);
    return null;
  }
}

/**
 * Create a simple straight-line route (fallback if OSRM fails)
 * @param {Number} startLat
 * @param {Number} startLng
 * @param {Number} endLat
 * @param {Number} endLng
 * @returns {Object} Turf LineString
 */
function getSimpleRoute(startLat, startLng, endLat, endLng) {
  return turf.lineString([
    [startLng, startLat],
    [endLng, endLat]
  ]);
}

/**
 * Check if two lines intersect
 * @param {Object} driverLine - Turf LineString
 * @param {Object} passengerLine - Turf LineString
 * @returns {Boolean} True if lines intersect
 */
function doLinesIntersect(driverLine, passengerLine) {
  try {
    const intersects = turf.lineIntersects(driverLine, passengerLine);
    console.log(`[INTERSECT] Lines ${intersects ? 'DO' : 'DO NOT'} intersect`);
    return intersects;
  } catch (error) {
    console.error('[INTERSECT] Error checking intersection:', error.message);
    return false;
  }
}

/**
 * Find overlapping segments between two routes
 * Uses turf.lineOverlap() with configurable tolerance
 * 
 * @param {Object} driverLine - Turf LineString
 * @param {Object} passengerLine - Turf LineString
 * @returns {Object|null} Overlap feature collection or null
 */
function findOverlapSegments(driverLine, passengerLine) {
  try {
    // Convert tolerance from meters to kilometers
    const toleranceKm = CONFIG.OVERLAP_TOLERANCE_M / 1000;
    
    const overlap = turf.lineOverlap(driverLine, passengerLine, {
      tolerance: toleranceKm
    });

    if (!overlap || overlap.features.length === 0) {
      console.log('[OVERLAP] No overlapping segments found');
      return null;
    }

    console.log(`[OVERLAP] Found ${overlap.features.length} overlapping segment(s)`);
    return overlap;

  } catch (error) {
    console.error('[OVERLAP] Error finding overlaps:', error.message);
    return null;
  }
}

/**
 * Calculate total overlap distance
 * @param {Object} overlapFeatures - Result from turf.lineOverlap()
 * @returns {Number} Total overlap distance in kilometers
 */
function calculateOverlapDistance(overlapFeatures) {
  try {
    if (!overlapFeatures || !overlapFeatures.features) return 0;

    let totalKm = 0;
    overlapFeatures.features.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        totalKm += turf.length(feature, { units: 'kilometers' });
      }
    });

    console.log(`[OVERLAP-DIST] Total overlap: ${totalKm.toFixed(3)}km`);
    return totalKm;

  } catch (error) {
    console.error('[OVERLAP-DIST] Error calculating distance:', error.message);
    return 0;
  }
}

/**
 * Calculate passenger's total route distance
 * @param {Object} passengerLine - Turf LineString
 * @returns {Number} Distance in kilometers
 */
function getPassengerDistance(passengerLine) {
  try {
    const distKm = turf.length(passengerLine, { units: 'kilometers' });
    console.log(`[PASSENGER-DIST] Passenger route: ${distKm.toFixed(3)}km`);
    return distKm;
  } catch (error) {
    console.error('[PASSENGER-DIST] Error:', error.message);
    return 0;
  }
}

/**
 * Calculate overlap ratio
 * @param {Number} overlapKm - Overlap distance
 * @param {Number} passengerKm - Passenger total distance
 * @returns {Number} Ratio (0.0 to 1.0)
 */
function calculateOverlapRatio(overlapKm, passengerKm) {
  if (passengerKm === 0) return 0;
  const ratio = Math.min(1.0, overlapKm / passengerKm);
  console.log(`[OVERLAP-RATIO] ${overlapKm.toFixed(3)}km / ${passengerKm.toFixed(3)}km = ${(ratio * 100).toFixed(1)}%`);
  return ratio;
}

/**
 * Check if pickup point is within buffer of driver's route
 * @param {Number} pickupLat
 * @param {Number} pickupLng
 * @param {Object} driverLine - Turf LineString
 * @returns {Object} { isWithinBuffer, distanceMeters, nearestPoint }
 */
function checkPickupProximity(pickupLat, pickupLng, driverLine) {
  try {
    const pickupPoint = turf.point([pickupLng, pickupLat]);
    const nearest = turf.nearestPointOnLine(driverLine, pickupPoint);
    
    // Distance is in kilometers by default, convert to meters
    const distanceMeters = nearest.properties.dist * 1000;
    const isWithinBuffer = distanceMeters <= CONFIG.PICKUP_DROPOFF_BUFFER_M;

    console.log(`[PICKUP] Distance from route: ${distanceMeters.toFixed(1)}m - ${isWithinBuffer ? '✅ PASS' : '❌ FAIL'}`);

    return {
      isWithinBuffer,
      distanceMeters: Math.round(distanceMeters),
      nearestPoint: nearest.geometry.coordinates,
      distFromStart: nearest.properties.location // Distance along the line from start
    };

  } catch (error) {
    console.error('[PICKUP] Error checking proximity:', error.message);
    return {
      isWithinBuffer: false,
      distanceMeters: -1,
      error: error.message
    };
  }
}

/**
 * Check if dropoff point is within buffer of driver's route
 * @param {Number} dropoffLat
 * @param {Number} dropoffLng
 * @param {Object} driverLine - Turf LineString
 * @returns {Object} { isWithinBuffer, distanceMeters, nearestPoint }
 */
function checkDropoffProximity(dropoffLat, dropoffLng, driverLine) {
  try {
    const dropoffPoint = turf.point([dropoffLng, dropoffLat]);
    const nearest = turf.nearestPointOnLine(driverLine, dropoffPoint);
    
    // Distance is in kilometers by default, convert to meters
    const distanceMeters = nearest.properties.dist * 1000;
    const isWithinBuffer = distanceMeters <= CONFIG.PICKUP_DROPOFF_BUFFER_M;

    console.log(`[DROPOFF] Distance from route: ${distanceMeters.toFixed(1)}m - ${isWithinBuffer ? '✅ PASS' : '❌ FAIL'}`);

    return {
      isWithinBuffer,
      distanceMeters: Math.round(distanceMeters),
      nearestPoint: nearest.geometry.coordinates,
      distFromStart: nearest.properties.location // Distance along the line from start
    };

  } catch (error) {
    console.error('[DROPOFF] Error checking proximity:', error.message);
    return {
      isWithinBuffer: false,
      distanceMeters: -1,
      error: error.message
    };
  }
}

/**
 * Verify direction of travel
 * Pickup should appear earlier along driver's route than dropoff
 * 
 * @param {Object} pickupData - Result from checkPickupProximity()
 * @param {Object} dropoffData - Result from checkDropoffProximity()
 * @returns {Object} { isSameDirection, reason, pickupDistFromStart, dropoffDistFromStart }
 */
function verifyDirection(pickupData, dropoffData) {
  try {
    // If either point's location is not available, skip direction check
    if (pickupData.distFromStart === undefined || dropoffData.distFromStart === undefined) {
      console.log('[DIRECTION] ⚠️  Cannot determine direction (location data missing)');
      return {
        isSameDirection: true, // Allow match if we can't verify
        reason: 'direction_data_unavailable',
        pickupDistFromStart: pickupData.distFromStart,
        dropoffDistFromStart: dropoffData.distFromStart
      };
    }

    // Pickup should be closer to start than dropoff
    const isSameDir = pickupData.distFromStart <= dropoffData.distFromStart;
    
    if (isSameDir) {
      console.log(`[DIRECTION] ✅ Correct order: Pickup at ${pickupData.distFromStart?.toFixed(3)}km, Dropoff at ${dropoffData.distFromStart?.toFixed(3)}km`);
    } else {
      console.log(`[DIRECTION] ❌ Wrong order: Pickup at ${pickupData.distFromStart?.toFixed(3)}km, Dropoff at ${dropoffData.distFromStart?.toFixed(3)}km`);
    }

    return {
      isSameDirection: isSameDir,
      reason: isSameDir ? 'correct_order' : 'wrong_order',
      pickupDistFromStart: pickupData.distFromStart,
      dropoffDistFromStart: dropoffData.distFromStart
    };

  } catch (error) {
    console.error('[DIRECTION] Error verifying direction:', error.message);
    return {
      isSameDirection: true,
      reason: 'direction_check_error',
      error: error.message
    };
  }
}

/**
 * MAIN MATCHING FUNCTION
 * Comprehensive route overlap analysis
 * 
 * @param {Object} driverRoute - { startLat, startLng, endLat, endLng }
 * @param {Object} passengerRoute - { startLat, startLng, endLat, endLng, pickupLat, pickupLng, dropoffLat, dropoffLng }
 * @param {Boolean} useOSRM - Whether to fetch real routes from OSRM (default: true)
 * @returns {Promise<Object>} Comprehensive match result
 */
async function evaluateRouteMatch(driverRoute, passengerRoute, useOSRM = true) {
  console.log('\n[MATCHING] ========== START ROUTE EVALUATION ==========');
  console.log('[MATCHING] Driver:', `(${driverRoute.startLat}, ${driverRoute.startLng}) → (${driverRoute.endLat}, ${driverRoute.endLng})`);
  console.log('[MATCHING] Passenger:', `(${passengerRoute.startLat}, ${passengerRoute.startLng}) → (${passengerRoute.endLat}, ${passengerRoute.endLng})`);

  // Validate inputs
  if (!driverRoute || !passengerRoute) {
    return {
      isMatch: false,
      reason: 'Invalid input: missing route data'
    };
  }

  try {
    // ========== STEP 1: Get routing geometries ==========
    console.log('[MATCHING] Step 1: Fetching route geometries...');
    
    let driverLine, passengerLine;

    if (useOSRM) {
      // Try to get real routes from OSRM
      driverLine = await getOSRMRoute(
        driverRoute.startLat,
        driverRoute.startLng,
        driverRoute.endLat,
        driverRoute.endLng
      );

      passengerLine = await getOSRMRoute(
        passengerRoute.startLat,
        passengerRoute.startLng,
        passengerRoute.endLat,
        passengerRoute.endLng
      );

      // Fallback to simple routes if OSRM fails
      if (!driverLine) {
        console.log('[MATCHING] ⚠️  Falling back to simple driver route');
        driverLine = getSimpleRoute(
          driverRoute.startLat,
          driverRoute.startLng,
          driverRoute.endLat,
          driverRoute.endLng
        );
      }

      if (!passengerLine) {
        console.log('[MATCHING] ⚠️  Falling back to simple passenger route');
        passengerLine = getSimpleRoute(
          passengerRoute.startLat,
          passengerRoute.startLng,
          passengerRoute.endLat,
          passengerRoute.endLng
        );
      }
    } else {
      // Use simple straight-line routes
      driverLine = getSimpleRoute(
        driverRoute.startLat,
        driverRoute.startLng,
        driverRoute.endLat,
        driverRoute.endLng
      );

      passengerLine = getSimpleRoute(
        passengerRoute.startLat,
        passengerRoute.startLng,
        passengerRoute.endLat,
        passengerRoute.endLng
      );
    }

    // ========== STEP 2: Check intersection ==========
    console.log('[MATCHING] Step 2: Checking route intersection...');
    const intersects = doLinesIntersect(driverLine, passengerLine);

    // ========== STEP 3: Find overlap segments ==========
    console.log('[MATCHING] Step 3: Finding overlapping segments...');
    const overlapFeatures = findOverlapSegments(driverLine, passengerLine);

    if (!overlapFeatures) {
      return {
        isMatch: false,
        overlapKm: 0,
        overlapRatio: 0,
        pickupDetourMeters: -1,
        dropoffDetourMeters: -1,
        reason: 'No route overlap detected - routes do not share common path segments'
      };
    }

    // ========== STEP 4: Calculate overlap metrics ==========
    console.log('[MATCHING] Step 4: Calculating overlap metrics...');
    const overlapKm = calculateOverlapDistance(overlapFeatures);
    const passengerDistKm = getPassengerDistance(passengerLine);
    const overlapRatio = calculateOverlapRatio(overlapKm, passengerDistKm);

    // Check if overlap ratio meets minimum
    if (overlapRatio < CONFIG.MIN_OVERLAP_RATIO) {
      return {
        isMatch: false,
        overlapKm: parseFloat(overlapKm.toFixed(3)),
        overlapRatio: parseFloat((overlapRatio * 100).toFixed(1)),
        pickupDetourMeters: -1,
        dropoffDetourMeters: -1,
        reason: `Overlap ratio is ${(overlapRatio * 100).toFixed(1)}% but minimum required is ${CONFIG.MIN_OVERLAP_RATIO * 100}%`
      };
    }

    // ========== STEP 5: Check pickup proximity ==========
    console.log('[MATCHING] Step 5: Checking pickup proximity...');
    const pickupData = checkPickupProximity(
      passengerRoute.pickupLat,
      passengerRoute.pickupLng,
      driverLine
    );

    if (!pickupData.isWithinBuffer) {
      return {
        isMatch: false,
        overlapKm: parseFloat(overlapKm.toFixed(3)),
        overlapRatio: parseFloat((overlapRatio * 100).toFixed(1)),
        pickupDetourMeters: pickupData.distanceMeters,
        dropoffDetourMeters: -1,
        reason: `Passenger pickup is ${pickupData.distanceMeters}m off the driver's route (max allowed: ${CONFIG.PICKUP_DROPOFF_BUFFER_M}m)`
      };
    }

    // ========== STEP 6: Check dropoff proximity ==========
    console.log('[MATCHING] Step 6: Checking dropoff proximity...');
    const dropoffData = checkDropoffProximity(
      passengerRoute.dropoffLat,
      passengerRoute.dropoffLng,
      driverLine
    );

    if (!dropoffData.isWithinBuffer) {
      return {
        isMatch: false,
        overlapKm: parseFloat(overlapKm.toFixed(3)),
        overlapRatio: parseFloat((overlapRatio * 100).toFixed(1)),
        pickupDetourMeters: pickupData.distanceMeters,
        dropoffDetourMeters: dropoffData.distanceMeters,
        reason: `Passenger drop-off is ${dropoffData.distanceMeters}m off the driver's route (max allowed: ${CONFIG.PICKUP_DROPOFF_BUFFER_M}m)`
      };
    }

    // ========== STEP 7: Verify direction ==========
    console.log('[MATCHING] Step 7: Verifying direction of travel...');
    const directionData = verifyDirection(pickupData, dropoffData);

    if (!directionData.isSameDirection) {
      return {
        isMatch: false,
        overlapKm: parseFloat(overlapKm.toFixed(3)),
        overlapRatio: parseFloat((overlapRatio * 100).toFixed(1)),
        pickupDetourMeters: pickupData.distanceMeters,
        dropoffDetourMeters: dropoffData.distanceMeters,
        reason: 'Routes travel in opposite directions or pickup appears after dropoff on driver route'
      };
    }

    // ========== ALL CHECKS PASSED - MATCH APPROVED ==========
    console.log('[MATCHING] ✅ ========== ALL CHECKS PASSED - MATCH APPROVED ==========');

    return {
      isMatch: true,
      overlapKm: parseFloat(overlapKm.toFixed(3)),
      overlapRatio: parseFloat((overlapRatio * 100).toFixed(1)),
      pickupDetourMeters: pickupData.distanceMeters,
      dropoffDetourMeters: dropoffData.distanceMeters,
      reason: `Routes share ${(overlapRatio * 100).toFixed(1)}% path overlap (${overlapKm.toFixed(3)}km) with pickup and dropoff within ${CONFIG.PICKUP_DROPOFF_BUFFER_M}m buffer`,
      details: {
        intersects,
        overlappingSegments: overlapFeatures.features.length,
        driverRouteKm: parseFloat(turf.length(driverLine, { units: 'kilometers' }).toFixed(3)),
        passengerRouteKm: parseFloat(passengerDistKm.toFixed(3)),
        pickupNearestPoint: pickupData.nearestPoint,
        dropoffNearestPoint: dropoffData.nearestPoint
      }
    };

  } catch (error) {
    console.error('[MATCHING] ❌ FATAL ERROR:', error.message);
    console.error(error.stack);

    return {
      isMatch: false,
      overlapKm: 0,
      overlapRatio: 0,
      pickupDetourMeters: -1,
      dropoffDetourMeters: -1,
      reason: `Matching engine error: ${error.message}`
    };
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  evaluateRouteMatch,
  getOSRMRoute,
  getSimpleRoute,
  doLinesIntersect,
  findOverlapSegments,
  calculateOverlapDistance,
  getPassengerDistance,
  calculateOverlapRatio,
  checkPickupProximity,
  checkDropoffProximity,
  verifyDirection,
  CONFIG
};
