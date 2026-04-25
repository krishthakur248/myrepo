/**
 * Test script for OSRM integration
 * Tests if OSRM can fetch real road routes
 */

// Test coordinates from Delhi (same as your test case)
const pickupCoords = [76.9422, 30.8383];  // [lng, lat]
const dropoffCoords = [76.9159, 30.8036]; // [lng, lat]

// OSRM function (copied from helpers.js for testing)
const getOSRMRoute = async (pickupCoords, dropoffCoords) => {
  try {
    if (!Array.isArray(pickupCoords) || !Array.isArray(dropoffCoords) ||
        pickupCoords.length !== 2 || dropoffCoords.length !== 2) {
      console.error('[OSRM] Invalid coordinates format');
      return null;
    }

    const [pickupLng, pickupLat] = pickupCoords;
    const [dropoffLng, dropoffLat] = dropoffCoords;

    // OSRM URL: router.project-osrm.org/route/v1/driving/lng,lat;lng,lat
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?steps=true&geometries=geojson`;

    console.log(`[OSRM] Requesting route: ${osrmUrl}`);

    const response = await fetch(osrmUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[OSRM] Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('[OSRM] No route found:', data.message);
      return null;
    }

    const route = data.routes[0];
    const geometry = route.geometry;

    // Convert GeoJSON geometry to [lat, lng] format
    // geometry.coordinates is already [lng, lat], just need to reverse to [lat, lng]
    const waypoints = geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    console.log(`[OSRM] ✅ Route found with ${waypoints.length} waypoints`);
    console.log(`[OSRM] Distance: ${(route.distance / 1000).toFixed(2)} km`);
    console.log(`[OSRM] Duration: ${(route.duration / 60).toFixed(2)} minutes`);

    return waypoints;
  } catch (error) {
    console.error('[OSRM] Error fetching route:', error.message);
    return null;
  }
};

// Run test
console.log('\n====== OSRM INTEGRATION TEST ======\n');
console.log('Test Case: Delhi Route');
console.log(`Pickup: [${pickupCoords}]`);
console.log(`Dropoff: [${dropoffCoords}]\n`);

getOSRMRoute(pickupCoords, dropoffCoords).then(waypoints => {
  if (waypoints) {
    console.log('\n✅ TEST PASSED - OSRM is working!');
    console.log(`First 5 waypoints:`);
    waypoints.slice(0, 5).forEach((pt, i) => {
      console.log(`  [${i}] [${pt[0].toFixed(5)}, ${pt[1].toFixed(5)}]`);
    });
    console.log(`... and ${waypoints.length - 5} more waypoints`);
  } else {
    console.log('\n❌ TEST FAILED - OSRM returned no route');
  }
});
