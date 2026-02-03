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

module.exports = {
  generateUniqueCode,
  calculateDistance,
  checkRouteOverlap,
};
