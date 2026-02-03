# 🧪 Phase 6 Frontend Integration Testing Checklist

## ✅ Pre-Testing Setup

- [ ] Node.js installed (`node --version` should show v14+)
- [ ] MongoDB Atlas account active with connection working
- [ ] Backend server not running yet
- [ ] Browser DevTools ready (F12)
- [ ] Test data prepared

## 🚀 Step 1: Start Backend Server

**Terminal Command:**
```bash
cd c:\Users\Asus\Desktop\UI_IP\car-pulling-backend
npm start
```

**Expected Output:**
```
Server running on http://localhost:5001
✓ MongoDB connected successfully
✓ Socket.io connected
```

**✅ Success Criteria:**
- [ ] No error messages
- [ ] Console shows "Server running on http://localhost:5001"
- [ ] Console shows "MongoDB connected successfully"
- [ ] Terminal stays running (don't close it)

---

## 🔐 Step 2: Test Registration (New User)

**Open in Browser:**
```
file:///c:/Users/Asus/Desktop/UI_IP/Login-Connected.html
```

**Test Data:**
- First Name: `TestUser`
- Last Name: `Phase6Test`
- Email: `test@example.com`
- Phone: `9876543210`
- Password: `SecurePass123`

**Form Validation Tests:**
1. [ ] Try submitting empty form → Error shows "All fields required"
2. [ ] Try invalid email (e.g., "notanemail") → Error shows
3. [ ] Try short password (< 6 chars) → Error shows
4. [ ] Fill form correctly → Submit button works

**Registration Process:**
1. [ ] Click "Sign Up" tab if on Login tab
2. [ ] Fill all fields with test data
3. [ ] Check "I agree to terms"
4. [ ] Click "Create Account"
5. [ ] Look for loading spinner
6. [ ] Wait for success message

**✅ Success Criteria:**
- [ ] Form submits without errors
- [ ] Success message appears: "Account created successfully!"
- [ ] Redirects to Dashboard-Connected.html automatically
- [ ] No console errors (check DevTools)
- [ ] HTTP request shows in Network tab → `POST /api/auth/register` → Status 201

---

## 🔑 Step 3: Verify Database Entry

**Check MongoDB Atlas:**

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Navigate to Cluster0 → Collections → car-pulling → users
3. Look for document with email: `test@example.com`

**✅ Success Criteria:**
- [ ] Document exists in users collection
- [ ] Has fields: firstName, lastName, email, phone, password (hashed)
- [ ] Password is encrypted (not plain text)
- [ ] createdAt timestamp is recent

---

## 👤 Step 4: Test Profile Display

**Expected on Dashboard-Connected.html:**

1. [ ] Welcome message shows: "Hello, TestUser"
2. [ ] Profile card displays:
   - [ ] Name: "TestUser Phase6Test"
   - [ ] Email: "test@example.com"
   - [ ] Rating: "Not rated yet" or 0
   - [ ] Total Rides: 0
3. [ ] Location status shows "Detecting location..."
4. [ ] Logout button visible in navbar

**✅ Success Criteria:**
- [ ] All user data displays correctly
- [ ] HTTP request in Network tab → `GET /api/auth/profile` → Status 200
- [ ] No console errors

---

## 📍 Step 5: Test Location Sharing

**Before Testing:**
- [ ] Allow browser permission to access location (allow when prompted)
- [ ] Ensure location services enabled on computer

**Test Process:**
1. [ ] Look for "Share Location" button on dashboard
2. [ ] Click "Share Location"
3. [ ] Browser shows permission prompt → Click "Allow"
4. [ ] Wait for location to load

**✅ Success Criteria:**
- [ ] Location permission popup appears
- [ ] Location status changes to show coordinates, e.g., "📍 Latitude: 28.7041, Longitude: 77.1025"
- [ ] HTTP request in Network tab → `PUT /api/auth/location` → Status 200
- [ ] Latitude/Longitude values shown
- [ ] No console errors

---

## 👨‍🚗 Step 6: Test Login (Existing User)

**Logout First:**
1. [ ] Click "Logout" button
2. [ ] Redirects to Login-Connected.html
3. [ ] localStorage is cleared (no authToken)

**Login Test:**
1. [ ] Click "Login" tab (should be active by default)
2. [ ] Enter email: `test@example.com`
3. [ ] Enter password: `SecurePass123`
4. [ ] Click "Login" button

**✅ Success Criteria:**
- [ ] Form submits
- [ ] Success message: "Login successful!"
- [ ] Redirects to Dashboard-Connected.html
- [ ] Same profile data appears
- [ ] HTTP request → `POST /api/auth/login` → Status 200
- [ ] Token stored in localStorage

**❌ Failed Login Test:**
1. [ ] Try wrong password (e.g., `WrongPassword`)
2. [ ] Should show error: "Invalid credentials"
3. [ ] Should NOT redirect
4. [ ] HTTP request → `POST /api/auth/login` → Status 401

---

## 🚗 Step 7: Test Driver Search (Nearby Drivers)

**Setup Multiple Users:**

*You need at least 1 driver in the system to test this. Create a second account:*

1. [ ] Logout current user
2. [ ] Register new account with different email (e.g., `driver@example.com`)
3. [ ] Login to this second account
4. [ ] Share location
5. [ ] Keep this session open in another browser tab

**Back to First User (Test User):**

1. [ ] Log back in as `test@example.com`
2. [ ] Share location on dashboard
3. [ ] Look for "Nearby Drivers" section
4. [ ] Should show driver(s) nearby

**✅ Success Criteria:**
- [ ] Driver cards show:
  - [ ] Driver name
  - [ ] Rating (e.g., "4.5 ⭐")
  - [ ] Vehicle info (if available)
  - [ ] Distance (e.g., "2.5 km away")
  - [ ] Status indicator (green = online)
- [ ] HTTP request → `POST /api/users/nearby-drivers` → Status 200
- [ ] Returns array of drivers within 5km radius
- [ ] No console errors

---

## 🔄 Step 8: Test Session Persistence

**Close & Reopen Browser:**

1. [ ] On Dashboard-Connected.html, note the user data shown
2. [ ] Close browser completely (all tabs)
3. [ ] Reopen Dashboard-Connected.html URL
4. [ ] Should automatically redirect to Dashboard and show profile (no re-login needed)

**✅ Success Criteria:**
- [ ] authToken still in localStorage after refresh
- [ ] Profile loads automatically
- [ ] No need to login again

**Clear Session:**
1. [ ] Open DevTools → Application → localStorage
2. [ ] Find `authToken` key
3. [ ] Delete it manually
4. [ ] Refresh page
5. [ ] Should redirect to Login-Connected.html

**✅ Success Criteria:**
- [ ] Redirects to login when token missing
- [ ] Cannot access dashboard without token

---

## 🐛 Step 9: Console Error Check

**Open DevTools (F12):**

1. [ ] Click "Console" tab
2. [ ] Perform all above steps
3. [ ] Look for any red error messages

**Expected:**
- [ ] No errors (maybe CORS warnings are OK if CORS handling works)
- [ ] Only blue info messages and network calls

**❌ If errors appear:**
- Take screenshot of error
- Note exact error message
- Check backend server terminal for related errors

---

## 📊 Step 10: Network Tab Verification

**Track All API Calls:**

1. [ ] Open DevTools → Network tab
2. [ ] Register new user
3. [ ] Observe requests:

| Request | Method | Endpoint | Expected Status |
|---------|--------|----------|-----------------|
| Register | POST | /api/auth/register | 201 |
| Login | POST | /api/auth/login | 200 |
| Get Profile | GET | /api/auth/profile | 200 |
| Update Location | PUT | /api/auth/location | 200 |
| Find Drivers | POST | /api/users/nearby-drivers | 200 |

**✅ Success Criteria:**
- [ ] All requests return expected status codes
- [ ] Response bodies contain expected data
- [ ] No 404 or 500 errors

---

## 🎯 Final Verification

| Feature | Status | Notes |
|---------|--------|-------|
| Registration works | ✓/✗ | |
| User data saved to DB | ✓/✗ | |
| Login works | ✓/✗ | |
| Profile displays | ✓/✗ | |
| Location sharing | ✓/✗ | |
| Driver search | ✓/✗ | |
| Session persistent | ✓/✗ | |
| No console errors | ✓/✗ | |

---

## 📝 Common Issues & Fixes

### Issue: "Failed to fetch" error
**Solution:**
- Check backend server is running on localhost:5001
- Backend terminal should show "Server running"
- Restart backend if needed

### Issue: "POST /api/auth/register 400 Bad Request"
**Solution:**
- Check all form fields are filled
- Password must be 6+ characters
- Email must be valid format
- Check backend logs for specific error

### Issue: "POST /api/auth/register 409 Conflict"
**Solution:**
- User with this email already exists
- Use different email address
- Or delete user from MongoDB Atlas first

### Issue: Location not sharing
**Solution:**
- Allow browser permission when prompted
- Check location services enabled on computer
- Try "Share Location" button again
- Check browser console for Geolocation API errors

### Issue: No drivers show in search
**Solution:**
- Create second account and share its location
- Ensure both users share location within 5km of each other
- Check MongoDB Atlas - users should have currentLocation field with coordinates

### Issue: Token not persisting
**Solution:**
- Check localStorage in DevTools
- Should see `authToken` key with JWT value
- Check if cookies/storage blocked in browser settings

---

## ✨ Success Criteria Summary

**Phase 6 is COMPLETE when:**
- ✅ Registration creates user in MongoDB
- ✅ Login returns JWT token
- ✅ Dashboard displays user profile
- ✅ Location sharing works and coordinates saved
- ✅ Driver search returns nearby users
- ✅ All API calls return correct status codes
- ✅ No critical console errors
- ✅ Session persists after browser refresh

---

## 🎉 Next Steps (After Testing)

Once all above tests pass:

1. **Phase 3 (GPS & Route Matching):**
   - Create trip with start/end locations
   - Find matching riders/drivers
   - Calculate route overlap

2. **Phase 4 (Dynamic Fare Calculation):**
   - Calculate base fare
   - Apply distance-based pricing
   - Split fare between driver and riders

3. **Phase 5 (Real-time Messaging):**
   - In-app chat between users
   - WebSocket integration

4. **Phase 7 (Deployment):**
   - Deploy backend to Render/Heroku
   - Deploy frontend to Vercel/Netlify

---

**Prepared by:** GitHub Copilot
**Date:** Phase 6 Testing
**Status:** Ready for Validation

