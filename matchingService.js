/**
 * Advanced Matching Service - Frontend
 * Handles real-time GPS streaming, ride matching, and consent flow
 */

class MatchingService {
  constructor() {
    this.socket = null;
    this.tripId = null;
    this.currentTrip = null;
    this.gpsWatchId = null;
    this.updateInterval = 5000; // Send GPS every 5 seconds
    this.isGpsStreaming = false;
  }

  /**
   * Initialize Socket.IO connection
   */
  initializeSocket() {
    if (this.socket && this.socket.connected) {
      return; // Already connected
    }

    try {
      // Get server URL from global API_CONFIG or fallback to localhost
      let serverUrl = 'http://localhost:5001';
      if (typeof API_CONFIG !== 'undefined' && API_CONFIG.SOCKET_SERVER_URL) {
        serverUrl = API_CONFIG.SOCKET_SERVER_URL;
      } else if (typeof ACTIVE_SERVER_URL !== 'undefined') {
        serverUrl = ACTIVE_SERVER_URL;
      }
      
      const token = localStorage.getItem('authToken');

      this.socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      // Socket event listeners
      this.socket.on('connect', () => {
        console.log('[SOCKET] Connected:', this.socket.id);
      });

      this.socket.on('location-updated', (data) => {
        console.log('[SOCKET] Location updated:', data);
        window.driverLocationUpdate = data; // Store for map updates
      });

      this.socket.on('match-found', (data) => {
        console.log('[SOCKET] Match found!', data);
        this.handleMatchFound(data);
      });

      this.socket.on('disconnect', () => {
        console.log('[SOCKET] Disconnected');
      });

    } catch (error) {
      console.error('[SOCKET] Connection error:', error);
    }
  }

  /**
   * Start real-time GPS streaming for matching
   */
  startGpsStreaming(tripId) {
    console.log('[GPS-STREAM] Starting GPS stream for trip:', tripId);
    this.tripId = tripId;

    if (this.isGpsStreaming) {
      return; // Already streaming
    }

    this.isGpsStreaming = true;

    // Join trip room to receive real-time updates
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-trip-room', { tripId });
    }

    // Send initial GPS location
    this.sendGpsUpdate();

    // Continue sending GPS updates
    setInterval(() => {
      if (this.isGpsStreaming && this.tripId) {
        this.sendGpsUpdate();
      }
    }, this.updateInterval);

    // Also use geolocation watch for continuous GPS
    if ('geolocation' in navigator) {
      this.gpsWatchId = navigator.geolocation.watchPosition(
        (position) => {
          if (this.isGpsStreaming) {
            this.sendGpsUpdate();
          }
        },
        (error) => console.warn('[GPS] Watch error:', error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000
        }
      );
    }
  }

  /**
   * Stop GPS streaming
   */
  stopGpsStreaming() {
    console.log('[GPS-STREAM] Stopping GPS stream');
    this.isGpsStreaming = false;

    if (this.gpsWatchId) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
    }

    if (this.socket && this.socket.connected && this.tripId) {
      this.socket.emit('leave-trip-room', { tripId: this.tripId });
    }
  }

  /**
   * Send current GPS position via Socket.IO
   */
  sendGpsUpdate() {
    if (!('geolocation' in navigator) || !this.tripId) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (this.socket && this.socket.connected) {
          this.socket.emit('update-location', {
            tripId: this.tripId,
            latitude,
            longitude
          });

          console.log(`[GPS-STREAM] Sent location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
      },
      (error) => {
        console.warn('[GPS] Position error:', error);
      }
    );
  }

  /**
   * Handle when a match is found
   */
  handleMatchFound(matchData) {
    console.log('[MATCH-FOUND] Match details:', matchData);

    // Trigger consent modal
    this.showConsentModal(matchData);
  }

  /**
   * Show 30-second consent modal for matched ride
   */
  showConsentModal(matchData) {
    const modal = document.createElement('div');
    modal.id = 'consentModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-[#1a2332] rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-[#233648]">
        <h2 class="text-2xl font-bold text-white mb-4">🎉 Perfect Match Found!</h2>

        <!-- Match Details -->
        <div class="bg-[#233648] rounded-lg p-4 mb-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              ${matchData.matchScore}%
            </div>
            <div>
              <p class="text-white font-semibold">${matchData.driver?.firstName} ${matchData.driver?.lastName}</p>
              <p class="text-[#92adc9] text-sm">⭐ ${(matchData.driver?.rating || 4.5).toFixed(1)}</p>
            </div>
          </div>

          <p class="text-[#92adc9] text-sm mb-2">
            🚗 ${(matchData.vehicle || 'Car').toUpperCase()} •
            Overlap: ${matchData.overlapDistanceKm || '0.5'} km
          </p>

          <p class="text-secondary font-bold text-lg">
            ₹${Math.round(matchData.baseFare * 0.7)} (30% discount)
          </p>
        </div>

        <!-- Map Preview -->
        <div id="consentMapContainer" class="w-full h-48 bg-[#0f1620] rounded-lg mb-4 overflow-hidden border border-[#233648]">
          <div id="consentMap" style="width: 100%; height: 100%;"></div>
        </div>

        <!-- Countdown Timer -->
        <div class="mb-4 text-center">
          <p class="text-[#92adc9] text-sm mb-2">Expires in:</p>
          <div class="text-3xl font-bold text-secondary" id="consentCountdown">30</div>
          <div class="w-full bg-[#233648] rounded-full h-2 mt-2">
            <div id="consentProgressBar" class="bg-secondary h-2 rounded-full" style="width: 100%;"></div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3">
          <button onclick="document.getElementById('consentModal').remove()"
                  class="flex-1 bg-[#233648] hover:bg-[#2d465e] text-white py-2 rounded-lg font-bold transition-colors">
            Decline
          </button>
          <button onclick="acceptMatch('${matchData._id}')"
                  class="flex-1 bg-secondary hover:bg-green-600 text-white py-2 rounded-lg font-bold transition-colors">
            Accept
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Initialize map in modal
    this.initializeConsentMap(matchData);

    // Start countdown
    let remainingTime = 30;
    const countdownInterval = setInterval(() => {
      remainingTime--;
      document.getElementById('consentCountdown').textContent = remainingTime;
      document.getElementById('consentProgressBar').style.width = (remainingTime / 30) * 100 + '%';

      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        if (document.getElementById('consentModal')) {
          document.getElementById('consentModal').remove();
        }
      }
    }, 1000);

    // Remove modal after 30 seconds
    setTimeout(() => {
      clearInterval(countdownInterval);
      if (document.getElementById('consentModal')) {
        document.getElementById('consentModal').remove();
      }
    }, 31000);
  }

  /**
   * Initialize Leaflet map in consent modal
   */
  initializeConsentMap(matchData) {
    setTimeout(() => {
      const mapElement = document.getElementById('consentMap');
      if (!mapElement) return;

      // Create map
      const map = L.map(mapElement, {
        center: [28.7041, 77.1025], // Default Delhi
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Add pickup marker
      if (matchData.pickupLocation?.coordinates?.coordinates) {
        const [lng, lat] = matchData.pickupLocation.coordinates.coordinates;
        L.circleMarker([lat, lng], {
          color: '#00dc82',
          radius: 6,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        })
        .addTo(map)
        .bindPopup('Pickup Point');
      }

      // Add dropoff marker
      if (matchData.dropoffLocation?.coordinates?.coordinates) {
        const [lng, lat] = matchData.dropoffLocation.coordinates.coordinates;
        L.circleMarker([lat, lng], {
          color: '#ff3333',
          radius: 6,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        })
        .addTo(map)
        .bindPopup('Dropoff Point');
      }

      map.invalidateSize();
    }, 100);
  }
}

/**
 * Global instance
 */
const matchingService = new MatchingService();

/**
 * Initialize matching service on page load
 */
function initializeMatchingService() {
  matchingService.initializeSocket();
  console.log('[MATCHING-SERVICE] Initialized');
}

/**
 * Accept match and join trip
 */
async function acceptMatch(tripId) {
  try {
    const consentModal = document.getElementById('consentModal');
    if (consentModal) {
      consentModal.remove();
    }

    // Stop GPS streaming after accepting
    matchingService.stopGpsStreaming();

    // Proceed with joining the trip
    console.log('[ACCEPT-MATCH] Joining trip:', tripId);

    // The rest of the joining logic will be handled by existing openJoinRideModal function
  } catch (error) {
    console.error('[ACCEPT-MATCH] Error:', error);
    showNotification('Error accepting match', 'error');
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  initializeMatchingService();
});
