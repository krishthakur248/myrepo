const Trip = require('../models/Trip');
const User = require('../models/User');
const { generateUniqueCode, calculateDistance, checkRouteOverlap, getOSRMRoute } = require('../utils/helpers');
const { matchRoutes, calculateFareSplit } = require('../utils/matchingEngine');

// Start a new trip (driver creates ride offer)
exports.startTrip = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            pickupLocation,
            dropoffLocation,
            startTime,
            availableSeats,
            vehicleInfo,
            estimatedFare,
            routePreference
        } = req.body;

        // Validate required fields
        if (!pickupLocation || !dropoffLocation || !availableSeats) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: pickupLocation, dropoffLocation, availableSeats'
            });
        }

        // Validate and normalize coordinates - handle both array [lng, lat] and object {coordinates: [lng, lat]} formats
        let pickupCoords = Array.isArray(pickupLocation) ? pickupLocation : pickupLocation.coordinates;
        let dropoffCoords = Array.isArray(dropoffLocation) ? dropoffLocation : dropoffLocation.coordinates;

        if (!Array.isArray(pickupCoords) || !Array.isArray(dropoffCoords) ||
            pickupCoords.length !== 2 || dropoffCoords.length !== 2) {
            return res.status(400).json({
                success: false,
                message: 'Invalid location format. Expected coordinates array [longitude, latitude]'
            });
        }

        // Get driver info
        const driver = await User.findById(userId);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }

        console.log(`\n[START-TRIP] 📍 Driver: ${driver.firstName} ${driver.lastName}`);
        console.log(`[START-TRIP] Pickup: [${pickupCoords}]`);
        console.log(`[START-TRIP] Dropoff: [${dropoffCoords}]`);

        // Get real road route from OSRM
        console.log(`[START-TRIP] 🗺️  Fetching real road route from OSRM...`);
        const osrmWaypoints = await getOSRMRoute(pickupCoords, dropoffCoords);

        // Convert waypoints to routeHistory format
        let routeHistory = [];
        if (osrmWaypoints && osrmWaypoints.length > 0) {
            console.log(`[START-TRIP] ✅ OSRM returned ${osrmWaypoints.length} waypoints`);
            routeHistory = osrmWaypoints.map((point, index) => ({
                latitude: point[0],
                longitude: point[1],
                timestamp: new Date()
            }));
        } else {
            console.log(`[START-TRIP] ⚠️  OSRM failed, falling back to pickup/dropoff only`);
            routeHistory = [
                {
                    latitude: pickupCoords[1],
                    longitude: pickupCoords[0],
                    timestamp: new Date()
                },
                {
                    latitude: dropoffCoords[1],
                    longitude: dropoffCoords[0],
                    timestamp: new Date()
                }
            ];
        }

        // Create trip with populated routeHistory
        const trip = new Trip({
            tripCode: generateUniqueCode(),
            driver: userId,
            pickupLocation: {
                address: 'Current Location',
                coordinates: {
                    type: 'Point',
                    coordinates: pickupCoords
                }
            },
            dropoffLocation: {
                address: 'Destination',
                coordinates: {
                    type: 'Point',
                    coordinates: dropoffCoords
                }
            },
            startTime: startTime || new Date(),
            route: [], // Empty for now, will be populated later if needed
            routeHistory: routeHistory, // Pre-populated with OSRM waypoints!
            availableSeats,
            occupiedSeats: 1, // Driver occupies 1 seat
            riders: [],
            vehicle: vehicleInfo || driver.vehicle || 'car', // Default to 'car' if no info
            baseFare: estimatedFare || 100,
            status: 'active',
            driverConsent: true
        });

        await trip.save();

        console.log(`[START-TRIP] ✅ Trip created: ${trip.tripCode}`);
        console.log(`[START-TRIP] Route waypoints stored: ${trip.routeHistory.length}`);

        res.status(201).json({
            success: true,
            message: 'Trip created successfully',
            trip
        });
    } catch (error) {
        console.error('Start trip error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating trip',
            error: error.message
        });
    }
};

// Find matching trips for a rider (NEW: Using H3 + Turf advanced matching)
exports.findMatches = async (req, res) => {
    try {
        console.log('\n\n🚀🚀🚀 ========== FIND-MATCHES ENDPOINT CALLED ==========');
        console.log('Timestamp:', new Date().toISOString());
        
        const userId = req.user.id;
        const {
            pickupLocation,
            dropoffLocation,
            maxDistance = 5,
            timeWindow = 30
        } = req.body;

        console.log('Request body:', req.body);
        console.log('User ID:', userId);

        if (!pickupLocation || !dropoffLocation) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: pickupLocation, dropoffLocation'
            });
        }

        // Convert to consistent format
        const riderPickupCoords = Array.isArray(pickupLocation) ? pickupLocation : pickupLocation.coordinates;
        const riderDropoffCoords = Array.isArray(dropoffLocation) ? dropoffLocation : dropoffLocation.coordinates;

        console.log('\n========== [FIND-MATCHES] START ==========');
        console.log(`Rider Pickup Input: [${riderPickupCoords}]`);
        console.log(`Rider Dropoff Input: [${riderDropoffCoords}]`);

        // Find candidate trips nearby (fast spatial query)
        const candidates = await Trip.find({
            status: 'active',
            $expr: { $lt: ['$occupiedSeats', '$availableSeats'] },
            driver: { $ne: userId },
            'pickupLocation.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: riderPickupCoords
                    },
                    $maxDistance: maxDistance * 1000
                }
            }
        })
        .populate('driver', 'firstName lastName rating totalRides vehicle vehicleNumber vehicleColor profileImage')
        .limit(20); // Get more candidates for matching

        console.log(`\n[FIND-MATCHES] Database query results:`);
        console.log(`  Max distance: ${maxDistance * 1000}m`);
        console.log(`  Query location: [${riderPickupCoords}]`);
        console.log(`  Candidate trips found: ${candidates.length}`);
        
        if (candidates.length === 0) {
          console.log('  ⚠️  NO CANDIDATES FOUND - Checking all active trips...');
          const allTrips = await Trip.find({ status: 'active' }).select('_id driver pickupLocation');
          console.log(`  Total active trips in DB: ${allTrips.length}`);
          allTrips.slice(0, 5).forEach(trip => {
            console.log(`    - Trip ${trip._id}: pickup coords [${trip.pickupLocation?.coordinates?.coordinates}]`);
          });
        } else {
          candidates.forEach(trip => {
            console.log(`  ✅ Candidate ${trip._id}: ${trip.driver.firstName} ${trip.driver.lastName}`);
            console.log(`     Pickup: [${trip.pickupLocation?.coordinates?.coordinates}]`);
            console.log(`     Dropoff: [${trip.dropoffLocation?.coordinates?.coordinates}]`);
          });
        }

        // Apply advanced H3 + Turf matching to each candidate
        const matchedTrips = [];

        for (const trip of candidates) {
            try {
                // Get driver's stored route (from Socket.io updates) or fallback to pickup/dropoff
                const driverRoute = trip.routeHistory && trip.routeHistory.length > 0
                    ? trip.routeHistory.map(point => [point.latitude, point.longitude])
                    : [[trip.pickupLocation.coordinates.coordinates[1], trip.pickupLocation.coordinates.coordinates[0]],
                       [trip.dropoffLocation.coordinates.coordinates[1], trip.dropoffLocation.coordinates.coordinates[0]]];

                // Rider's intended route (convert from [lng, lat] to [lat, lng])
                const riderRoute = [
                    [riderPickupCoords[1], riderPickupCoords[0]],
                    [riderDropoffCoords[1], riderDropoffCoords[0]]
                ];

                // DEBUG: Log the actual coordinates being used
                console.log(`\n--- Trip ${trip._id} ---`);
                console.log(`Driver Route (${driverRoute.length} points):`);
                driverRoute.forEach((pt, i) => console.log(`  [${i}] [${pt[0].toFixed(5)}, ${pt[1].toFixed(5)}]`));
                console.log(`Rider Route:`);
                riderRoute.forEach((pt, i) => console.log(`  [${i}] [${pt[0].toFixed(5)}, ${pt[1].toFixed(5)}]`));
                console.log(`routeHistory points: ${trip.routeHistory?.length || 0}`);

                // Run advanced matching algorithm
                const matchResult = matchRoutes(driverRoute, riderRoute, {
                    baseFare: trip.baseFare || 100
                });

                if (matchResult.matched) {
                    const tripObj = trip.toObject();
                    matchedTrips.push({
                        ...tripObj,
                        matchScore: matchResult.matchQuality || 75,
                        overlapDistanceKm: (matchResult.overlapDistanceKm || 0).toFixed(2),
                        pickupPoint: matchResult.pickupPoint,
                        dropoffPoint: matchResult.dropoffPoint,
                        fareSplit: matchResult.fareSplit,
                        savings: trip.baseFare ? Math.round(trip.baseFare * 0.3) : 0
                    });
                } else {
                    console.log(`[FIND-MATCHES] Trip ${trip._id} didn't match: ${matchResult.reason}`);
                }
            } catch (error) {
                console.error(`[FIND-MATCHES] Error matching trip ${trip._id}:`, error.message);
            }
        }

        // Sort by match score (descending)
        matchedTrips.sort((a, b) => b.matchScore - a.matchScore);

        console.log(`\n[FIND-MATCHES] FINAL RESULTS:`);
        console.log(`  Total candidates checked: ${candidates.length}`);
        console.log(`  Matched trips: ${matchedTrips.length}`);
        if (matchedTrips.length > 0) {
          console.log(`  ✅ SUCCESS - Returning ${matchedTrips.length} matches`);
          matchedTrips.slice(0, 3).forEach((trip, i) => {
            console.log(`    [${i+1}] Score: ${trip.matchScore}%, Overlap: ${trip.overlapDistanceKm}km`);
          });
        } else {
          console.log(`  ❌ NO MATCHES - All ${candidates.length} candidates failed matching`);
        }
        console.log('[FIND-MATCHES] ========== END ==========\n');

        res.status(200).json({
            success: true,
            message: `Found ${matchedTrips.length} matching trips`,
            matches: matchedTrips
        });
    } catch (error) {
        console.error('Find matches error:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding matches',
            error: error.message
        });
    }
};

// Debug: Get all active trips (for debugging matching)
exports.getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'active' }).populate('driver', 'firstName lastName');
    const tripsData = trips.map(trip => ({
      _id: trip._id,
      driver: trip.driver.firstName + ' ' + trip.driver.lastName,
      pickup: trip.pickupLocation?.coordinates?.coordinates,
      dropoff: trip.dropoffLocation?.coordinates?.coordinates,
      routeHistoryCount: trip.routeHistory?.length || 0,
      routeHistory: trip.routeHistory?.slice(0, 5) || [] // First 5 points
    }));
    res.status(200).json({
      success: true,
      totalTrips: trips.length,
      trips: tripsData
    });
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Join a trip (rider requests to join)
exports.joinTrip = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripId, pickupPoint, dropoffPoint, fare } = req.body;

        // Validate trip exists
        const trip = await Trip.findById(tripId).populate('driver', 'firstName lastName');
        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        // Check if trip is active
        if (trip.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `Trip is ${trip.status}. Cannot join.`
            });
        }

        // Check available seats
        if (trip.occupiedSeats >= trip.availableSeats) {
            return res.status(400).json({
                success: false,
                message: 'No available seats in this trip'
            });
        }

        // Check if user already joined
        const alreadyJoined = trip.riders.some(rider => rider.riderId.toString() === userId);
        if (alreadyJoined) {
            return res.status(400).json({
                success: false,
                message: 'You have already joined this trip'
            });
        }

        // Get rider info
        const rider = await User.findById(userId);
        if (!rider) {
            return res.status(404).json({ success: false, message: 'Rider not found' });
        }

        // Normalize pickup and dropoff points to GeoJSON format
        const normalizeLocation = (location, fallback) => {
            if (!location) {
                return fallback;
            }
            // If it's already in GeoJSON format
            if (location.coordinates && location.coordinates.type) {
                return location;
            }
            // If it's an array [lng, lat]
            if (Array.isArray(location) && location.length === 2) {
                return {
                    address: 'Pickup Location',
                    coordinates: {
                        type: 'Point',
                        coordinates: location
                    }
                };
            }
            // If it has coordinates property but not full GeoJSON format
            if (location.coordinates && Array.isArray(location.coordinates)) {
                return {
                    address: location.address || 'Pickup Location',
                    coordinates: {
                        type: 'Point',
                        coordinates: location.coordinates
                    }
                };
            }
            return fallback;
        };

        // Add rider to trip with calculated fare from frontend
        trip.riders.push({
            riderId: userId,
            pickupPoint: normalizeLocation(pickupPoint, trip.pickupLocation),
            dropoffPoint: normalizeLocation(dropoffPoint, trip.dropoffLocation),
            fare: fare || 0, // Use fare passed from frontend (distance-based: ₹10/km)
            status: 'matched', // Initial status when rider joins
            joinedAt: new Date()
        });

        trip.occupiedSeats += 1;
        await trip.save();

        // Populate for response
        await trip.populate([
            { path: 'driver', select: 'firstName lastName rating' },
            { path: 'riders.riderId', select: 'firstName lastName rating' }
        ]);

        // Emit real-time notification to driver via Socket.io
        const io = req.app.get('io');
        if (io) {
            const riderName = `${rider.firstName} ${rider.lastName}`;
            // Notify driver about new rider request
            io.to(`user_${trip.driver._id}`).emit('new-rider-request', {
                tripId: trip._id,
                tripCode: trip.tripCode,
                riderId: userId,
                riderName: riderName,
                riderRating: rider.rating,
                fare: fare || 0,
                message: `New rider ${riderName} joined your trip!`,
                timestamp: new Date()
            });

            // Also emit via trip room for real-time updates
            io.to(`trip_${trip._id}`).emit('rider-joined', {
                tripId: trip._id,
                riderId: userId,
                riderName: riderName,
                fare: fare || 0,
                timestamp: new Date()
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully joined trip. Waiting for ${trip.driver.firstName}'s acceptance.`,
            trip
        });
    } catch (error) {
        console.error('Join trip error:', error);
        res.status(500).json({
            success: false,
            message: 'Error joining trip',
            error: error.message
        });
    }
};

// Accept or reject rider (driver action)
exports.respondToRider = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripId, riderId, action } = req.body; // action: 'accept' or 'reject'

        console.log('respondToRider called with:', { userId, tripId, riderId, action });

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be 'accept' or 'reject'"
            });
        }

        const trip = await Trip.findById(tripId)
            .populate('driver', 'firstName lastName')
            .populate('riders.riderId', 'firstName lastName');

        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        // Verify user is the driver
        if (trip.driver._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the driver can accept or reject riders'
            });
        }

        // Find rider in trip - normalize riderId to string for comparison
        const riderIdString = typeof riderId === 'string' ? riderId : riderId?.toString?.() || riderId;
        console.log('Looking for rider:', riderIdString, 'in riders:', trip.riders.map(r => r.riderId._id.toString()));

        const riderIndex = trip.riders.findIndex(r => r.riderId._id.toString() === riderIdString);
        if (riderIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Rider not found in this trip'
            });
        }

        let responseMessage = '';
        if (action === 'accept') {
            trip.riders[riderIndex].status = 'confirmed';  // Use 'confirmed' instead of 'accepted'
            // Set driver consent flag (optional, based on model definition)
            trip.driverConsent = true;
            responseMessage = 'Rider accepted';
        } else {
            // Remove rider if rejected
            trip.riders.splice(riderIndex, 1);
            trip.occupiedSeats -= 1;
            responseMessage = 'Rider rejected';
        }

        await trip.save();

        // Emit real-time notification via Socket.io
        const io = req.app.get('io');
        if (io) {
            const driverName = `${trip.driver.firstName} ${trip.driver.lastName}`;

            if (action === 'accept') {
                // Notify rider that they were accepted
                io.to(`user_${riderIdString}`).emit('notification', {
                    type: 'ride-accepted',
                    tripId: tripId,
                    driverId: userId,
                    driverName: driverName,
                    message: `${driverName} accepted your ride request!`,
                    timestamp: new Date()
                });

                io.to(`trip_${tripId}_user_${riderIdString}`).emit('ride-status-update', {
                    tripId: tripId,
                    status: 'accepted',
                    driverName: driverName
                });
            } else {
                // Notify rider that they were rejected
                io.to(`user_${riderIdString}`).emit('notification', {
                    type: 'ride-rejected',
                    tripId: tripId,
                    driverId: userId,
                    driverName: driverName,
                    message: `${driverName} rejected your ride request.`,
                    timestamp: new Date()
                });
            }
        }

        res.status(200).json({
            success: true,
            message: responseMessage,
            trip
        });
    } catch (error) {
        console.error('Respond to rider error:', error);
        res.status(500).json({
            success: false,
            message: 'Error responding to rider',
            error: error.message
        });
    }
};

// Cancel rider request (rider cancels their join request)
exports.cancelRiderRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripId } = req.params;
        const { riderId } = req.body;

        console.log('cancelRiderRequest called with:', { userId, tripId, riderId });

        const trip = await Trip.findById(tripId)
            .populate('driver', 'firstName lastName')
            .populate('riders.riderId', 'firstName lastName');

        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        // Verify that the rider is the one cancelling or they're the driver
        const riderIdToRemove = riderId || userId;
        const riderIdString = typeof riderIdToRemove === 'string' ? riderIdToRemove : riderIdToRemove?.toString?.() || riderIdToRemove;

        if (riderIdString !== userId && trip.driver._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only cancel your own request'
            });
        }

        // Find rider in trip
        const riderIndex = trip.riders.findIndex(r => r.riderId._id.toString() === riderIdString);
        if (riderIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Rider not found in this trip'
            });
        }

        // Remove rider from trip
        const removedRider = trip.riders[riderIndex];
        trip.riders.splice(riderIndex, 1);
        trip.occupiedSeats -= 1;

        await trip.save();

        // Emit real-time notification via Socket.io
        const io = req.app.get('io');
        if (io) {
            // Notify driver that rider cancelled
            io.to(`user_${trip.driver._id.toString()}`).emit('notification', {
                type: 'rider-cancelled',
                tripId: tripId,
                riderId: riderIdString,
                message: 'A rider has cancelled their request',
                timestamp: new Date()
            });
        }

        res.status(200).json({
            success: true,
            message: 'Request cancelled successfully',
            trip
        });
    } catch (error) {
        console.error('Cancel rider request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling request',
            error: error.message
        });
    }
};

// Get trip details
exports.getTripDetails = async (req, res) => {
    try {
        const { tripId } = req.params;

        const trip = await Trip.findById(tripId)
            .populate('driver', 'firstName lastName rating totalRides vehicle vehicleNumber vehicleColor currentLocation')
            .populate('riders.riderId', 'firstName lastName rating totalRides');

        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        res.status(200).json({
            success: true,
            trip
        });
    } catch (error) {
        console.error('Get trip details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trip details',
            error: error.message
        });
    }
};

// Complete a trip
exports.completeTrip = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripId, finalRoute } = req.body;

        console.log('🔍 [COMPLETE-TRIP] Request received:');
        console.log('   - User ID from token:', userId, 'Type:', typeof userId);
        console.log('   - Trip ID:', tripId);

        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        console.log('🔍 [COMPLETE-TRIP] Trip found:');
        console.log('   - Trip driver:', trip.driver, 'Type:', typeof trip.driver);
        console.log('   - Trip driver toString():', trip.driver.toString());
        console.log('   - User ID:', userId);
        console.log('   - Match result:', trip.driver.toString() === userId);

        // Verify user is the driver
        if (trip.driver.toString() !== userId) {
            console.warn('❌ [COMPLETE-TRIP] Authorization failed - user is not the driver');
            return res.status(403).json({
                success: false,
                message: 'Only the driver can complete a trip'
            });
        }

        // Update trip
        trip.status = 'completed';
        trip.endTime = new Date();
        if (finalRoute) {
            trip.route = finalRoute;
        }

        // Mark riders as completed
        trip.riders.forEach(rider => {
            if (rider.status === 'accepted') {
                rider.status = 'completed';
            }
        });

        await trip.save();

        // Emit socket event to notify all riders that trip is completed
        const io = req.app.get('io');
        if (io) {
            // Notify all riders in this trip
            trip.riders.forEach(rider => {
                io.to(`user_${rider.riderId}`).emit('trip-completed', {
                    tripId: trip._id,
                    status: 'completed',
                    message: `Trip has been completed by the driver`
                });
            });

            // Also notify via trip room
            io.to(`trip_${tripId}`).emit('trip-completed', {
                tripId: trip._id,
                status: 'completed',
                message: `Trip has been completed by the driver`
            });
        }

        res.status(200).json({
            success: true,
            message: 'Trip completed successfully',
            trip
        });
    } catch (error) {
        console.error('Complete trip error:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing trip',
            error: error.message
        });
    }
};

// Get active trips for driver
exports.getDriverTrips = async (req, res) => {
    try {
        const userId = req.user.id;

        const trips = await Trip.find({
            driver: userId
        })
        .populate('riders.riderId', 'firstName lastName rating')
        .sort({ startTime: -1 })
        .limit(20);

        res.status(200).json({
            success: true,
            trips
        });
    } catch (error) {
        console.error('Get driver trips error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching driver trips',
            error: error.message
        });
    }
};

// Get trips rider has joined
exports.getRiderTrips = async (req, res) => {
    try {
        const userId = req.user.id;

        const trips = await Trip.find({
            'riders.riderId': userId
        })
        .populate('driver', 'firstName lastName rating vehicle vehicleNumber vehicleColor currentLocation')
        .populate('riders.riderId', 'firstName lastName phone')
        .sort({ startTime: -1 })
        .limit(20);

        res.status(200).json({
            success: true,
            trips
        });
    } catch (error) {
        console.error('Get rider trips error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching rider trips',
            error: error.message
        });
    }
};
