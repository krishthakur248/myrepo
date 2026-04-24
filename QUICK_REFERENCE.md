# Quick Reference - Advanced Matching System Files

## 📁 Complete File List & Changes

### **NEW FILES** ✨

#### 1. `car-pulling-backend/src/utils/matchingEngine.js` (500+ lines)
**Purpose:** Core matching algorithm
```
├── Phase 1: H3 Hexagon Pre-Filter
│   └── getRouteHexagons(), phase1HexOverlap()
├── Phase 2: Precise Matching
│   ├── getSpatialOverlapSegment() - 50m buffer detection
│   ├── isSameDirection() - <45° bearing check
│   ├── calcBearing() - Turf bearing calculation
│   └── phase2PreciseMatch()
├── Utilities
│   ├── toLine() - Convert coords to Turf LineString
│   ├── calculateRouteLength() - Route distance
│   └── calculateFareSplit() - Fare breakdown
└── Main Export: matchRoutes()
```

#### 2. `matchingService.js` (400+ lines)
**Purpose:** Frontend Socket.IO + consent modal handler
```
├── MatchingService class
│   ├── initializeSocket() - Socket.IO setup
│   ├── startGpsStreaming() - GPS updates every 5s
│   ├── stopGpsStreaming()
│   ├── sendGpsUpdate() - Geolocation API
│   ├── handleMatchFound()
│   ├── showConsentModal() - 30s countdown
│   └── initializeConsentMap()
└── Global Functions
    ├── initializeMatchingService()
    └── acceptMatch()
```

---

### **MODIFIED FILES** 🔄

#### 1. `car-pulling-backend/package.json`
**Added Dependencies:**
```json
"@turf/turf": "^6.5.0"     // Line: added in dependencies
"h3-js": "^4.1.0"          // Line: added in dependencies
```

#### 2. `car-pulling-backend/src/controllers/trip.controller.js`
**Line 1:** Added import
```javascript
const { matchRoutes, calculateFareSplit } = require('../utils/matchingEngine');
```

**Lines 93-175:** Replaced `exports.findMatches` function
- OLD: Simple distance-based matching
- NEW: H3 + Turf advanced matching with:
  - Phase 1: H3 hexagon pre-filter (20 candidate trips max)
  - Phase 2: Precise Turf.js validation
  - Returns: matchScore, overlapDistanceKm, pickupPoint, dropoffPoint, fareSplit

#### 3. `car-pulling-backend/src/server.js`
**Lines 148-182:** Enhanced Socket.IO `update-location` handler
```javascript
// Added GPS route history storage
Trip.findByIdAndUpdate(tripId, {
  $push: { routeHistory: { latitude, longitude, timestamp } }
})
```

#### 4. `car-pulling-backend/src/models/Trip.js`
**Lines 47-60:** Added routeHistory field
```javascript
routeHistory: [
  {
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now }
  }
]
```

#### 5. `Dashboard-Connected.html`
**Line 533:** Added script reference
```html
<script src="matchingService.js"></script>
```

**Lines 870-930:** Enhanced `searchRides()` function
```javascript
// Added:
- matchingService.initializeSocket()
- matchingService.startGpsStreaming() after matches found
- Console logging with [SEARCH] and [GPS-STREAM] prefixes
- Enhanced loading message with progress indicators
```

---

## 🔍 Key Algorithms

### **H3 Hexagon Pre-Filter (Phase 1)**
```
Input: Driver route, Passenger route
Process:
  1. Convert all coords to H3 cells (resolution 9, ~174m)
  2. Get intersection of hexagon sets
  3. Check if shared cells >= MIN_SHARED_HEXAGONS (3)
Output: Boolean (continue to Phase 2 or skip this trip)
Speed: O(n) where n = route points
```

### **Turf.js Precise Matching (Phase 2)**
```
Input: Driver route, Passenger route (after Phase 1 passes)
Process:
  1. Buffer driver route by 50m
  2. Find passenger points within buffer
  3. Calculate bearing for both routes
  4. Check bearing difference < 45°
  5. Calculate overlap distance and quality score
Output: Match result with score (50-100%) or failure reason
Speed: O(n*m) where n,m = route points
```

### **GPS Streaming**
```
Frequency: Every 5 seconds (configurable in matchingService.js line 18)
Method:
  1. navigator.geolocation.getCurrentPosition()
  2. Socket.emit('update-location', { tripId, latitude, longitude })
  3. Backend stores in Trip.routeHistory
  4. Next search uses updated route
Storage: MongoDB Document → Trip._id → routeHistory array
Limit: No hard limit, but ~200 points typical for 30-min trip
```

### **Consent Modal Countdown**
```
Duration: 30 seconds
Update Frequency: Every 1 second
Features:
  - Leaflet map with pickup/dropoff markers
  - Driver profile + rating
  - Match score percentage
  - Overlap distance display
  - Discounted fare calculation
  - Auto-close after 30 seconds
Auto-decline: Removes modal, stops GPS streaming
```

---

## 🔗 API Endpoint Changes

### **POST /api/trips/find-matches** (UPDATED)

**Request (unchanged):**
```json
{
  "pickupLocation": [77.1025, 28.7041],
  "dropoffLocation": [77.0812, 28.7234],
  "maxDistance": 5,
  "timeWindow": 30
}
```

**Response (ENHANCED):**
```json
{
  "success": true,
  "message": "Found 3 matching trips",
  "matches": [
    {
      "_id": "trip123",
      "matchScore": 92,              // NEW: 50-100% match quality
      "overlapDistanceKm": "2.45",   // NEW: overlap length
      "pickupPoint": [28.7041, 77.1025],  // NEW: overlap start
      "dropoffPoint": [28.7234, 77.0812], // NEW: overlap end
      "fareSplit": {                  // NEW: fare breakdown
        "passengerPays": "35.40",
        "driverEarns": "35.40",
        "overlapKm": "2.45",
        "shareRatio": "49.0%",
        "discount": "30%"
      },
      "driver": {...},
      "baseFare": 100,
      "vehicle": "car",
      ...oldFields...
    }
  ]
}
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│          RIDER SEARCHES FOR RIDES                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend: searchRides()                                 │
│  - Gets user location                                   │
│  - Gets destination from map                            │
│  - Calls TripServiceAPI.findMatches()                   │
│  - Initializes matchingService socket                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼ API Call
┌─────────────────────────────────────────────────────────┐
│  Backend: POST /api/trips/find-matches                  │
│  - Find candidates via MongoDB geospatial query (5km)   │
│  - Loop through each candidate                          │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
   PHASE 1: H3        PHASE 2: Turf.js
   ✓ Passes?          ✓ Passes?
   │                  │
   └────── NO ────── ✗ Skip this trip
   │                  │
   ▼                  ▼
 PHASE 2            Return matched trip with:
   │                - matchScore (50-100%)
   └───────────────▶ - overlapDistanceKm
                     - fareSplit
                     │
                     ▼
         ┌──────────────────────────┐
         │ Sort by matchScore DESC  │
         │ Return top 3-10 matches  │
         └────────────┬─────────────┘
                      │
                      ▼
         ┌──────────────────────────┐
         │ Frontend: displayRides() │
         │ - Show matches list      │
         │ - Sorted by score       │
         │ - Mark #1 as "Best"     │
         │ - Start GPS streaming   │
         └────────────┬─────────────┘
                      │
                      ▼ User clicks Accept
         ┌──────────────────────────┐
         │ Show 30-sec Consent      │
         │ Modal with:              │
         │ - Driver profile         │
         │ - Match score            │
         │ - Map preview            │
         │ - Countdown timer        │
         └────────────┬─────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
      ACCEPT                     DECLINE
         │                         │
         ├──────► Join Trip ◄──────┘
         │
         ▼
   Continue GPS Streaming
   Every 5 seconds:
   Socket.emit('update-location')
         │
         ▼
   Backend stores in Trip.routeHistory
         │
         ▼
   Next search uses updated route
```

---

## 🔧 Configuration Values

**Can be customized in matchingEngine.js:**

| Setting | Current | Location | Purpose |
|---------|---------|----------|---------|
| H3_RESOLUTION | 9 | Line 13 | Hexagon size (~174m cells) |
| MIN_SHARED_HEXAGONS | 3 | Line 14 | Min overlapping hexagons |
| BUFFER_KM | 0.05 | Line 60 | Spatial overlap buffer (50m) |
| DIRECTION_THRESHOLD | 45 | Line 107 | Max bearing diff in degrees |

**Can be customized in matchingService.js:**

| Setting | Current | Location | Purpose |
|---------|---------|----------|---------|
| updateInterval | 5000 | Line 18 | GPS send frequency (5 sec) |
| Consent timeout | 30000 | Line 312 | Consent modal duration |
| Max candidates | 20 | trip.controller.js line 165 | Max trips to check |

---

## 🧪 Testing Commands

### **Backend Test (curl)**
```bash
# Find matches
curl -X POST http://localhost:5000/api/trips/find-matches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pickupLocation": [77.1025, 28.7041],
    "dropoffLocation": [77.0812, 28.7234]
  }'
```

### **Frontend Test (console)**
```javascript
// Check Socket.IO connection
matchingService.socket.connected  // Should be true

// Check GPS streaming
matchingService.isGpsStreaming    // Should be true after search

// Manually send GPS update
matchingService.sendGpsUpdate()   // Logs: [GPS-STREAM] Sent location

// Force consent modal (for testing)
matchingService.showConsentModal({
  _id: 'test123',
  matchScore: 85,
  driver: { firstName: 'Test', rating: 4.8 },
  vehicle: 'car',
  baseFare: 100
})
```

---

## 📝 Git Commit Message Template

```
feat: Add advanced route matching engine with H3 + Turf.js

- Implement Phase 1: H3 hexagon pre-filtering (3+ shared cells required)
- Implement Phase 2: Turf.js spatial + direction validation
  * 50m buffer for overlap detection
  * 45° bearing threshold for same-direction check
- Add Socket.IO GPS streaming (every 5 seconds)
- Add 30-second consent modal with countdown timer
- Enhanced match response with overlapDistanceKm and fareSplit
- Store route history in Trip model for iterative improvement

Files changed:
- NEW: matchingEngine.js (500 lines)
- NEW: matchingService.js (400 lines)
- UPD: trip.controller.js (findMatches)
- UPD: server.js (Socket.IO handler)
- UPD: Trip.js (routeHistory field)
- UPD: Dashboard-Connected.html (script ref)

Dependencies added:
- @turf/turf@^6.5.0
- h3-js@^4.1.0
```

---

**Complete Advanced Matching System Deployed! 🎉**

