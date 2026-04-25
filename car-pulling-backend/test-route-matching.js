/**
 * Advanced Route Matching - Backend Test Examples
 * Test cases and usage examples for the route matching engine
 * 
 * Run with: node test-route-matching.js
 */

const { evaluateRouteMatch } = require('./src/utils/advancedRouteMatching');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================
// TEST CASE 1: Perfect Overlap - Same Route
// ============================================
async function testSameRoute() {
  log('\n' + '='.repeat(60), 'bright');
  log('TEST 1: Same Route (100% Overlap)', 'cyan');
  log('='.repeat(60), 'bright');
  
  const driver = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 34.0852,
    endLng: -118.2437
  };
  
  const passenger = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 34.0852,
    endLng: -118.2437,
    pickupLat: 34.0600,
    pickupLng: -118.2437,
    dropoffLat: 34.0750,
    dropoffLng: -118.2437
  };
  
  const result = await evaluateRouteMatch(driver, passenger);
  
  log(`\nResult: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`, result.isMatch ? 'green' : 'red');
  log(`Overlap: ${result.overlapRatio}% (${result.overlapKm}km)`);
  log(`Detours: Pickup ${result.pickupDetourMeters}m, Dropoff ${result.dropoffDetourMeters}m`);
  log(`Reason: ${result.reason}\n`);
  
  return result;
}

// ============================================
// TEST CASE 2: Parallel Routes - No Overlap
// ============================================
async function testParallelRoutes() {
  log('\n' + '='.repeat(60), 'bright');
  log('TEST 2: Parallel Routes (No Overlap)', 'cyan');
  log('='.repeat(60), 'bright');
  
  const driver = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 34.0852,
    endLng: -118.2437
  };
  
  const passenger = {
    startLat: 34.0522,
    startLng: -118.1437,  // Different longitude
    endLat: 34.0852,
    endLng: -118.1437,
    pickupLat: 34.0600,
    pickupLng: -118.1437,
    dropoffLat: 34.0750,
    dropoffLng: -118.1437
  };
  
  const result = await evaluateRouteMatch(driver, passenger);
  
  log(`\nResult: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`, result.isMatch ? 'green' : 'red');
  log(`Overlap: ${result.overlapRatio}% (${result.overlapKm}km)`);
  log(`Reason: ${result.reason}\n`);
  
  return result;
}

// ============================================
// TEST CASE 3: Partial Overlap - Should Match
// ============================================
async function testPartialOverlap() {
  log('\n' + '='.repeat(60), 'bright');
  log('TEST 3: Partial Overlap (45% overlap)', 'cyan');
  log('='.repeat(60), 'bright');
  
  const driver = {
    startLat: 34.0400,
    startLng: -118.2437,
    endLat: 34.0900,
    endLng: -118.2437
  };
  
  const passenger = {
    startLat: 34.0600,
    startLng: -118.2437,
    endLat: 34.0850,
    endLng: -118.2437,
    pickupLat: 34.0650,
    pickupLng: -118.2437,
    dropoffLat: 34.0800,
    dropoffLng: -118.2437
  };
  
  const result = await evaluateRouteMatch(driver, passenger);
  
  log(`\nResult: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`, result.isMatch ? 'green' : 'red');
  log(`Overlap: ${result.overlapRatio}% (${result.overlapKm}km)`);
  log(`Detours: Pickup ${result.pickupDetourMeters}m, Dropoff ${result.dropoffDetourMeters}m`);
  log(`Reason: ${result.reason}\n`);
  
  return result;
}

// ============================================
// TEST CASE 4: Pickup Too Far - Should Reject
// ============================================
async function testPickupTooFar() {
  log('\n' + '='.repeat(60), 'bright');
  log('TEST 4: Pickup Too Far (>500m)', 'cyan');
  log('='.repeat(60), 'bright');
  
  const driver = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 34.0852,
    endLng: -118.2437
  };
  
  const passenger = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 34.0852,
    endLng: -118.2437,
    pickupLat: 34.0700,  // Much farther away
    pickupLng: -118.1800,
    dropoffLat: 34.0750,
    dropoffLng: -118.2437
  };
  
  const result = await evaluateRouteMatch(driver, passenger);
  
  log(`\nResult: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`, result.isMatch ? 'green' : 'red');
  log(`Pickup Distance: ${result.pickupDetourMeters}m`);
  log(`Reason: ${result.reason}\n`);
  
  return result;
}

// ============================================
// TEST CASE 5: Dropoff Too Far - Should Reject
// ============================================
async function testDropoffTooFar() {
  log('\n' + '='.repeat(60), 'bright');
  log('TEST 5: Dropoff Too Far (>500m)', 'cyan');
  log('='.repeat(60), 'bright');
  
  const driver = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 34.0852,
    endLng: -118.2437
  };
  
  const passenger = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 34.0852,
    endLng: -118.2437,
    pickupLat: 34.0600,
    pickupLng: -118.2437,
    dropoffLat: 34.0850,  // Much farther away
    dropoffLng: -118.1800
  };
  
  const result = await evaluateRouteMatch(driver, passenger);
  
  log(`\nResult: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`, result.isMatch ? 'green' : 'red');
  log(`Dropoff Distance: ${result.dropoffDetourMeters}m`);
  log(`Reason: ${result.reason}\n`);
  
  return result;
}

// ============================================
// TEST CASE 6: Insufficient Overlap - Should Reject
// ============================================
async function testInsufficientOverlap() {
  log('\n' + '='.repeat(60), 'bright');
  log('TEST 6: Insufficient Overlap (<30%)', 'cyan');
  log('='.repeat(60), 'bright');
  
  const driver = {
    startLat: 34.0400,
    startLng: -118.2437,
    endLat: 34.0600,
    endLng: -118.2437
  };
  
  const passenger = {
    startLat: 34.0550,
    startLng: -118.2437,
    endLat: 34.1000,
    endLng: -118.2437,
    pickupLat: 34.0570,
    pickupLng: -118.2437,
    dropoffLat: 34.0950,
    dropoffLng: -118.2437
  };
  
  const result = await evaluateRouteMatch(driver, passenger);
  
  log(`\nResult: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`, result.isMatch ? 'green' : 'red');
  log(`Overlap: ${result.overlapRatio}% (${result.overlapKm}km)`);
  log(`Reason: ${result.reason}\n`);
  
  return result;
}

// ============================================
// TEST CASE 7: Wrong Direction - Should Reject
// ============================================
async function testWrongDirection() {
  log('\n' + '='.repeat(60), 'bright');
  log('TEST 7: Pickup After Dropoff (Wrong Direction)', 'cyan');
  log('='.repeat(60), 'bright');
  
  const driver = {
    startLat: 34.0400,
    startLng: -118.2437,
    endLat: 34.0900,
    endLng: -118.2437
  };
  
  const passenger = {
    startLat: 34.0400,
    startLng: -118.2437,
    endLat: 34.0900,
    endLng: -118.2437,
    pickupLat: 34.0800,   // Dropoff is closer to start
    pickupLng: -118.2437,
    dropoffLat: 34.0500,  // Pickup is further along
    dropoffLng: -118.2437
  };
  
  const result = await evaluateRouteMatch(driver, passenger);
  
  log(`\nResult: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`, result.isMatch ? 'green' : 'red');
  log(`Reason: ${result.reason}\n`);
  
  return result;
}

// ============================================
// TEST CASE 8: Real World Example - LA to Long Beach
// ============================================
async function testRealWorld() {
  log('\n' + '='.repeat(60), 'bright');
  log('TEST 8: Real World - LA Downtown to Long Beach', 'cyan');
  log('='.repeat(60), 'bright');
  
  // Downtown LA
  const driver = {
    startLat: 34.0522,
    startLng: -118.2437,
    // Long Beach
    endLat: 33.7490,
    endLng: -118.1937
  };
  
  // Similar route but slightly different start/end
  const passenger = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 33.7490,
    endLng: -118.1937,
    // Pickup near start
    pickupLat: 34.0530,
    pickupLng: -118.2430,
    // Dropoff near end
    dropoffLat: 33.7480,
    dropoffLng: -118.1930
  };
  
  const result = await evaluateRouteMatch(driver, passenger);
  
  log(`\nResult: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`, result.isMatch ? 'green' : 'red');
  log(`Overlap: ${result.overlapRatio}% (${result.overlapKm}km)`);
  log(`Driver Route: ${result.details?.driverRouteKm}km`);
  log(`Passenger Route: ${result.details?.passengerRouteKm}km`);
  log(`Reason: ${result.reason}\n`);
  
  return result;
}

// ============================================
// TEST WITHOUT OSRM (Simple Straight Lines)
// ============================================
async function testWithoutOSRM() {
  log('\n' + '='.repeat(60), 'bright');
  log('TEST 9: Simple Routes (No OSRM)', 'cyan');
  log('='.repeat(60), 'bright');
  
  const driver = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 34.0852,
    endLng: -118.2437
  };
  
  const passenger = {
    startLat: 34.0522,
    startLng: -118.2437,
    endLat: 34.0852,
    endLng: -118.2437,
    pickupLat: 34.0600,
    pickupLng: -118.2437,
    dropoffLat: 34.0750,
    dropoffLng: -118.2437
  };
  
  // Pass useOSRM=false to use simple routes
  const result = await evaluateRouteMatch(driver, passenger, false);
  
  log(`\nResult: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`, result.isMatch ? 'green' : 'red');
  log(`Reason: ${result.reason}\n`);
  
  return result;
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  log('\n' + '#'.repeat(60), 'blue');
  log('# ADVANCED ROUTE MATCHING - COMPREHENSIVE TEST SUITE', 'blue');
  log('#'.repeat(60), 'blue');
  
  const results = [];
  
  try {
    results.push(await testSameRoute());
    results.push(await testParallelRoutes());
    results.push(await testPartialOverlap());
    results.push(await testPickupTooFar());
    results.push(await testDropoffTooFar());
    results.push(await testInsufficientOverlap());
    results.push(await testWrongDirection());
    results.push(await testRealWorld());
    results.push(await testWithoutOSRM());
    
    // Summary
    log('\n' + '='.repeat(60), 'bright');
    log('TEST SUMMARY', 'cyan');
    log('='.repeat(60), 'bright');
    
    const passed = results.filter(r => r.isMatch !== undefined).length;
    const matched = results.filter(r => r.isMatch === true).length;
    const rejected = results.filter(r => r.isMatch === false).length;
    
    log(`\nTests Completed: ${passed}`);
    log(`Matches Approved: ${matched}`, 'green');
    log(`Matches Rejected: ${rejected}`, 'red');
    log(`\nExpected Results:`, 'yellow');
    log(`  - Test 1 (Same Route): ✅ MATCH`, 'green');
    log(`  - Test 2 (Parallel): ❌ NO MATCH`, 'red');
    log(`  - Test 3 (Partial): ✅ MATCH`, 'green');
    log(`  - Test 4 (Pickup Far): ❌ NO MATCH`, 'red');
    log(`  - Test 5 (Dropoff Far): ❌ NO MATCH`, 'red');
    log(`  - Test 6 (Insufficient): ❌ NO MATCH`, 'red');
    log(`  - Test 7 (Wrong Dir): ❌ NO MATCH`, 'red');
    log(`  - Test 8 (Real World): ✅ MATCH`, 'green');
    log(`  - Test 9 (No OSRM): ✅ MATCH`, 'green');
    
    log('\n' + '#'.repeat(60), 'blue');
    log('Tests completed! Check console for detailed logs.', 'green');
    log('#'.repeat(60) + '\n', 'blue');
    
  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
    console.error(error.stack);
  }
}

// Export for use as module
module.exports = {
  testSameRoute,
  testParallelRoutes,
  testPartialOverlap,
  testPickupTooFar,
  testDropoffTooFar,
  testInsufficientOverlap,
  testWrongDirection,
  testRealWorld,
  testWithoutOSRM,
  runAllTests
};

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
