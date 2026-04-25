const generateUniqueCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const checkRouteOverlap = (driverRoute, riderStart, riderEnd) => {
  // Simple overlap check - more sophisticated algorithms can be added later
  if (!driverRoute || driverRoute.length < 2) return false;

  const startPoint = driverRoute[0];
  const endPoint = driverRoute[driverRoute.length - 1];

  const distToStart = calculateDistance(
    startPoint.latitude,
    startPoint.longitude,
    riderStart.latitude,
    riderStart.longitude
  );

  const distToEnd = calculateDistance(
    endPoint.latitude,
    endPoint.longitude,
    riderEnd.latitude,
    riderEnd.longitude
  );

  // Consider overlap if within reasonable distance (e.g., 5 km)
  return distToStart < 5 && distToEnd < 5;
};

/**
 * Get real road route from OSRM (Open Source Routing Machine)
 * Converts pickup/dropoff coordinates to actual road waypoints
 * @param {Array} pickupCoords - [longitude, latitude]
 * @param {Array} dropoffCoords - [longitude, latitude]
 * @returns {Promise<Array>} Array of waypoints [[lat, lng], [lat, lng], ...]
 */
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

module.exports = {
  generateUniqueCode,
  calculateDistance,
  checkRouteOverlap,
  getOSRMRoute,
};
