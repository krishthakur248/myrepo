// API Configuration - Intelligent Local/Remote Detection
// =====================================================

const RENDER_SERVER_URL = 'https://myrepo-6n3c.onrender.com';
const LOCALHOST_PORTS = [5000, 5001, 3000, 5500]; // Ports to check in order

let API_BASE_URL = `${RENDER_SERVER_URL}/api`;
let SOCKET_SERVER_URL = RENDER_SERVER_URL;
let ACTIVE_SERVER_URL = RENDER_SERVER_URL;
let IS_LOCAL_SERVER = false;

/**
 * Check if localhost is available on a specific port
 * @param {number} port - Port to check
 * @returns {Promise<boolean>}
 */
async function checkLocalhostPort(port) {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`, {
      method: 'GET',
      timeout: 2000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Detect and configure API endpoints
 * Tries localhost first, falls back to Render
 */
async function detectAPIServer() {
  console.log('[API-CONFIG] Detecting available API server...');

  // Try each localhost port
  for (const port of LOCALHOST_PORTS) {
    try {
      console.log(`[API-CONFIG] Checking localhost:${port}...`);
      const isAvailable = await checkLocalhostPort(port);

      if (isAvailable) {
        const LOCAL_URL = `http://localhost:${port}`;
        API_BASE_URL = `${LOCAL_URL}/api`;
        SOCKET_SERVER_URL = LOCAL_URL;
        ACTIVE_SERVER_URL = LOCAL_URL;
        IS_LOCAL_SERVER = true;
        console.log(`✅ [API-CONFIG] Connected to LOCAL server: ${LOCAL_URL}`);
        console.log('[API-CONFIG] Using LOCALHOST for API calls');
        return true;
      }
    } catch (error) {
      console.log(`[API-CONFIG] localhost:${port} not available`);
      continue;
    }
  }

  // Fallback to Render
  console.log(`⚠️  [API-CONFIG] No localhost detected, using RENDER server`);
  console.log(`✅ [API-CONFIG] Using RENDER: ${RENDER_SERVER_URL}`);
  API_BASE_URL = `${RENDER_SERVER_URL}/api`;
  SOCKET_SERVER_URL = RENDER_SERVER_URL;
  ACTIVE_SERVER_URL = RENDER_SERVER_URL;
  IS_LOCAL_SERVER = false;
  return false;
}

/**
 * Initialize API configuration on page load
 */
async function initializeAPIConfig() {
  await detectAPIServer();
  rebuildEndpoints();
}

/**
 * Rebuild all endpoints with current API_BASE_URL
 */
function rebuildEndpoints() {
  Object.assign(API_ENDPOINTS, {
    // Authentication
    register: `${API_BASE_URL}/auth/register`,
    login: `${API_BASE_URL}/auth/login`,
    getProfile: `${API_BASE_URL}/auth/profile`,
    updateProfile: `${API_BASE_URL}/auth/profile`,
    updateLocation: `${API_BASE_URL}/auth/location`,
    verifyPhone: `${API_BASE_URL}/auth/verify-phone`,
    verifyID: `${API_BASE_URL}/auth/verify-id`,
    changePassword: `${API_BASE_URL}/auth/change-password`,

    // Users
    getUser: (id) => `${API_BASE_URL}/users/${id}`,
    getUserRatings: (id) => `${API_BASE_URL}/users/${id}/ratings`,
    getNearbyDrivers: `${API_BASE_URL}/users/nearby-drivers`,
    getDriverInfo: (id) => `${API_BASE_URL}/users/${id}/driver-info`,
    addRating: (id) => `${API_BASE_URL}/users/${id}/add-rating`,
  });
}

const API_ENDPOINTS = {
  // Authentication
  register: `${API_BASE_URL}/auth/register`,
  login: `${API_BASE_URL}/auth/login`,
  getProfile: `${API_BASE_URL}/auth/profile`,
  updateProfile: `${API_BASE_URL}/auth/profile`,
  updateLocation: `${API_BASE_URL}/auth/location`,
  verifyPhone: `${API_BASE_URL}/auth/verify-phone`,
  verifyID: `${API_BASE_URL}/auth/verify-id`,
  changePassword: `${API_BASE_URL}/auth/change-password`,

  // Users
  getUser: (id) => `${API_BASE_URL}/users/${id}`,
  getUserRatings: (id) => `${API_BASE_URL}/users/${id}/ratings`,
  getNearbyDrivers: `${API_BASE_URL}/users/nearby-drivers`,
  getDriverInfo: (id) => `${API_BASE_URL}/users/${id}/driver-info`,
  addRating: (id) => `${API_BASE_URL}/users/${id}/add-rating`,
};

/**
 * Get API endpoint URL with fallback detection
 * @param {string} key - Endpoint key
 * @param {...any} args - Arguments for dynamic endpoints
 * @returns {string} - Full endpoint URL
 */
function getEndpoint(key, ...args) {
  if (typeof API_ENDPOINTS[key] === 'function') {
    return API_ENDPOINTS[key](...args);
  }
  return API_ENDPOINTS[key];
}

/**
 * Get current active server info
 * @returns {object} - Server information
 */
function getServerInfo() {
  return {
    activeServer: ACTIVE_SERVER_URL,
    isLocal: IS_LOCAL_SERVER,
    apiBaseUrl: API_BASE_URL,
    socketUrl: SOCKET_SERVER_URL,
    isDevelopment: IS_LOCAL_SERVER
  };
}

/**
 * Initialize API config when page loads
 */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initializeAPIConfig === 'function') {
    initializeAPIConfig();
  }
});

// Try to initialize immediately if document is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAPIConfig);
} else {
  // Document already loaded, initialize now
  initializeAPIConfig().catch(error => {
    console.error('[API-CONFIG] Failed to initialize:', error);
    // Use Render as fallback
    API_BASE_URL = `${RENDER_SERVER_URL}/api`;
    SOCKET_SERVER_URL = RENDER_SERVER_URL;
    ACTIVE_SERVER_URL = RENDER_SERVER_URL;
    IS_LOCAL_SERVER = false;
    rebuildEndpoints();
  });
}
