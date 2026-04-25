# Advanced Route Matching System - Complete Guide

## Overview

This route-matching system uses Turf.js spatial analysis and OSRM routing to determine whether a driver's route and passenger's route have meaningful geographic overlap. It performs comprehensive validation across 7 criteria before approving a match.

## Architecture

### Two Implementations

1. **Backend** (`advancedRouteMatching.js`)
   - Node.js implementation using npm packages
   - Use with Express/Socket.IO backend
   - Supports async OSRM calls with axios

2. **Client-Side** (`routeMatchingClient.js`)
   - Browser implementation using CDN-hosted Turf.js
   - Use with Leaflet.js + OpenStreetMap
   - Works in frontend without backend dependency

## Key Concepts

### Route Representation
Each route is a **GeoJSON LineString** with coordinates in `[lng, lat]` format (Turf.js standard).

Routes can be obtained two ways:
1. **OSRM Real Routing**: Actual road-following polylines
2. **Simple Straight Lines**: Direct point-to-point (fallback)

### Match Approval Criteria

A match is approved **ONLY** if ALL of these are true:

| Criterion | Requirement | Details |
|-----------|-------------|---------|
| **Intersection** | Optional check | Routes should intersect or have near-contact |
| **Path Overlap** | ≥30% | Overlapping path segments as % of passenger journey |
| **Pickup Proximity** | ≤500m | Passenger pickup within 500m buffer of driver route |
| **Dropoff Proximity** | ≤500m | Passenger dropoff within 500m buffer of driver route |
| **Direction** | Correct | Pickup appears before dropoff on driver's route |

### Configuration

```javascript
CONFIG = {
  OSRM_API: 'https://router.project-osrm.org/route/v1/driving',
  PICKUP_DROPOFF_BUFFER_M: 500,       // Can be adjusted
  OVERLAP_TOLERANCE_M: 25,             // Tolerance for line overlap
  MIN_OVERLAP_RATIO: 0.30,             // 30% minimum
  DIRECTION_TOLERANCE_DEG: 60,         // Direction tolerance (not currently used)
  REQUEST_TIMEOUT: 5000,               // 5 second timeout
};
```

## Output Format

All match results return a standardized JSON object:

```json
{
  "isMatch": true|false,
  "overlapKm": 2.5,
  "overlapRatio": 45.2,
  "pickupDetourMeters": 120,
  "dropoffDetourMeters": 85,
  "reason": "Routes share 45.2% path overlap (2.5km) with pickup and dropoff within 500m buffer",
  "details": {
    "intersects": true,
    "overlappingSegments": 2,
    "driverRouteKm": 5.5,
    "passengerRouteKm": 5.52,
    "pickupNearestPoint": [-118.243, 34.051],
    "dropoffNearestPoint": [-118.242, 34.075]
  }
}
```

## Backend Usage (Node.js)

### Installation

```bash
cd car-pulling-backend
npm install @turf/turf axios
```

### Basic Example

```javascript
const { evaluateRouteMatch } = require('./src/utils/advancedRouteMatching');

// Define routes
const driverRoute = {
  startLat: 34.052235,
  startLng: -118.243683,
  endLat: 34.084261,
  endLng: -118.243683
};

const passengerRoute = {
  startLat: 34.052235,
  startLng: -118.243683,
  endLat: 34.084261,
  endLng: -118.243683,
  pickupLat: 34.060000,
  pickupLng: -118.243683,
  dropoffLat: 34.075000,
  dropoffLng: -118.243683
};

// Evaluate match (with OSRM)
const result = await evaluateRouteMatch(driverRoute, passengerRoute, true);

if (result.isMatch) {
  console.log('✅ MATCH APPROVED');
  console.log(`Overlap: ${result.overlapRatio}% (${result.overlapKm}km)`);
} else {
  console.log('❌ No match:', result.reason);
}
```

### In Express Routes

```javascript
const express = require('express');
const { evaluateRouteMatch } = require('../utils/advancedRouteMatching');

router.post('/api/evaluate-match', async (req, res) => {
  try {
    const { driverRoute, passengerRoute } = req.body;
    
    const result = await evaluateRouteMatch(driverRoute, passengerRoute, true);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### In Socket.IO Real-time Matching

```javascript
io.on('connection', (socket) => {
  socket.on('check-match', async (data) => {
    const result = await evaluateRouteMatch(
      data.driverRoute,
      data.passengerRoute
    );
    
    socket.emit('match-result', result);
  });
});
```

## Client-Side Usage (Leaflet.js)

### HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Leaflet -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  
  <!-- Turf.js -->
  <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
  
  <!-- Route Matching -->
  <script src="routeMatchingClient.js"></script>
</head>
<body>
  <div id="map" style="height: 600px;"></div>
  
  <script>
    // Initialize map
    const map = L.map('map').setView([34.0522, -118.2437], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    // Use the matching functions
  </script>
</body>
</html>
```

### Client Example

```javascript
// Initialize map
const map = L.map('map').setView([34.0522, -118.2437], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Define routes
const driver = {
  startLat: 34.052235,
  startLng: -118.243683,
  endLat: 34.084261,
  endLng: -118.243683
};

const passenger = {
  startLat: 34.052235,
  startLng: -118.243683,
  endLat: 34.084261,
  endLng: -118.243683,
  pickupLat: 34.060000,
  pickupLng: -118.243683,
  dropoffLat: 34.075000,
  dropoffLng: -118.243683
};

// Evaluate match
const result = await evaluateRouteMatch(driver, passenger);

// Handle result
if (result.isMatch) {
  document.getElementById('status').innerHTML = `
    ✅ Match Approved!<br>
    Overlap: ${result.overlapRatio}%<br>
    Distance: ${result.overlapKm}km<br>
    Pickup detour: ${result.pickupDetourMeters}m<br>
    Dropoff detour: ${result.dropoffDetourMeters}m
  `;
} else {
  document.getElementById('status').innerHTML = `❌ ${result.reason}`;
}
```

### Visualization with Leaflet

```javascript
// Get route geometries
const driverLine = await getOSRMRoute(
  driver.startLat, driver.startLng,
  driver.endLat, driver.endLng
);

const passengerLine = await getOSRMRoute(
  passenger.startLat, passenger.startLng,
  passenger.endLat, passenger.endLng
);

const overlapFeatures = findOverlapSegments(driverLine, passengerLine);

// Visualize on map
visualizeMatch(map, driverLine, passengerLine, overlapFeatures);

// Add markers
L.circleMarker([passenger.pickupLat, passenger.pickupLng], {
  radius: 8,
  color: 'green'
}).bindPopup('Pickup').addTo(map);

L.circleMarker([passenger.dropoffLat, passenger.dropoffLng], {
  radius: 8,
  color: 'red'
}).bindPopup('Dropoff').addTo(map);
```

## Key Turf.js Functions Used

### turf.lineString()
Creates a GeoJSON LineString from coordinate array.
```javascript
const line = turf.lineString([[lng1, lat1], [lng2, lat2]]);
```

### turf.lineIntersects()
Checks if two lines intersect.
```javascript
const intersects = turf.lineIntersects(line1, line2);  // Boolean
```

### turf.lineOverlap()
Finds overlapping segments between two lines.
```javascript
const overlap = turf.lineOverlap(line1, line2, { tolerance: 0.025 });
// Returns FeatureCollection of overlapping segments
```

### turf.length()
Calculates length of a line.
```javascript
const distanceKm = turf.length(line, { units: 'kilometers' });
```

### turf.nearestPointOnLine()
Finds nearest point on a line to a given point.
```javascript
const nearest = turf.nearestPointOnLine(line, point);
// Properties: dist (km), location (distance along line)
```

## OSRM Integration

The system uses Open Source Routing Machine (OSRM) for real road-following routes.

### OSRM API Endpoint
```
https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson
```

### Example Response
```json
{
  "routes": [
    {
      "geometry": {
        "type": "LineString",
        "coordinates": [[lng, lat], [lng, lat], ...]
      },
      "distance": 5200,
      "duration": 420
    }
  ]
}
```

### Fallback Behavior
If OSRM fails or times out (5 seconds):
- System falls back to simple straight-line route
- Matching still works but less accurate
- No errors or warnings to user

## Debugging

### Enable Detailed Logging

All functions log to console with prefixes:
- `[OSRM]` - Routing calls
- `[INTERSECT]` - Intersection checks
- `[OVERLAP]` - Overlap detection
- `[PICKUP]` - Pickup proximity
- `[DROPOFF]` - Dropoff proximity
- `[DIRECTION]` - Direction verification
- `[MATCHING]` - Overall matching flow

### Example Console Output

```
[MATCHING] ========== START ROUTE EVALUATION ==========
[MATCHING] Step 1: Fetching route geometries...
[OSRM] Fetching route: (34.052235, -118.243683) → (34.084261, -118.243683)
[OSRM] ✅ Route fetched: 5.52km, 127 points
[MATCHING] Step 2: Checking route intersection...
[INTERSECT] Lines DO intersect
[MATCHING] Step 3: Finding overlapping segments...
[OVERLAP] Found 1 overlapping segment(s)
[OVERLAP-DIST] Total overlap: 5.20km
[OVERLAP-RATIO] 5.20km / 5.52km = 94.2%
[PICKUP] Distance from route: 120.5m - ✅ PASS
[DROPOFF] Distance from route: 85.2m - ✅ PASS
[DIRECTION] ✅ Correct order
[MATCHING] ✅ ALL CHECKS PASSED - MATCH APPROVED
```

## Performance Considerations

### Network Calls
- OSRM requests: ~200-500ms per call
- 2 calls per match evaluation (driver + passenger)
- Timeouts after 5 seconds

### Spatial Calculations
- Line overlap: ~10-50ms
- Proximity checks: ~5-10ms each
- Direction verification: <1ms

### Total Time
- With OSRM: 500-1000ms
- Without OSRM: 20-100ms

## Testing

### Test Case: Simple Same-Route Match
```javascript
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

// Expected: isMatch = true, overlapRatio ≈ 100%
```

### Test Case: Parallel Routes (No Overlap)
```javascript
const driver = {
  startLat: 34.0522,
  startLng: -118.2437,
  endLat: 34.0852,
  endLng: -118.2437
};

const passenger = {
  startLat: 34.0522,
  startLng: -118.1837,  // Different longitude
  endLat: 34.0852,
  endLng: -118.1837,
  pickupLat: 34.0600,
  pickupLng: -118.1837,
  dropoffLat: 34.0750,
  dropoffLng: -118.1837
};

// Expected: isMatch = false, reason = "No route overlap"
```

### Test Case: Too Far Detour
```javascript
// Driver route is direct
// Passenger pickup/dropoff are >500m away
// Expected: isMatch = false, reason = "pickup/dropoff outside buffer"
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid input: missing route data` | Incomplete route object | Verify all required fields present |
| `Matching engine error` | Turf.js processing error | Check coordinates are valid lat/lng |
| `No route overlap detected` | Routes don't share path | Check routes actually travel together |
| `OSRM timeout` | Network/API slow | Falls back to straight lines |

### Graceful Degradation
- If OSRM fails, falls back to straight-line geometry
- If Turf operation fails, returns false for that check
- Never crashes; always returns standardized error format

## Integration Checklist

- [ ] Install Turf.js (`npm install @turf/turf`)
- [ ] Import route matching functions
- [ ] Define driver and passenger routes
- [ ] Call `evaluateRouteMatch()`
- [ ] Handle result (approve/reject match)
- [ ] Log match metrics for analytics
- [ ] Display reason to user if rejected
- [ ] Show map visualization if client-side
- [ ] Add error handling
- [ ] Test with real coordinates

## Performance Tips

1. **Cache routes** - Store OSRM results to avoid repeated calls
2. **Batch matching** - Process multiple matches in parallel
3. **Simple mode first** - Use useOSRM=false for quick screening
4. **Adjust tolerances** - Lower OVERLAP_TOLERANCE_M for stricter matching
5. **Geographic filtering** - Pre-filter far-apart routes before matching

## References

- [Turf.js Documentation](https://turfjs.org/)
- [OSRM API](https://router.project-osrm.org/)
- [GeoJSON Spec](https://geojson.org/)
- [Leaflet.js](https://leafletjs.com/)
