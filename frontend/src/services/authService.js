import api from './api';

/**
 * Authentication service for handling all auth-related API calls
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {File|null} verificationDocument - Optional verification document file
   * @returns {Promise<Object>} Registration result
   */
  async register(userData, verificationDocument = null) {
    try {
      let payload;
      let headers = {};

      if (verificationDocument) {
        // Use multipart/form-data when a file is attached
        payload = new FormData();
        Object.entries(userData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            payload.append(key, value);
          }
        });
        payload.append('verification_document', verificationDocument);
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        payload = userData;
      }

      const response = await api.post('/auth/register', payload, { headers });
      return {
        success: true,
        data: response.data,
        message: 'Registration successful. Please wait for admin verification.',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
        fieldErrors: error.response?.data?.errors || null,
      };
    }
  }

  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login result with tokens and user data
   */
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access, refresh, user } = response.data;

      // Store tokens in localStorage
      this.setTokens(access, refresh);

      return {
        success: true,
        data: { user, access, refresh },
        message: 'Login successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
        fieldErrors: error.response?.data?.errors || null,
      };
    }
  }

  /**
   * Logout user and clear tokens
   * @returns {Promise<Object>} Logout result
   */
  async logout() {
    try {
      await api.post('/auth/logout');
      this.clearTokens();
      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      // Clear tokens even if API call fails
      this.clearTokens();
      return {
        success: true,
        message: 'Logout completed',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<Object>} Refresh result
   */
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh-token', {
        refresh: refreshToken,
      });

      const { access } = response.data;
      this.setAccessToken(access);

      return {
        success: true,
        data: { access },
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      this.clearTokens();
      return {
        success: false,
        error: error.response?.data?.message || 'Token refresh failed',
      };
    }
  }

  /**
   * Verify current session and get user data
   * @returns {Promise<Object>} Session verification result
   */
  async verifySession() {
    try {
      const response = await api.get('/auth/verify-session');
      return {
        success: true,
        data: response.data,
        message: 'Session verified',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Session verification failed',
      };
    }
  }

  /**
   * Get user profile data
   * @returns {Promise<Object>} Profile data result
   */
  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return {
        success: true,
        data: response.data,
        message: 'Profile retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to retrieve profile',
      };
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile update data
   * @returns {Promise<Object>} Profile update result
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', profileData);
      return {
        success: true,
        data: response.data,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Profile update failed',
        fieldErrors: error.response?.data?.errors || null,
      };
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Password reset request result
   */
  async requestPasswordReset(email) {
    try {
      const response = await api.post('/auth/password-reset', { email });
      return {
        success: true,
        data: response.data,
        message: 'Password reset email sent',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Password reset request failed',
      };
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Password reset result
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/auth/password-reset/confirm', {
        token,
        new_password: newPassword,
      });
      return {
        success: true,
        data: response.data,
        message: 'Password reset successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Password reset failed',
      };
    }
  }

  // Token management methods
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  setAccessToken(accessToken) {
    localStorage.setItem('access_token', accessToken);
  }

  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  isAuthenticated() {
    return !!this.getAccessToken();
  }

  /**
   * Decode JWT token to get user info (without verification)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload
   */
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired
   */
  isTokenExpired(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  }

  /**
   * Get time until token expires
   * @param {string} token - JWT token
   * @returns {number} Seconds until expiration, or 0 if expired
   */
  getTokenExpirationTime(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return 0;
    
    const currentTime = Date.now() / 1000;
    const timeUntilExpiry = decoded.exp - currentTime;
    return Math.max(0, timeUntilExpiry);
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;