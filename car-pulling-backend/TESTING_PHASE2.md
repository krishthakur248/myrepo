# Phase 2: Authentication System - Testing Guide

## API Endpoints Available

### 1. **User Registration**
**POST** `http://localhost:5001/api/auth/register`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "password": "SecurePassword123",
  "userType": "both"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "userId",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "userType": "both",
    "rating": 5.0,
    "isActive": true
  }
}
```

---

### 2. **User Login**
**POST** `http://localhost:5001/api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

---

### 3. **Get User Profile** (Protected)
**GET** `http://localhost:5001/api/auth/profile`

**Headers:**
```
Authorization: Bearer <token_from_login>
```

**Response:**
```json
{
  "success": true,
  "user": { ... }
}
```

---

### 4. **Update User Profile** (Protected)
**PUT** `http://localhost:5001/api/auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "vehicle": "car",
  "vehicleNumber": "DL01AB1234",
  "vehicleColor": "black"
}
```

---

### 5. **Update Location** (Protected)
**PUT** `http://localhost:5001/api/auth/location`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "latitude": 28.7041,
  "longitude": 77.1025
}
```

---

### 6. **Find Nearby Drivers**
**POST** `http://localhost:5001/api/users/nearby-drivers`

**Request Body:**
```json
{
  "latitude": 28.7041,
  "longitude": 77.1025,
  "maxDistance": 5
}
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "drivers": [
    {
      "_id": "driverId",
      "firstName": "Raj",
      "lastName": "Kumar",
      "rating": 4.8,
      "vehicle": "car",
      "currentLocation": {
        "type": "Point",
        "coordinates": [77.1035, 28.7045]
      }
    }
  ]
}
```

---

### 7. **Change Password** (Protected)
**POST** `http://localhost:5001/api/auth/change-password`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

---

## Testing with Postman or cURL

### Quick Test - Register a User
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "+911234567890",
    "password": "TestPass123"
  }'
```

### Quick Test - Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

### Quick Test - Get Profile (with token from login)
```bash
curl -X GET http://localhost:5001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Key Features Implemented

✅ **User Registration** - Create new account with validation
✅ **User Login** - Secure login with JWT tokens
✅ **Password Hashing** - Bcrypt encryption for security
✅ **Profile Management** - Get and update user profile
✅ **Location Tracking** - Real-time location updates
✅ **Driver Verification** - Vehicle and license info
✅ **Rating System** - User ratings and reviews
✅ **Account Security** - Token-based authentication
✅ **Password Change** - Secure password updates

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Please provide all required fields..."
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided. Please login first."
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Email already registered"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Error during login",
  "error": "..."
}
```

---

## Database Schema Stored

Each user stored with:
- Personal info (name, email, phone)
- Hashed password (bcrypt)
- Account status (active/blocked)
- Driver info (vehicle, license, color)
- Rating (1-5 stars)
- Location (GeoJSON format for GPS tracking)
- Verification status (phone, ID)
- Timestamps (created, updated)

---

## Next Steps: Phase 3

GPS & Route Matching:
- Real-time GPS tracking
- Route overlap detection
- Match suggestions algorithm
- Trip creation and management
