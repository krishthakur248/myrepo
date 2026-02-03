// API Configuration
const API_BASE_URL = 'http://localhost:5001/api';

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

// Helper to get API endpoint URL
function getEndpoint(key, ...args) {
  if (typeof API_ENDPOINTS[key] === 'function') {
    return API_ENDPOINTS[key](...args);
  }
  return API_ENDPOINTS[key];
}
