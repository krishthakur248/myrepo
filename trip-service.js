// Trip Service - Handle trip-related API calls

class TripService {
  // Get nearby drivers
  static async getNearbyDrivers(latitude, longitude, maxDistance = 5) {
    try {
      const response = await apiClient.post('/users/nearby-drivers', {
        latitude,
        longitude,
        maxDistance,
      });
      return response;
    } catch (error) {
      console.error('Get nearby drivers error:', error);
      throw error;
    }
  }

  // Get driver info
  static async getDriverInfo(driverId) {
    try {
      const response = await apiClient.get(`/users/${driverId}/driver-info`);
      return response;
    } catch (error) {
      console.error('Get driver info error:', error);
      throw error;
    }
  }

  // Add rating to driver/user
  static async addRating(userId, rating) {
    try {
      const response = await apiClient.post(`/users/${userId}/add-rating`, {
        rating,
      });
      return response;
    } catch (error) {
      console.error('Add rating error:', error);
      throw error;
    }
  }

  // Get user ratings
  static async getUserRatings(userId) {
    try {
      const response = await apiClient.get(`/users/${userId}/ratings`);
      return response;
    } catch (error) {
      console.error('Get user ratings error:', error);
      throw error;
    }
  }
}

// Location Service - Handle GPS/location related functions

class LocationService {
  // Start tracking user location
  static startLocationTracking() {
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.updateLocationInBackend(latitude, longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      console.error('Geolocation not supported');
    }
  }

  // Stop tracking location
  static stopLocationTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

  // Get current location once
  static getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => {
            reject(error);
          }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  // Update location in backend and emit via Socket.io
  static async updateLocationInBackend(latitude, longitude) {
    try {
      const response = await AuthService.updateLocation(latitude, longitude);
      console.log('Location updated:', response);

      // Emit location update via Socket.io for real-time distance calculation on rider screens
      if (window.socket && window.socket.connected) {
        const activeTripId = localStorage.getItem('activeTrip');
        if (activeTripId) {
          window.socket.emit('update-location', {
            tripId: activeTripId,
            latitude,
            longitude,
          });
          console.log('[LOCATION] Emitted location update via Socket.io:', { tripId: activeTripId, latitude, longitude });
        }
      }

      return response;
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  // Calculate distance between two points (Haversine formula)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
