/**
 * Client-Side Route Matching Engine
 * For use in Leaflet.js + OpenStreetMap applications
 * Uses Turf.js via CDN
 * 
 * Include in HTML:
 * <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
 * <script src="this-file.js"></script>
 */

// Configuration
const ROUTE_MATCHING_CONFIG = {
  OSRM_API: 'https://router.project-osrm.org/route/v1/driving',
  PICKUP_DROPOFF_BUFFER_M: 800,        // 800 meters (real-world roads curve)
  OVERLAP_TOLERANCE_M: 25,             // 25 meters (kept for reference)
  MIN_OVERLAP_RATIO: 0.20,             // 20% minimum overlap
  DIRECTION_TOLERANCE_DEG: 60,         // 60 degree tolerance for direction
  REQUEST_TIMEOUT: 5000,               // 5 second timeout
};

/**
 * Fetch actual road-following route from OSRM
 * Returns GeoJSON LineString with real routing geometry
 * 
 * @param {Number} startLat
 * @param {Number} startLng
 * @param {Number} endLat
 * @param {Number} endLng
 * @returns {Promise<Object>} Turf LineString or null
 */
async function getOSRMRoute(startLat, startLng, endLat, endLng) {
  try {
    console.log(`[OSRM-CLIENT] Fetching route: (${startLat}, ${startLng}) → (${endLat}, ${endLng})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ROUTE_MATCHING_CONFIG.REQUEST_TIMEOUT);
    
    const url = `${ROUTE_MATCHING_CONFIG.OSRM_API}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RideShare-Client' }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log('[OSRM-CLIENT] ⚠️  API returned status:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.log('[OSRM-CLIENT] ⚠️  No route found');
      return null;
    }

    const geometry = data.routes[0].geometry;
    if (!geometry || !geometry.coordinates) {
      console.log('[OSRM-CLIENT] ⚠️  Invalid geometry in response');
      return null;
    }

    const line = turf.lineString(geometry.coordinates);
    const distanceKm = turf.length(line, { units: 'kilometers' });
    
    console.log(`[OSRM-CLIENT] ✅ Route fetched: ${distanceKm.toFixed(2)}km, ${geometry.coordinates.length} points`);
    return line;

  } catch (error) {
    console.error(`[OSRM-CLIENT] ❌ Error:`, error.message);
    return null;
  }
}

/**
 * Create simple straight-line route (fallback)
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
 * @returns {Boolean}
 */
function doLinesIntersect(driverLine, passengerLine) {
  try {
    const intersects = turf.lineIntersects(driverLine, passengerLine);
    console.log(`[INTERSECT] Lines ${intersects ? 'DO' : 'DO NOT'} intersect`);
    return intersects;
  } catch (error) {
    console.error('[INTERSECT] Error:', error.message);
    return false;
  }
}

/**
 * Proximity-based overlap: snap rider pickup & dropoff onto driver route,
 * verify order and compute coverage ratio.
 * @param {Object} driverLine  - Turf LineString
 * @param {Object} passengerLine - Turf LineString
 * @returns {Object|null} { overlapKm, overlapRatio, pickupSnap, dropoffSnap, pickupDistM, dropoffDistM }
 */
function findOverlapSegments(driverLine, passengerLine) {
  try {
    // Rider endpoints
    const coords = passengerLine.geometry.coordinates;
    const riderPickupPt  = turf.point(coords[0]);
    const riderDropoffPt = turf.point(coords[coords.length - 1]);

    // Snap onto driver route
    const snapPickup  = turf.nearestPointOnLine(driverLine, riderPickupPt,  { units: 'kilometers' });
    const snapDropoff = turf.nearestPointOnLine(driverLine, riderDropoffPt, { units: 'kilometers' });

    const pickupDistM  = snapPickup.properties.dist  * 1000;
    const dropoffDistM = snapDropoff.properties.dist * 1000;
    const pickupLocKm  = snapPickup.properties.location  || 0;
    const dropoffLocKm = snapDropoff.properties.location || 0;

    const MAX_DETOUR_M = ROUTE_MATCHING_CONFIG.PICKUP_DROPOFF_BUFFER_M;

    console.log(`[OVERLAP] Rider PICKUP  : ${pickupDistM.toFixed(0)}m from driver route (at ${pickupLocKm.toFixed(3)}km)`);
    console.log(`[OVERLAP] Rider DROPOFF : ${dropoffDistM.toFixed(0)}m from driver route (at ${dropoffLocKm.toFixed(3)}km)`);

    if (pickupDistM > MAX_DETOUR_M) {
      console.log(`[OVERLAP] ❌ PICKUP TOO FAR: ${pickupDistM.toFixed(0)}m`);
      return null;
    }
    if (dropoffDistM > MAX_DETOUR_M) {
      console.log(`[OVERLAP] ❌ DROPOFF TOO FAR: ${dropoffDistM.toFixed(0)}m`);
      return null;
    }
    if (pickupLocKm - dropoffLocKm > 0.05) {
      console.log(`[OVERLAP] ❌ WRONG ORDER`);
      return null;
    }

    const overlapKm = Math.max(0, dropoffLocKm - pickupLocKm);
    const riderStraightKm = turf.length(passengerLine, { units: 'kilometers' });
    const denominator  = Math.max(riderStraightKm, 0.1);
    const overlapRatio = Math.min(1.0, overlapKm / denominator);

    console.log(`[OVERLAP] Coverage: ${(overlapRatio * 100).toFixed(1)}%  (${overlapKm.toFixed(3)}km / ${riderStraightKm.toFixed(3)}km)`);

    if (overlapRatio < ROUTE_MATCHING_CONFIG.MIN_OVERLAP_RATIO) {
      console.log(`[OVERLAP] ❌ Insufficient overlap`);
      return null;
    }

    console.log(`[OVERLAP] ✅ Valid overlap`);

    // Return in a shape the rest of evaluateRouteMatch can use
    return {
      features: [{ geometry: { type: 'LineString', coordinates: [snapPickup.geometry.coordinates, snapDropoff.geometry.coordinates] } }],
      _overlapKm:    overlapKm,
      _overlapRatio: overlapRatio,
      _pickupDistM:  pickupDistM,
      _dropoffDistM: dropoffDistM,
      _pickupSnap:   snapPickup.geometry.coordinates,
      _dropoffSnap:  snapDropoff.geometry.coordinates,
      _pickupLocKm:  pickupLocKm,
      _dropoffLocKm: dropoffLocKm
    };
  } catch (error) {
    console.error('[OVERLAP] Error:', error.message);
    return null;
  }
}

/**
 * Calculate total overlap distance in kilometers
 * @param {Object} overlapFeatures
 * @returns {Number}
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
    console.error('[OVERLAP-DIST] Error:', error.message);
    return 0;
  }
}

/**
 * Get passenger route distance
 * @param {Object} passengerLine
 * @returns {Number} Distance in km
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
 * Calculate overlap ratio (0.0 to 1.0)
 * @param {Number} overlapKm
 * @param {Number} passengerKm
 * @returns {Number}
 */
function calculateOverlapRatio(overlapKm, passengerKm) {
  if (passengerKm === 0) return 0;
  const ratio = Math.min(1.0, overlapKm / passengerKm);
  console.log(`[OVERLAP-RATIO] ${overlapKm.toFixed(3)}km / ${passengerKm.toFixed(3)}km = ${(ratio * 100).toFixed(1)}%`);
  return ratio;
}

/**
 * Check pickup proximity to driver route
 * @param {Number} pickupLat
 * @param {Number} pickupLng
 * @param {Object} driverLine
 * @returns {Object} { isWithinBuffer, distanceMeters, nearestPoint }
 */
function checkPickupProximity(pickupLat, pickupLng, driverLine) {
  try {
    const pickupPoint = turf.point([pickupLng, pickupLat]);
    const nearest = turf.nearestPointOnLine(driverLine, pickupPoint);
    
    const distanceMeters = nearest.properties.dist * 1000; // Convert km to m
    const isWithinBuffer = distanceMeters <= ROUTE_MATCHING_CONFIG.PICKUP_DROPOFF_BUFFER_M;

    console.log(`[PICKUP] Distance from route: ${distanceMeters.toFixed(1)}m - ${isWithinBuffer ? '✅ PASS' : '❌ FAIL'}`);

    return {
      isWithinBuffer,
      distanceMeters: Math.round(distanceMeters),
      nearestPoint: nearest.geometry.coordinates,
      distFromStart: nearest.properties.location
    };

  } catch (error) {
    console.error('[PICKUP] Error:', error.message);
    return {
      isWithinBuffer: false,
      distanceMeters: -1,
      error: error.message
    };
  }
}

/**
 * Check dropoff proximity to driver route
 * @param {Number} dropoffLat
 * @param {Number} dropoffLng
 * @param {Object} driverLine
 * @returns {Object} { isWithinBuffer, distanceMeters, nearestPoint }
 */
function checkDropoffProximity(dropoffLat, dropoffLng, driverLine) {
  try {
    const dropoffPoint = turf.point([dropoffLng, dropoffLat]);
    const nearest = turf.nearestPointOnLine(driverLine, dropoffPoint);
    
    const distanceMeters = nearest.properties.dist * 1000; // Convert km to m
    const isWithinBuffer = distanceMeters <= ROUTE_MATCHING_CONFIG.PICKUP_DROPOFF_BUFFER_M;

    console.log(`[DROPOFF] Distance from route: ${distanceMeters.toFixed(1)}m - ${isWithinBuffer ? '✅ PASS' : '❌ FAIL'}`);

    return {
      isWithinBuffer,
      distanceMeters: Math.round(distanceMeters),
      nearestPoint: nearest.geometry.coordinates,
      distFromStart: nearest.properties.location
    };

  } catch (error) {
    console.error('[DROPOFF] Error:', error.message);
    return {
      isWithinBuffer: false,
      distanceMeters: -1,
      error: error.message
    };
  }
}

/**
 * Verify direction of travel
 * @param {Object} pickupData
 * @param {Object} dropoffData
 * @returns {Object} { isSameDirection, reason }
 */
function verifyDirection(pickupData, dropoffData) {
  try {
    if (pickupData.distFromStart === undefined || dropoffData.distFromStart === undefined) {
      console.log('[DIRECTION] ⚠️  Direction data unavailable');
      return {
        isSameDirection: true,
        reason: 'direction_data_unavailable'
      };
    }

    const isSameDir = pickupData.distFromStart <= dropoffData.distFromStart;
    
    if (isSameDir) {
      console.log(`[DIRECTION] ✅ Correct order: Pickup at ${pickupData.distFromStart?.toFixed(3)}km, Dropoff at ${dropoffData.distFromStart?.toFixed(3)}km`);
    } else {
      console.log(`[DIRECTION] ❌ Wrong order`);
    }

    return {
      isSameDirection: isSameDir,
      reason: isSameDir ? 'correct_order' : 'wrong_order'
    };

  } catch (error) {
    console.error('[DIRECTION] Error:', error.message);
    return {
      isSameDirection: true,
      reason: 'direction_check_error'
    };
  }
}

/**
 * MAIN CLIENT-SIDE ROUTE MATCHING FUNCTION
 * 
 * Usage:
 * const result = await evaluateRouteMatch({
 *   startLat: 34.052235,
 *   startLng: -118.243683,
 *   endLat: 34.084261,
 *   endLng: -118.243683
 * }, {
 *   startLat: 34.052235,
 *   startLng: -118.243683,
 *   endLat: 34.084261,
 *   endLng: -118.243683,
 *   pickupLat: 34.060000,
 *   pickupLng: -118.243683,
 *   dropoffLat: 34.075000,
 *   dropoffLng: -118.243683
 * });
 * 
 * @param {Object} driverRoute - { startLat, startLng, endLat, endLng }
 * @param {Object} passengerRoute - { startLat, startLng, endLat, endLng, pickupLat, pickupLng, dropoffLat, dropoffLng }
 * @param {Boolean} useOSRM - Use OSRM for real routes (default: true)
 * @returns {Promise<Object>} Match result
 */
async function evaluateRouteMatch(driverRoute, passengerRoute, useOSRM = true) {
  console.log('\n[MATCHING-CLIENT] ========== START ROUTE EVALUATION ==========');
  console.log('[MATCHING-CLIENT] Driver:', `(${driverRoute.startLat}, ${driverRoute.startLng}) → (${driverRoute.endLat}, ${driverRoute.endLng})`);
  console.log('[MATCHING-CLIENT] Passenger:', `(${passengerRoute.startLat}, ${passengerRoute.startLng}) → (${passengerRoute.endLat}, ${passengerRoute.endLng})`);

  if (!driverRoute || !passengerRoute) {
    return {
      isMatch: false,
      reason: 'Invalid input: missing route data'
    };
  }

  try {
    // Step 1: Get route geometries
    console.log('[MATCHING-CLIENT] Step 1: Fetching route geometries...');
    
    let driverLine, passengerLine;

    if (useOSRM) {
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

      if (!driverLine) {
        console.log('[MATCHING-CLIENT] ⚠️  Falling back to simple driver route');
        driverLine = getSimpleRoute(
          driverRoute.startLat,
          driverRoute.startLng,
          driverRoute.endLat,
          driverRoute.endLng
        );
      }

      if (!passengerLine) {
        console.log('[MATCHING-CLIENT] ⚠️  Falling back to simple passenger route');
        passengerLine = getSimpleRoute(
          passengerRoute.startLat,
          passengerRoute.startLng,
          passengerRoute.endLat,
          passengerRoute.endLng
        );
      }
    } else {
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

    // Step 2: Find overlaps (proximity-snap approach)
    console.log('[MATCHING-CLIENT] Step 2: Checking route proximity overlap...');
    const overlapData = findOverlapSegments(driverLine, passengerLine);

    if (!overlapData) {
      return {
        isMatch: false,
        overlapKm: 0,
        overlapRatio: 0,
        pickupDetourMeters: -1,
        dropoffDetourMeters: -1,
        reason: 'Rider pickup/dropoff not within buffer of driver route, wrong direction, or insufficient overlap'
      };
    }

    // Step 3: Compile metrics from overlap data
    console.log('[MATCHING-CLIENT] Step 3: Compiling overlap metrics...');
    const overlapKm         = overlapData._overlapKm;
    const overlapRatio      = overlapData._overlapRatio;
    const pickupDistM       = overlapData._pickupDistM;
    const dropoffDistM      = overlapData._dropoffDistM;
    const passengerDistKm   = turf.length(passengerLine, { units: 'kilometers' });

    console.log(`[MATCHING-CLIENT] Overlap: ${(overlapRatio*100).toFixed(1)}%  (${overlapKm.toFixed(3)}km)`);

    // ========== MATCH APPROVED ==========
    console.log('[MATCHING-CLIENT] ✅ ALL CHECKS PASSED - MATCH APPROVED');

    return {
      isMatch: true,
      overlapKm:           parseFloat(overlapKm.toFixed(3)),
      overlapRatio:        parseFloat((overlapRatio * 100).toFixed(1)),
      pickupDetourMeters:  Math.round(pickupDistM),
      dropoffDetourMeters: Math.round(dropoffDistM),
      reason: `Routes share ${(overlapRatio * 100).toFixed(1)}% path overlap (${overlapKm.toFixed(3)}km) with pickup and dropoff within ${ROUTE_MATCHING_CONFIG.PICKUP_DROPOFF_BUFFER_M}m buffer`,
      details: {
        overlappingSegments:  overlapData.features.length,
        driverRouteKm:        parseFloat(turf.length(driverLine, { units: 'kilometers' }).toFixed(3)),
        passengerRouteKm:     parseFloat(passengerDistKm.toFixed(3)),
        pickupNearestPoint:   overlapData._pickupSnap,
        dropoffNearestPoint:  overlapData._dropoffSnap
      }
    };

  } catch (error) {
    console.error('[MATCHING-CLIENT] ❌ FATAL ERROR:', error.message);

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
// VISUALIZATION HELPERS
// ============================================

/**
 * Draw matching results on Leaflet map
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} driverLine - Turf LineString
 * @param {Object} passengerLine - Turf LineString
 * @param {Object} overlapFeatures - Overlap feature collection
 */
function visualizeMatch(map, driverLine, passengerLine, overlapFeatures) {
  try {
    // Driver route - blue
    L.geoJSON(driverLine, {
      style: { color: 'blue', weight: 3, opacity: 0.7 }
    }).addTo(map);

    // Passenger route - red
    L.geoJSON(passengerLine, {
      style: { color: 'red', weight: 3, opacity: 0.7 }
    }).addTo(map);

    // Overlap - green, thicker
    if (overlapFeatures) {
      L.geoJSON(overlapFeatures, {
        style: { color: 'green', weight: 5, opacity: 0.9 }
      }).addTo(map);
    }

    console.log('[VIZ] Match visualization added to map');
  } catch (error) {
    console.error('[VIZ] Error:', error.message);
  }
}

// ============================================
// EXPORTS (for module systems)
// ============================================

if (typeof module !== 'undefined' && module.exports) {
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
    visualizeMatch,
    ROUTE_MATCHING_CONFIG
  };
}
