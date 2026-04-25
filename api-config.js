// API Configuration — Always uses Render backend
// ================================================

const RENDER_SERVER_URL = 'https://myrepo-6n3c.onrender.com';

// Always point at Render — no localhost detection delay
let API_BASE_URL      = `${RENDER_SERVER_URL}/api`;
let SOCKET_SERVER_URL = RENDER_SERVER_URL;
let ACTIVE_SERVER_URL = RENDER_SERVER_URL;
let IS_LOCAL_SERVER   = false;

console.log(`✅ [API-CONFIG] Using RENDER backend: ${RENDER_SERVER_URL}`);

// ─── Endpoints ────────────────────────────────────────────────────────────────
const API_ENDPOINTS = {
  // Authentication
  register:       `${API_BASE_URL}/auth/register`,
  login:          `${API_BASE_URL}/auth/login`,
  getProfile:     `${API_BASE_URL}/auth/profile`,
  updateProfile:  `${API_BASE_URL}/auth/profile`,
  updateLocation: `${API_BASE_URL}/auth/location`,
  verifyPhone:    `${API_BASE_URL}/auth/verify-phone`,
  verifyID:       `${API_BASE_URL}/auth/verify-id`,
  changePassword: `${API_BASE_URL}/auth/change-password`,

  // Users
  getUser:          (id) => `${API_BASE_URL}/users/${id}`,
  getUserRatings:   (id) => `${API_BASE_URL}/users/${id}/ratings`,
  getNearbyDrivers: `${API_BASE_URL}/users/nearby-drivers`,
  getDriverInfo:    (id) => `${API_BASE_URL}/users/${id}/driver-info`,
  addRating:        (id) => `${API_BASE_URL}/users/${id}/add-rating`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getEndpoint(key, ...args) {
  return typeof API_ENDPOINTS[key] === 'function'
    ? API_ENDPOINTS[key](...args)
    : API_ENDPOINTS[key];
}

function getServerInfo() {
  return {
    activeServer:  ACTIVE_SERVER_URL,
    isLocal:       IS_LOCAL_SERVER,
    apiBaseUrl:    API_BASE_URL,
    socketUrl:     SOCKET_SERVER_URL,
    isDevelopment: false
  };
}

// Expose globally so other scripts can read it
const API_CONFIG = {
  API_BASE_URL,
  SOCKET_SERVER_URL,
  RENDER_SERVER_URL,
  IS_LOCAL_SERVER
};
