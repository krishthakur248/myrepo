// Trip Service - Handles all trip-related API calls

class TripServiceAPI {
  // Start a new trip (driver creates a ride offer)
  static async startTrip(pickupLocation, dropoffLocation, availableSeats, vehicleInfo, estimatedFare) {
    try {
      const response = await apiClient.post('/trips/start-trip', {
        pickupLocation,
        dropoffLocation,
        availableSeats,
        vehicleInfo,
        estimatedFare,
        startTime: new Date()
      });
      return response;
    } catch (error) {
      console.error('Start trip error:', error);
      throw error;
    }
  }

  // Find matching trips (rider searches for rides)
  static async findMatches(pickupLocation, dropoffLocation, maxDistance = 5, timeWindow = 30) {
    try {
      const response = await apiClient.post('/trips/find-matches', {
        pickupLocation,
        dropoffLocation,
        maxDistance,
        timeWindow
      });
      return response;
    } catch (error) {
      console.error('Find matches error:', error);
      throw error;
    }
  }

  // Join a trip (rider requests to join)
  static async joinTrip(tripId, pickupPoint, dropoffPoint, fare) {
    try {
      const response = await apiClient.post('/trips/join-trip', {
        tripId,
        pickupPoint,
        dropoffPoint,
        fare
      });
      return response;
    } catch (error) {
      console.error('Join trip error:', error);
      throw error;
    }
  }

  // Get trip details
  static async getTripDetails(tripId) {
    try {
      const response = await apiClient.get(`/trips/${tripId}`);
      return response;
    } catch (error) {
      console.error('Get trip details error:', error);
      throw error;
    }
  }

  // Accept or reject a rider (driver action)
  static async respondToRider(tripId, riderId, action) {
    try {
      const response = await apiClient.post('/trips/respond-rider', {
        tripId,
        riderId,
        action // 'accept' or 'reject'
      });
      return response;
    } catch (error) {
      console.error('Respond to rider error:', error);
      throw error;
    }
  }

  // Complete a trip (driver finishes)
  static async completeTrip(tripId, finalRoute) {
    try {
      const response = await apiClient.post('/trips/complete-trip', {
        tripId,
        finalRoute
      });
      return response;
    } catch (error) {
      console.error('Complete trip error:', error);
      throw error;
    }
  }

  // Get all trips created by driver
  static async getDriverTrips() {
    try {
      const response = await apiClient.get('/trips/driver/my-trips');
      return response;
    } catch (error) {
      console.error('Get driver trips error:', error);
      throw error;
    }
  }

  // Get all trips rider has joined
  static async getRiderTrips() {
    try {
      const response = await apiClient.get('/trips/rider/my-trips');
      return response;
    } catch (error) {
      console.error('Get rider trips error:', error);
      throw error;
    }
  }
}
