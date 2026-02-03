# Frontend Integration Testing Guide

## 🚀 Quick Start - Test the Integration

Your backend is running on `http://localhost:5001`

### Step 1: Open the Connected Login Page

Open this URL in your browser:
```
file:///C:/Users/Asus/Desktop/UI_IP/Login-Connected.html
```

Or if that doesn't work, open the file directly from your file system.

### Step 2: Create a New Account

Fill in the form:
- **First Name:** John
- **Last Name:** Doe
- **Email:** john@example.com
- **Phone:** +919876543210
- **Password:** SecurePass123

Click **"Create Account"**

### Step 3: Login

After successful registration, you'll be redirected to Dashboard.
If not, go back to login and enter:
- **Email:** john@example.com
- **Password:** SecurePass123

### Step 4: Dashboard

Once logged in, you'll see:
- ✅ Welcome message with your name
- ✅ Your profile information
- ✅ Location status
- ✅ Quick action buttons
- ✅ Nearby drivers list

### Step 5: Share Your Location

Click "Share Location" button to:
1. Allow browser to access your GPS
2. Send location to backend
3. See live location coordinates

### Step 6: Find Nearby Drivers

Click "Find a Ride" to:
1. Get your current location
2. Query backend for nearby drivers
3. Display drivers with ratings and vehicle info

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| **api-client.js** | Generic HTTP client for API calls |
| **auth-service.js** | Authentication & user functions |
| **trip-service.js** | GPS & trip functions |
| **Login-Connected.html** | Login/Signup page with backend |
| **Dashboard-Connected.html** | Dashboard with real data |

---

## 🧪 Testing Checklist

- [ ] **Register:** Create new account successfully
- [ ] **Login:** Login with credentials
- [ ] **Dashboard:** See profile info from database
- [ ] **Location:** Share GPS location
- [ ] **Drivers:** See nearby drivers list
- [ ] **UI:** All buttons work without errors
- [ ] **Console:** No JavaScript errors

---

## 🔍 What's Working

✅ **Authentication**
- User registration with validation
- User login with JWT token
- Token stored in localStorage
- Protected routes redirect to login

✅ **Profile**
- Load user profile from database
- Display name, email, phone, rating
- Show ride count and account type

✅ **Location**
- Get browser geolocation
- Send to backend API
- Display live coordinates

✅ **Drivers**
- Query nearby drivers from database
- Show driver info, ratings, vehicles
- Distance-based search (5km radius)

✅ **Error Handling**
- Clear error messages
- Notifications for success/failure
- Graceful fallbacks

---

## 🐛 If Something Doesn't Work

**Check the Console:**
1. Press `F12` to open DevTools
2. Click "Console" tab
3. Look for error messages

**Common Issues:**

### Error: "CORS error"
**Solution:** Backend needs to allow frontend origin
- Add to `.env`: `CORS_ORIGIN=file://`

### Error: "Cannot find api-client.js"
**Solution:** Make sure all JS files are in the root folder
- ✅ C:/Users/Asus/Desktop/UI_IP/api-client.js
- ✅ C:/Users/Asus/Desktop/UI_IP/auth-service.js
- ✅ C:/Users/Asus/Desktop/UI_IP/trip-service.js

### Error: "TypeError: AuthService is not defined"
**Solution:** Check script loading order
```html
<script src="api-client.js"></script>
<script src="auth-service.js"></script>
```

### Error: "Cannot read property 'map' of undefined"
**Solution:** Drivers list might be empty
- Make sure you have driver accounts created first

---

## 🔧 Debugging Steps

1. **Check Backend is Running**
   ```powershell
   # Should see: Server running on http://localhost:5001
   # and: MongoDB: Connected ✓
   ```

2. **Test API Directly** (in PowerShell)
   ```powershell
   curl http://localhost:5001/api/health
   # Should return: {"status":"ok",...}
   ```

3. **Check Network Tab** (in DevTools)
   - Click Network tab
   - Try to login
   - Look for requests to localhost:5001
   - Check responses for errors

4. **Check localStorage**
   - Open DevTools → Application → localStorage
   - Look for `authToken` and `user` entries

---

## 📊 API Calls Happening

When you use the dashboard:

1. **Registration:**
   ```
   POST http://localhost:5001/api/auth/register
   → Creates user in MongoDB
   → Returns JWT token
   → Saved to localStorage
   ```

2. **Dashboard Load:**
   ```
   GET http://localhost:5001/api/auth/profile
   → Authorization: Bearer <token>
   → Returns user data
   → Displays on screen
   ```

3. **Share Location:**
   ```
   PUT http://localhost:5001/api/auth/location
   → Authorization: Bearer <token>
   → Sends latitude & longitude
   → Saved in database
   ```

4. **Find Drivers:**
   ```
   POST http://localhost:5001/api/users/nearby-drivers
   → Sends your location
   → MongoDB geospatial query
   → Returns drivers within 5km
   ```

---

## ✅ Next Steps After Testing

If all tests pass:

1. **Continue to Phase 3** - GPS & Route Matching
2. **Create Trip API** - Start/end rides
3. **Match Algorithm** - Find overlapping routes
4. **Real-time Updates** - WebSocket integration

---

## 📞 Quick Reference

**Backend URL:** http://localhost:5001
**Frontend URL:** file:///C:/Users/Asus/Desktop/UI_IP/
**Database:** MongoDB Atlas
**Auth Method:** JWT Tokens

**Endpoints Used:**
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/profile`
- PUT `/api/auth/location`
- POST `/api/users/nearby-drivers`

---

## 🎯 Test Scenarios

### Scenario 1: New User
1. Open Login page
2. Click "Sign Up"
3. Fill form
4. Click "Create Account"
5. Should redirect to Dashboard with user data

### Scenario 2: Existing User
1. Open Login page
2. Enter email & password
3. Click "Log In"
4. Should redirect to Dashboard

### Scenario 3: Multiple Users
1. Register User A
2. Register User B
3. As User B, click "Find a Ride"
4. Should see User A as nearby driver

### Scenario 4: Location Tracking
1. Login as user
2. Click "Share Location"
3. Allow geolocation
4. Should see coordinates update
5. Backend receives location data

---

Enjoy testing! 🚗✨
