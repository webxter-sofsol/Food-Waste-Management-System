import api from './api';

/**
 * Food Listing Service
 * Handles all API calls related to food listings
 */
class FoodListingService {
  /**
   * Create a new food listing
   * @param {Object} listingData - The food listing data
   * @param {File[]} images - Array of image files (max 5)
   * @returns {Promise} API response
   */
  async createListing(listingData, images = []) {
    const formData = new FormData();
    
    // Add listing data
    Object.keys(listingData).forEach(key => {
      if (listingData[key] !== null && listingData[key] !== undefined) {
        if (typeof listingData[key] === 'object' && !Array.isArray(listingData[key])) {
          formData.append(key, JSON.stringify(listingData[key]));
        } else {
          formData.append(key, listingData[key]);
        }
      }
    });
    
    // Add images
    images.forEach((image, index) => {
      formData.append(`image_${index}`, image);
    });
    
    const response = await api.post('/food-listings/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  /**
   * Get all food listings with optional filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise} API response
   */
  async getListings(filters = {}) {
    const response = await api.get('/food-listings/browse/', { params: filters });
    return response.data;
  }

  /**
   * Get a specific food listing by ID
   * @param {number} id - Listing ID
   * @returns {Promise} API response
   */
  async getListing(id) {
    const response = await api.get(`/food-listings/${id}/`);
    return response.data;
  }

  /**
   * Update a food listing
   * @param {number} id - Listing ID
   * @param {Object} listingData - Updated listing data
   * @returns {Promise} API response
   */
  async updateListing(id, listingData) {
    const response = await api.put(`/food-listings/${id}/update/`, listingData);
    return response.data;
  }

  /**
   * Delete a food listing
   * @param {number} id - Listing ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise} API response
   */
  async deleteListing(id, reason) {
    const response = await api.delete(`/food-listings/${id}`, {
      data: { reason }
    });
    return response.data;
  }

  /**
   * Compare multiple food listings
   * @param {number[]} listingIds - Array of listing IDs (max 4)
   * @returns {Promise} API response
   */
  async compareListings(listingIds) {
    const response = await api.post('/food-listings/compare', {
      listing_ids: listingIds
    });
    return response.data;
  }

  /**
   * Calculate freshness score for given times
   * @param {Date} preparationTime - When food was prepared
   * @param {Date} expiryTime - When food expires
   * @returns {number} Freshness score (0-100)
   */
  calculateFreshnessScore(preparationTime, expiryTime) {
    if (!preparationTime || !expiryTime) return 0;
    
    const now = new Date();
    const prepTime = new Date(preparationTime);
    const expTime = new Date(expiryTime);
    
    // Total shelf life in milliseconds
    const totalShelfLife = expTime.getTime() - prepTime.getTime();
    
    // Time remaining in milliseconds
    const timeRemaining = expTime.getTime() - now.getTime();
    
    // If expired, score is 0
    if (timeRemaining <= 0) return 0;
    
    // Calculate score as percentage of remaining shelf life
    const score = (timeRemaining / totalShelfLife) * 100;
    
    // Cap at 100 and ensure minimum of 0
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

export default new FoodListingService();
