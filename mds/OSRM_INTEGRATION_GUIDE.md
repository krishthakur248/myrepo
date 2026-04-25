# OSRM Integration Testing Guide

## What Changed
✅ **Before:** Trips stored only pickup/dropoff coordinates (straight line)
✅ **Now:** Trips automatically fetch real road route via OSRM and store waypoints

---

## Testing Workflow

### Step 1: Wait for Render Deployment (2-3 minutes)
- Go to: https://dashboard.render.com
- Find your backend service
- Wait for green status = deployment complete

### Step 2: Clear Database
```bash
# In Render Logs, you should see:
✅ MongoDB Connected: cluster0-shard-00-01.gmel6.mongodb.net
```

### Step 3: Test Case Setup

**User A (Driver):**
- Login with first account
- Accept permissions
- Go to Dashboard → "Offer a Ride"
- Create Trip:
  - **Pickup:** Delhi location (you can use: 30.8383, 76.9422)
  - **Dropoff:** Another Delhi location (you can use: 30.8036, 76.9159)
  - **Available Seats:** 2
  - Click "Create Trip"

**What to look for in Render Logs:**
```
[START-TRIP] 📍 Driver: [Driver Name]
[START-TRIP] Pickup: [76.9422,30.8383]
[START-TRIP] Dropoff: [76.9159,30.8036]
[START-TRIP] 🗺️  Fetching real road route from OSRM...
[OSRM] Requesting route: https://router.project-osrm.org/route/v1/driving/...
[OSRM] ✅ Route found with 11 waypoints        ← KEY LINE!
[OSRM] Distance: 4.92 km
[OSRM] Duration: 4.54 minutes
[START-TRIP] ✅ Trip created: [TRIP-CODE]
[START-TRIP] Route waypoints stored: 11       ← NOW HAVE REAL ROUTE!
```

**If you see this, Step 3 is successful! ✅**

---

### Step 4: Test Case Search (Rider Searching)

**User B (Rider - DIFFERENT ACCOUNT):**
- Logout User A
- Login as second account
- Accept permissions
- Go to Dashboard → "Search Rides"
- Enter Search:
  - **Pickup:** Same/similar location (30.8360, 76.9384)
  - **Dropoff:** Similar location (30.8120, 76.9176)
  - Click "Search Rides"

**What to look for in Render Logs:**
```
🚀🚀🚀 ========== FIND-MATCHES ENDPOINT CALLED ==========
[FIND-MATCHES] Database query results:
  Max distance: 5000m
  Candidate trips found: 1
  ✅ Candidate [TRIP-ID]: Driver Name
     Pickup: [76.9422,30.8383]
     Dropoff: [76.9159,30.8036]

--- Trip [TRIP-ID] ---
Driver Route (11 points):                    ← NOW USING 11 REAL WAYPOINTS!
  [0] [30.83873, 76.94232]
  [1] [30.83893, 76.94074]
  [2] [30.83599, 76.93848]
  ... and 8 more points
Rider Route:
  [0] [30.83600, 76.93840]
  [1] [30.81200, 76.91760]
routeHistory points: 11                      ← KEY: Now has real points!

[PHASE-1] ✅ PASSED
[PHASE-2] ✅ PASSED
✅ MATCHED TRIP
```

**Expected Result:**
- Rider should see trip in search results
- Match should show pickup and dropoff points
- Fare should be calculated with 30% discount

---

## Key Improvements

### Before OSRM
```
Driver Route:
  [0] Pickup: 30.8383, 76.9422 (straight line)
  [1] Dropoff: 30.8036, 76.9159

Rider at 30.8360, 76.9384 searching for ride → NO MATCH
❌ Reason: Straight line doesn't match rider's actual needs
```

### After OSRM
```
Driver Route (11 points following real roads):
  [0] 30.83873, 76.94232
  [1] 30.83893, 76.94074
  [2] 30.83599, 76.93848  ← Rider's location is close to waypoint [2]!
  [3] 30.82815, 76.93008
  ... more waypoints
  [10] 30.80360, 76.91590 (dropoff)

Rider at 30.8360, 76.9384 searching → ✅ MATCHED!
Reason: Rider's pickup is within 500m buffer of real route waypoints
```

---

## Debug Commands

### Check Trip Details
If you need to verify a trip's route:
```bash
GET /api/trips/debug/active-trips

Response will show:
{
  "_id": "trip-id",
  "driver": {...},
  "pickupLocation": {...},
  "dropoffLocation": {...},
  "routeHistory": [
    {"latitude": 30.83873, "longitude": 76.94232, "timestamp": "..."},
    {"latitude": 30.83893, "longitude": 76.94074, "timestamp": "..."},
    ... 11 total points
  ]
}
```

### Test OSRM Directly
```bash
curl "https://router.project-osrm.org/route/v1/driving/76.9422,30.8383;76.9159,30.8036?geometries=geojson"
```

---

## Troubleshooting

### Issue: "OSRM failed, falling back to pickup/dropoff only"
**Cause:** OSRM API not reachable
**Fix:** Check if internet is working, OSRM server may be down (rare)
**Fallback:** Route will still work with just 2 points

### Issue: Still getting 0 matches after testing
1. Check `routeHistory` has waypoints: `GET /api/trips/debug/active-trips`
2. Verify pickup/dropoff are valid coordinates
3. Check if rider location is within 500m of route
4. Look for Phase 1/Phase 2 logs in Render logs

### Issue: "Route found with 2 waypoints"
**Normal:** If locations are very close, OSRM may return minimal waypoints
**Still works:** Matching will use all available waypoints

---

## Success Criteria ✅

- [ ] Driver creates trip → See OSRM logs with waypoints
- [ ] routeHistory has 11+ points (not just 2)
- [ ] Rider searches → Matches appear in results
- [ ] Matching logs show Phase 1 & Phase 2 passing
- [ ] Rider can see matched trips with estimated fares
- [ ] Multiple riders searching → Different matches for different routes

---

## Expected Logs Pattern

**Creating Trip (Driver Side):**
```
[START-TRIP] 🗺️  Fetching real road route from OSRM...
[OSRM] ✅ Route found with 11 waypoints
[START-TRIP] Route waypoints stored: 11
```

**Searching Trips (Rider Side):**
```
Driver Route (11 points):
  [0] [30.83873, 76.94232]
  [1] [30.83893, 76.94074]
  ...
[PHASE-1] ✅ PASSED
[PHASE-2] ✅ PASSED
✅ MATCHED TRIP
```

If you see these patterns, OSRM integration is working! 🎉
