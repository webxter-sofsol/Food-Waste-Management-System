import api from './api';

/**
 * Profile Service
 * Handles all profile-related API calls
 */

const profileService = {
  /**
   * Get user profile
   * @returns {Promise} Profile data
   */
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch profile',
        fieldErrors: error.response?.data?.details || {},
      };
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} Updated profile data
   */
  updateProfile: async (profileData) => {
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
        error: error.response?.data?.error || 'Failed to update profile',
        fieldErrors: error.response?.data || {},
      };
    }
  },
};

export default profileService;
