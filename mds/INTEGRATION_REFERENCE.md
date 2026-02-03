# Frontend Integration - Files Reference

## 📁 Project Structure

```
c:\Users\Asus\Desktop\UI_IP\
├── car-pulling-backend/          [Backend Server]
│   ├── src/
│   │   ├── server.js             [Main server - PORT 5001]
│   │   ├── config/
│   │   │   └── database.js        [MongoDB connection]
│   │   ├── models/
│   │   │   ├── User.js           [User schema]
│   │   │   ├── Trip.js           [Trip schema]
│   │   │   └── Message.js        [Message schema]
│   │   ├── controllers/
│   │   │   ├── auth.controller.js [Auth logic]
│   │   │   └── user.controller.js [User logic]
│   │   ├── routes/
│   │   │   ├── auth.routes.js     [Auth endpoints]
│   │   │   └── user.routes.js     [User endpoints]
│   │   ├── middleware/
│   │   │   └── auth.js            [JWT verification]
│   │   └── utils/
│   │       └── helpers.js         [Utility functions]
│   ├── .env                       [Environment variables]
│   ├── package.json              [Dependencies]
│   └── README.md
│
├── [FRONTEND - Static HTML + JS]
│
├── api-client.js                 [HTTP client for API]
├── auth-service.js               [Auth helper functions]
├── trip-service.js               [GPS & trip functions]
│
├── Login-Connected.html          [✅ Login/Signup - CONNECTED]
├── Dashboard-Connected.html      [✅ Dashboard - CONNECTED]
├── AddRide-Connected.html        [⏳ Coming soon]
├── Details-Connected.html        [⏳ Coming soon]
│
├── [ORIGINAL FILES - Not modified]
├── Login.html
├── Dashboard.html
├── AddRide.html
├── Details.html
│
├── TESTING_FRONTEND_INTEGRATION.md  [This file]
└── server.js (Old - in root)
```

## 🔗 What's Connected

| Page | Backend Calls | Status |
|------|---------------|--------|
| **Login-Connected.html** | Register, Login | ✅ Complete |
| **Dashboard-Connected.html** | Profile, Location, Drivers | ✅ Complete |
| **AddRide-Connected.html** | Trip creation | ⏳ Next |
| **Details-Connected.html** | Trip details, Match | ⏳ Next |

## 📝 Files You Created

### JavaScript Libraries (Reusable)

#### 1. **api-client.js**
```javascript
// Makes HTTP requests to backend API
// Handles authentication tokens
// Manages errors

Usage:
apiClient.get('/auth/profile')
apiClient.post('/auth/login', {email, password})
apiClient.put('/auth/location', {latitude, longitude})
```

#### 2. **auth-service.js**
```javascript
// Authentication helpers
// User management
// Notifications

Usage:
AuthService.register({...formData})
AuthService.login(email, password)
AuthService.logout()
AuthService.getCurrentUser()
AuthService.isAuthenticated()
```

#### 3. **trip-service.js**
```javascript
// GPS/Location functions
// Trip queries
// Distance calculations

Usage:
TripService.getNearbyDrivers(lat, lon, maxDistance)
LocationService.getCurrentLocation()
LocationService.startLocationTracking()
LocationService.calculateDistance(lat1, lon1, lat2, lon2)
```

## 🎯 Connected Pages

### Login-Connected.html
**Features:**
- ✅ User Registration
- ✅ User Login
- ✅ Tab switching (Login/Signup)
- ✅ Password visibility toggle
- ✅ Form validation
- ✅ Error messages
- ✅ Loading states

**Backend Endpoints Used:**
```
POST /api/auth/register
POST /api/auth/login
```

**Stores in Browser:**
- `authToken` - JWT token in localStorage
- `user` - User object in localStorage

### Dashboard-Connected.html
**Features:**
- ✅ Welcome message with user name
- ✅ Display user profile info
- ✅ Location sharing with browser GPS
- ✅ Find nearby drivers
- ✅ Real-time location updates
- ✅ Error handling & notifications

**Backend Endpoints Used:**
```
GET /api/auth/profile
PUT /api/auth/location
POST /api/users/nearby-drivers
```

**Displays:**
- User name, email, phone
- Rating and total rides
- Account type
- Live location coordinates
- List of nearby drivers with info

## 🔒 How Authentication Works

```
1. User registers/logs in on Login-Connected.html
   ↓
2. Frontend sends credentials to backend
   ↓
3. Backend creates JWT token and returns it
   ↓
4. Frontend saves token to localStorage
   ↓
5. All future requests include token in Authorization header
   ↓
6. Backend verifies token before processing request
   ↓
7. If token expired, user redirected to login
```

## 📍 How Location Tracking Works

```
1. User clicks "Share Location" button
   ↓
2. Browser requests permission to access GPS
   ↓
3. Browser returns latitude & longitude
   ↓
4. Frontend sends to backend via API
   ↓
5. Backend saves to MongoDB with GeoJSON format
   ↓
6. Frontend displays coordinates on screen
```

## 🔍 How Nearby Drivers Search Works

```
1. User clicks "Find a Ride" button
   ↓
2. Get user's current location (latitude, longitude)
   ↓
3. Send location to backend API
   ↓
4. Backend queries MongoDB with geospatial query
   ↓
5. MongoDB finds all drivers within 5km radius
   ↓
6. Backend returns list of drivers
   ↓
7. Frontend displays drivers with:
   - Name
   - Rating
   - Vehicle info
   - Distance
   - Contact button
```

## 💾 Database Schema (MongoDB)

### Users Collection
```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  currentLocation: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  userType: "driver" | "rider" | "both",
  vehicle: "car" | "bike" | "ev",
  rating: Number (0-5),
  totalRides: Number,
  phoneVerified: Boolean,
  idVerified: Boolean,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Starting the System

### Terminal 1 - Start Backend Server
```powershell
cd c:\Users\Asus\Desktop\UI_IP\car-pulling-backend
node src/server.js

# Expected output:
# ╔════════════════════════════════════╗
# ║  🚗 Car Pulling Backend Server 🚗  ║
# ╠════════════════════════════════════╣
# ║ Server running on: http://localhost:5001
# ║ Environment: development
# ║ MongoDB: Connected ✓
# ╚════════════════════════════════════╝
```

### Browser - Open Frontend
```
File → Open File
Navigate to: C:/Users/Asus/Desktop/UI_IP/Login-Connected.html
```

## 🧪 Quick Test Commands (PowerShell)

### Test Backend is Running
```powershell
curl http://localhost:5001/api/health
```

### Register User
```powershell
$json = @{
    firstName = "Test"
    lastName = "User"
    email = "test@example.com"
    phone = "+911234567890"
    password = "TestPass123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5001/api/auth/register" `
  -Method POST -Body $json -ContentType "application/json"
```

### Login
```powershell
$json = @{
    email = "test@example.com"
    password = "TestPass123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" `
  -Method POST -Body $json -ContentType "application/json"
```

## ✅ Checklist Before Moving to Phase 3

- [ ] Backend server is running on port 5001
- [ ] MongoDB is connected
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Dashboard loads with user data
- [ ] Can share location
- [ ] Can see nearby drivers
- [ ] No console errors
- [ ] Notifications display correctly
- [ ] All buttons are clickable

## 🎓 Learning Path

1. **Phase 1** ✅ - Backend setup & database
2. **Phase 2** ✅ - Authentication system
3. **Phase 6** ✅ - Frontend integration
4. **Phase 3** ⏳ - GPS & route matching
5. **Phase 4** ⏳ - Fare calculation
6. **Phase 5** ⏳ - Real-time messaging
7. **Phase 7** ⏳ - Testing & deployment

---

**Ready to test? Open Login-Connected.html and create an account! 🚀**
