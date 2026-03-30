// API Client - Handles all HTTP requests
class APIClient {
  constructor(baseURL) {
    // Use config URL if provided, otherwise fall back to api-config.js or use default
    this.baseURL = baseURL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://myrepo-6n3c.onrender.com/api');
  }

  // Get token from localStorage
  getToken() {
    return localStorage.getItem('authToken');
  }

  // Set token in localStorage
  setToken(token) {
    if (token) {
      localStorage.setItem('authToken', token);
    }
  }

  // Clear token from localStorage
  clearToken() {
    localStorage.removeItem('authToken');
  }

  // Generic GET request
  async get(endpoint, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add authorization token if exists
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers,
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('GET Error:', error);
      throw error;
    }
  }

  // Generic POST request
  async post(endpoint, data = {}, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('POST Error:', error);
      throw error;
    }
  }

  // Generic PUT request
  async put(endpoint, data = {}, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log(`📤 PUT ${endpoint} - Token attached`);
      } else {
        console.warn(`⚠️ PUT ${endpoint} - NO TOKEN ATTACHED!`);
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('PUT Error:', error);
      throw error;
    }
  }

  // Generic DELETE request
  async delete(endpoint, data = {}, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(data),
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('DELETE Error:', error);
      throw error;
    }
  }

  // Handle API response
  async handleResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'API Error');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  }
}

// Create global API client instance (uses config from api-config.js)
const apiClient = new APIClient();
