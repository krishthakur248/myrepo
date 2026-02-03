const Trip = require('../models/Trip');
const User = require('../models/User');
const { generateUniqueCode, calculateDistance, checkRouteOverlap } = require('../utils/helpers');

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

        // Create trip
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
            availableSeats,
            occupiedSeats: 1, // Driver occupies 1 seat
            riders: [],
            vehicle: vehicleInfo || driver.vehicle || 'car', // Default to 'car' if no info
            baseFare: estimatedFare || 100,
            status: 'active',
            driverConsent: true
        });

        await trip.save();

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

// Find matching trips for a rider
exports.findMatches = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            pickupLocation,
            dropoffLocation,
            maxDistance = 5, // 5km default
            timeWindow = 30 // 30 minutes default
        } = req.body;

        if (!pickupLocation || !dropoffLocation) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: pickupLocation, dropoffLocation'
            });
        }

        // Convert array format [lng, lat] to GeoJSON if needed
        const pickupGeoJSON = Array.isArray(pickupLocation)
            ? { type: 'Point', coordinates: pickupLocation }
            : pickupLocation;
        const dropoffGeoJSON = Array.isArray(dropoffLocation)
            ? { type: 'Point', coordinates: dropoffLocation }
            : dropoffLocation;

        // Find active trips nearby
        const matches = await Trip.find({
            status: 'active',
            $expr: { $lt: ['$occupiedSeats', '$availableSeats'] }, // Has available seats
            driver: { $ne: userId }, // Not current user's trip
            'pickupLocation.coordinates': {
                $near: {
                    $geometry: pickupGeoJSON,
                    $maxDistance: maxDistance * 1000 // Convert km to meters
                }
            }
        })
        .populate('driver', 'firstName lastName rating totalRides vehicle vehicleNumber vehicleColor profileImage')
        .limit(10);

        // Score and filter matches based on route overlap
        const scoredMatches = matches
            .map(trip => {
                // Extract coordinates from GeoJSON format {type: 'Point', coordinates: [lng, lat]}
                const pickupCoords = pickupGeoJSON.coordinates || pickupLocation;
                const dropoffCoords = dropoffGeoJSON.coordinates || dropoffLocation;

                // Extract trip coordinates - handle nested GeoJSON structure
                const tripPickupCoords = trip.pickupLocation.coordinates.coordinates || trip.pickupLocation.coordinates;
                const tripDropoffCoords = trip.dropoffLocation.coordinates.coordinates || trip.dropoffLocation.coordinates;

                // Ensure we have [lng, lat] format arrays
                const riderPickup = Array.isArray(pickupCoords) ? pickupCoords : [pickupCoords.longitude, pickupCoords.latitude];
                const riderDropoff = Array.isArray(dropoffCoords) ? dropoffCoords : [dropoffCoords.longitude, dropoffCoords.latitude];
                const driverPickup = Array.isArray(tripPickupCoords) ? tripPickupCoords : [tripPickupCoords.longitude, tripPickupCoords.latitude];
                const driverDropoff = Array.isArray(tripDropoffCoords) ? tripDropoffCoords : [tripDropoffCoords.longitude, tripDropoffCoords.latitude];

                // Calculate distances using latitude,longitude order for calculateDistance function
                // Note: coordinates are in [lng, lat] format, but calculateDistance expects (lat1, lon1, lat2, lon2)
                const pickupDistance = calculateDistance(
                    riderPickup[1],  // rider lat
                    riderPickup[0],  // rider lng
                    driverPickup[1], // driver pickup lat
                    driverPickup[0]  // driver pickup lng
                );

                const dropoffDistance = calculateDistance(
                    riderDropoff[1],  // rider dropoff lat
                    riderDropoff[0],  // rider dropoff lng
                    driverDropoff[1], // driver dropoff lat
                    driverDropoff[0]  // driver dropoff lng
                );

                // Match score: weight pickup location more heavily (70%) than dropoff (30%)
                // If pickups are the same/very close, match score should be very high
                const pickupTolerance = 10; // 10km for pickup location matching
                const dropoffTolerance = 15; // 15km for dropoff location (more lenient)

                const pickupScore = Math.max(0, 100 - (pickupDistance / pickupTolerance) * 100);
                const dropoffScore = Math.max(0, 100 - (dropoffDistance / dropoffTolerance) * 100);

                // Weight: 70% pickup, 30% dropoff
                const overlapScore = Math.round((pickupScore * 0.7) + (dropoffScore * 0.3));

                return {
                    ...trip.toObject(),
                    matchScore: overlapScore,
                    pickupDistance: parseFloat(pickupDistance.toFixed(2)),
                    dropoffDistance: parseFloat(dropoffDistance.toFixed(2)),
                    savings: trip.baseFare ? Math.round(trip.baseFare * 0.4) : 0 // Est. 40% savings
                };
            })
            .filter(trip => trip.matchScore >= 30) // Very lenient: show if pickup is reasonably close
            .sort((a, b) => b.matchScore - a.matchScore);

        res.status(200).json({
            success: true,
            message: `Found ${scoredMatches.length} matching trips`,
            matches: scoredMatches
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

        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        // Verify user is the driver
        if (trip.driver.toString() !== userId) {
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
