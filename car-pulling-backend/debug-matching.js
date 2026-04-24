/**
 * Debug Matching Engine with Real Coordinates
 * Testing rider vs driver routes
 */

const turf = require('@turf/turf');

// Real coordinates from user
const DRIVER_PICKUP = [30.8383, 76.9422];  // lat, lon
const DRIVER_DROPOFF = [30.8036, 76.9159];

const RIDER_PICKUP = [30.8360, 76.9384];   // lat, lon
const RIDER_DESTINATION = [30.811991, 76.917596];

console.log('\n========== MATCHING DEBUG ==========\n');
console.log('DRIVER ROUTE:');
console.log(`  Start: ${DRIVER_PICKUP}`);
console.log(`  End: ${DRIVER_DROPOFF}`);

console.log('\nRIDER ROUTE:');
console.log(`  Start: ${RIDER_PICKUP}`);
console.log(`  End: ${RIDER_DESTINATION}`);

// ============================================
// Test Phase 1: Distance Check (Simple)
// ============================================

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

console.log('\n========== DISTANCE ANALYSIS ==========\n');
const dist1 = haversine(DRIVER_PICKUP[0], DRIVER_PICKUP[1], RIDER_PICKUP[0], RIDER_PICKUP[1]);
const dist2 = haversine(DRIVER_DROPOFF[0], DRIVER_DROPOFF[1], RIDER_DESTINATION[0], RIDER_DESTINATION[1]);
const dist3 = haversine(DRIVER_PICKUP[0], DRIVER_PICKUP[1], RIDER_DESTINATION[0], RIDER_DESTINATION[1]);
const dist4 = haversine(DRIVER_DROPOFF[0], DRIVER_DROPOFF[1], RIDER_PICKUP[0], RIDER_PICKUP[1]);

console.log(`Driver Start → Rider Start: ${dist1.toFixed(3)} km`);
console.log(`Driver End → Rider End: ${dist2.toFixed(3)} km`);
console.log(`Driver Start → Rider End: ${dist3.toFixed(3)} km`);
console.log(`Driver End → Rider Start: ${dist4.toFixed(3)} km`);

// ============================================
// Test Phase 2: Route Overlap with Turf.js
// ============================================

console.log('\n========== TURF.JS SPATIAL ANALYSIS ==========\n');

function toLine(coords) {
  if (!Array.isArray(coords) || coords.length < 2) {
    return null;
  }
  return turf.lineString(
    coords.map(([lat, lng]) => [lng, lat]) // Convert to [lng, lat] for Turf
  );
}

// Create driver route line
const driverRoute = toLine([DRIVER_PICKUP, DRIVER_DROPOFF]);
console.log('✅ Driver route line created');

// Create rider route line
const riderRoute = toLine([RIDER_PICKUP, RIDER_DESTINATION]);
console.log('✅ Rider route line created');

// Check if rider points are within 500m buffer of driver route
const BUFFER_KM = 0.5; // 500 meters
const buffered = turf.buffer(driverRoute, BUFFER_KM, { units: 'kilometers' });
console.log(`✅ Driver route buffer created (${BUFFER_KM * 1000}m)`);

// Test if rider pickup is in buffer
const riderPickupPoint = turf.point([RIDER_PICKUP[1], RIDER_PICKUP[0]]);
const riderDestPoint = turf.point([RIDER_DESTINATION[1], RIDER_DESTINATION[0]]);

const pickupInBuffer = turf.booleanPointInPolygon(riderPickupPoint, buffered);
const destInBuffer = turf.booleanPointInPolygon(riderDestPoint, buffered);

console.log(`\n🔍 Point-in-Buffer Tests:`);
console.log(`  Rider Pickup in buffer? ${pickupInBuffer}`);
console.log(`  Rider Dest in buffer? ${destInBuffer}`);

// Calculate route lengths
const driverLength = turf.length(driverRoute, { units: 'kilometers' });
const riderLength = turf.length(riderRoute, { units: 'kilometers' });

console.log(`\n📏 Route Lengths:`);
console.log(`  Driver route: ${driverLength.toFixed(3)} km`);
console.log(`  Rider route: ${riderLength.toFixed(3)} km`);

// Calculate distance between route endpoints
const startDist = turf.distance(
  turf.point([DRIVER_PICKUP[1], DRIVER_PICKUP[0]]),
  turf.point([RIDER_PICKUP[1], RIDER_PICKUP[0]]),
  { units: 'kilometers' }
);

console.log(`\n📍 Start Points Distance: ${startDist.toFixed(3)} km`);

// ============================================
// Test Phase 3: Line Intersection
// ============================================

console.log('\n========== LINE INTERSECTION TEST ==========\n');

try {
  const intersection = turf.lineIntersect(driverRoute, riderRoute);
  if (intersection.features.length > 0) {
    console.log(`✅ Routes INTERSECT at ${intersection.features.length} point(s):`);
    intersection.features.forEach((feat, i) => {
      const [lng, lat] = feat.geometry.coordinates;
      console.log(`   Point ${i+1}: [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
    });
  } else {
    console.log('❌ Routes do NOT intersect');
  }
} catch (error) {
  console.log('⚠️  Intersection test error:', error.message);
}

// ============================================
// FINAL VERDICT
// ============================================

console.log('\n========== VERDICT ==========\n');

if (pickupInBuffer || destInBuffer) {
  console.log('✅ MATCH SHOULD BE FOUND');
  console.log('   Routes are close enough to match');
} else {
  console.log('❌ NO MATCH - Routes are too far apart');
  console.log(`   Closest point: ${Math.min(dist1, dist2, dist3, dist4).toFixed(3)} km`);
  console.log(`   Buffer distance: ${BUFFER_KM} km (${BUFFER_KM * 1000}m)`);
}

console.log('\n====================================\n');
