#!/usr/bin/env node

/**
 * Real-time Location Tracking Verification Script
 *
 * This script verifies that all components of the real-time location tracking system are properly implemented.
 * Run this after starting the backend to verify the system is ready.
 */

const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('Real-time Location Tracking Verification');
console.log('========================================\n');

const checks = [];

// Check 1: trip-service.js has location emission
console.log('📋 Checking trip-service.js...');
const tripServicePath = path.join(__dirname, 'trip-service.js');
if (fs.existsSync(tripServicePath)) {
  const content = fs.readFileSync(tripServicePath, 'utf8');
  const hasEmit = content.includes("window.socket.emit('update-location'");
  const hasActiveTrip = content.includes("localStorage.getItem('activeTrip')");
  checks.push({
    name: 'trip-service.js - Socket emission',
    passed: hasEmit && hasActiveTrip,
    details: `Socket emit: ${hasEmit ? '✅' : '❌'}, Active trip check: ${hasActiveTrip ? '✅' : '❌'}`
  });
} else {
  checks.push({
    name: 'trip-service.js',
    passed: false,
    details: 'File not found'
  });
}

// Check 2: AddRide-Connected.html has location tracking start
console.log('📋 Checking AddRide-Connected.html...');
const addRidePath = path.join(__dirname, 'AddRide-Connected.html');
if (fs.existsSync(addRidePath)) {
  const content = fs.readFileSync(addRidePath, 'utf8');
  const hasStartTracking = content.includes('LocationService.startLocationTracking()');
  const hasStopTracking = content.includes('LocationService.stopLocationTracking()');
  checks.push({
    name: 'AddRide-Connected.html - Location tracking lifecycle',
    passed: hasStartTracking && hasStopTracking,
    details: `Start: ${hasStartTracking ? '✅' : '❌'}, Stop: ${hasStopTracking ? '✅' : '❌'}`
  });
} else {
  checks.push({
    name: 'AddRide-Connected.html',
    passed: false,
    details: 'File not found'
  });
}

// Check 3: Dashboard-Connected.html has listener
console.log('📋 Checking Dashboard-Connected.html...');
if (fs.existsSync(addRidePath.replace('AddRide', 'Dashboard'))) {
  const content = fs.readFileSync(addRidePath.replace('AddRide', 'Dashboard'), 'utf8');
  const hasListener = content.includes("socket.on('driver-location-update'");
  const hasUpdateFunction = content.includes('function updatePickupDistances');
  checks.push({
    name: 'Dashboard-Connected.html - Location listener & updater',
    passed: hasListener && hasUpdateFunction,
    details: `Listener: ${hasListener ? '✅' : '❌'}, Update function: ${hasUpdateFunction ? '✅' : '❌'}`
  });
} else {
  checks.push({
    name: 'Dashboard-Connected.html',
    passed: false,
    details: 'File not found'
  });
}

// Check 4: server.js has broadcast
console.log('📋 Checking server.js...');
const serverPath = path.join(__dirname, 'car-pulling-backend/src/server.js');
if (fs.existsSync(serverPath)) {
  const content = fs.readFileSync(serverPath, 'utf8');
  const hasBroadcast = content.includes("io.emit('driver-location-update'");
  const hasListener = content.includes("socket.on('update-location'");
  checks.push({
    name: 'server.js - Socket broadcasting',
    passed: hasBroadcast && hasListener,
    details: `Broadcast: ${hasBroadcast ? '✅' : '❌'}, Listener: ${hasListener ? '✅' : '❌'}`
  });
} else {
  checks.push({
    name: 'server.js',
    passed: false,
    details: 'File not found'
  });
}

// Print results
console.log('\n========== VERIFICATION RESULTS ==========\n');
let allPassed = true;
checks.forEach((check, index) => {
  const status = check.passed ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  console.log(`   ${check.details}\n`);
  if (!check.passed) allPassed = false;
});

console.log('==========================================\n');

if (allPassed) {
  console.log('✅ All checks passed! Real-time location tracking is properly implemented.\n');
  console.log('Next steps:');
  console.log('1. Start the backend: npm start (in car-pulling-backend directory)');
  console.log('2. Open AddRide-Connected.html as driver and create active trip');
  console.log('3. Open Dashboard-Connected.html as rider and search for rides');
  console.log('4. Monitor console for location updates');
  console.log('5. Verify pickup distance changes as driver moves\n');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the implementation.\n');
  process.exit(1);
}
