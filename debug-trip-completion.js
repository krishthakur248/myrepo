/**
 * Comprehensive debugging script for trip completion issues
 * Run this in browser console to get full debugging information
 *
 * Usage: Just copy this script into browser console and press Enter
 */

console.clear();
console.log('%c=== TRIP COMPLETION DEBUGGING TOOL ===', 'color: blue; font-size: 16px; font-weight: bold;');

// Helper function to format output
const log = (title, value, type = 'info') => {
    const colors = {
        info: 'color: #555;',
        success: 'color: green; font-weight: bold;',
        error: 'color: red; font-weight: bold;',
        warning: 'color: orange; font-weight: bold;'
    };
    console.log(`%c${title}%c ${value}`, 'font-weight: bold; color: #333;', colors[type] || colors.info);
};

// 1. CHECK TOKEN
console.log('\n%c1. TOKEN INFORMATION', 'color: blue; font-weight: bold; font-size: 14px;');
const token = apiClient?.getToken();
if (!token) {
    log('Status', 'NO TOKEN FOUND', 'error');
} else {
    log('Token present', '✅ YES', 'success');
    log('Token length', `${token.length} characters`);

    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const decoded = JSON.parse(atob(parts[1]));
            log('Decoded token', JSON.stringify(decoded, null, 2));
            log('User ID in token', decoded.id || decoded.userId || 'NOT FOUND', decoded.id ? 'success' : 'error');
        }
    } catch (e) {
        log('Token decode error', e.message, 'error');
    }
}

// 2. CHECK CURRENT USER
console.log('\n%c2. CURRENT USER INFORMATION', 'color: blue; font-weight: bold; font-size: 14px;');
const currentUser = AuthService?.getCurrentUser();
if (!currentUser) {
    log('Status', 'NO USER LOGGED IN', 'error');
} else {
    log('User email', currentUser.email, 'success');
    log('User ID', currentUser._id || currentUser.id || 'NOT FOUND', currentUser._id ? 'success' : 'warning');
    log('User type', currentUser.userType || 'NOT SET', currentUser.userType?.includes('driver') ? 'success' : 'warning');
    log('Full user object', JSON.stringify(currentUser, null, 2));
}

// 3. CHECK ACTIVE TRIP
console.log('\n%c3. ACTIVE TRIP INFORMATION', 'color: blue; font-weight: bold; font-size: 14px;');
const activeTripId = localStorage.getItem('activeTrip');
if (!activeTripId) {
    log('Status', 'NO ACTIVE TRIP', 'warning');
} else {
    log('Active Trip ID', activeTripId, 'success');

    // Try to fetch trip details
    (async () => {
        try {
            const tripResponse = await apiClient.get(`/trips/${activeTripId}`);
            if (tripResponse.success && tripResponse.trip) {
                const trip = tripResponse.trip;
                log('Trip status', trip.status, trip.status === 'active' ? 'success' : 'warning');
                log('Trip driver ID', trip.driver?._id || trip.driver, 'info');
                log('Pickup location', `[${trip.pickupLocation.coordinates.coordinates.join(', ')}]`);
                log('Dropoff location', `[${trip.dropoffLocation.coordinates.coordinates.join(', ')}]`);
                log('Available seats', trip.availableSeats);
                log('Occupied seats', trip.occupiedSeats);
            }
        } catch (error) {
            log('Error fetching trip', error.message, 'error');
        }
    })();
}

// 4. VERIFICATION
console.log('\n%c4. VERIFICATION CHECKS', 'color: blue; font-weight: bold; font-size: 14px;');
try {
    const tokenDecoded = JSON.parse(atob(token.split('.')[1]));
    const tokenUserId = tokenDecoded.id;
    const currentUserId = currentUser?._id;
    const tripDriverId = activeTripId ? (await (async () => {
        try {
            const res = await apiClient.get(`/trips/${activeTripId}`);
            return res.trip?.driver?._id || res.trip?.driver;
        } catch (e) {
            return null;
        }
    })()) : null;

    console.log('%c✓ Token valid', 'color: green; font-weight: bold;');
    console.log(`  User ID in token: ${tokenUserId}`);

    console.log('%c✓ User logged in', currentUser ? 'color: green; font-weight: bold;' : 'color: red; font-weight: bold;');
    console.log(`  Current user ID: ${currentUserId}`);

    if (tokenUserId === currentUserId) {
        console.log('%c✓ Token and user ID match', 'color: green; font-weight: bold;');
    } else {
        console.log('%c✗ Token and user ID DO NOT match', 'color: red; font-weight: bold;');
    }

    if (activeTripId) {
        console.log('%c✓ Active trip exists', 'color: green; font-weight: bold;');
        console.log(`  Trip ID: ${activeTripId}`);

        if (tripDriverId && tokenUserId === tripDriverId) {
            console.log('%c✓ You are the driver of this trip', 'color: green; font-weight: bold;');
        } else if (tripDriverId) {
            console.log('%c✗ You are NOT the driver of this trip', 'color: red; font-weight: bold;');
            console.log(`  Trip driver ID: ${tripDriverId}`);
            console.log(`  Your ID: ${tokenUserId}`);
        }
    }
} catch (e) {
    log('Verification error', e.message, 'error');
}

// 5. RECOMMENDATIONS
console.log('\n%c5. RECOMMENDATIONS', 'color: blue; font-weight: bold; font-size: 14px;');
if (!token) {
    console.log('❌ No token found - Please login again');
} else if (!currentUser) {
    console.log('❌ No user logged in - Please refresh the page');
} else if (!activeTripId) {
    console.log('❌ No active trip - Create a new trip first');
} else {
    console.log('✅ All basic checks passed - You should be able to complete your trip');
    console.log('\n💡 If you still get an error:');
    console.log('1. Check your internet connection');
    console.log('2. Make sure backend is running on Render');
    console.log('3. Clear browser cache (Ctrl+Shift+Delete) and try again');
    console.log('4. Try logging out and back in');
}

console.log('\n%c=== END OF DEBUGGING OUTPUT ===', 'color: blue; font-size: 16px; font-weight: bold;');
