// Authentication Helper Functions

class AuthService {
  // Register new user
  static async register(formData) {
    try {
      const response = await apiClient.post('/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        userType: formData.userType || 'both',
      });

      if (response.success) {
        // Save token
        apiClient.setToken(response.token);
        // Save user info
        localStorage.setItem('user', JSON.stringify(response.user));
        return response;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  static async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });

      if (response.success) {
        // Save token
        apiClient.setToken(response.token);
        // Save user info
        localStorage.setItem('user', JSON.stringify(response.user));
        return response;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  static logout() {
    apiClient.clearToken();
    localStorage.removeItem('user');
    window.location.href = '/Login-Connected.html';
  }

  // Get current user
  static getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Get user profile from API
  static async getProfile() {
    try {
      const response = await apiClient.get('/auth/profile');
      if (response.success) {
        localStorage.setItem('user', JSON.stringify(response.user));
        return response.user;
      }
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(profileData) {
    try {
      // Debug: Check if token exists
      const token = apiClient.getToken();
      console.log('🔐 Token exists:', !!token);
      if (token) {
        console.log('🔐 Token preview:', token.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ NO TOKEN FOUND! User may not be logged in.');
      }

      const response = await apiClient.put('/auth/profile', profileData);
      if (response.success) {
        localStorage.setItem('user', JSON.stringify(response.user));
        return response.user;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Update user location
  static async updateLocation(latitude, longitude) {
    try {
      const response = await apiClient.put('/auth/location', {
        latitude,
        longitude,
      });
      if (response.success) {
        return response.user;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('Update location error:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  static isAuthenticated() {
    return apiClient.isAuthenticated();
  }

  // Check if user is driver
  static isDriver() {
    const user = this.getCurrentUser();
    return user && (user.userType === 'driver' || user.userType === 'both');
  }

  // Check if user is rider
  static isRider() {
    const user = this.getCurrentUser();
    return user && (user.userType === 'rider' || user.userType === 'both');
  }
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!AuthService.isAuthenticated()) {
    window.location.href = '/Login.html';
    return false;
  }
  return true;
}

// Helper to show notifications
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: ${type === 'success' ? '#10B981' : '#EF4444'};
    color: white;
    padding: 16px;
    border-radius: 8px;
    z-index: 9999;
    max-width: 300px;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Helper to show loading spinner
function showLoading(show = true) {
  let spinner = document.getElementById('loading-spinner');
  if (!spinner && show) {
    spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9998;
      background: rgba(0, 0, 0, 0.7);
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    spinner.innerHTML = `
      <div style="
        width: 50px;
        height: 50px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(spinner);
  } else if (spinner && !show) {
    spinner.remove();
  }
}
