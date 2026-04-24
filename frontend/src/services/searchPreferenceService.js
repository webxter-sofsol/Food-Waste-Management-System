import api from './api';
import { storage } from '../utils/helpers';

/**
 * Search Preference Service
 * Handles saving and loading user search preferences
 */
class SearchPreferenceService {
  /**
   * Get user's search preferences from server
   * @returns {Promise} API response
   */
  async getPreferences() {
    try {
      const response = await api.get('/search-preferences');
      return response.data;
    } catch (error) {
      // If server request fails, fall back to local storage
      console.warn('Failed to load server preferences, using local storage:', error);
      return this.getLocalPreferences();
    }
  }

  /**
   * Save user's search preferences to server
   * @param {Object} preferences - Search preferences object
   * @returns {Promise} API response
   */
  async savePreferences(preferences) {
    try {
      const response = await api.put('/search-preferences', preferences);
      // Also save to local storage as backup
      this.saveLocalPreferences(preferences);
      return response.data;
    } catch (error) {
      // If server request fails, save to local storage only
      console.warn('Failed to save server preferences, using local storage:', error);
      this.saveLocalPreferences(preferences);
      return preferences;
    }
  }

  /**
   * Get preferences from local storage
   * @returns {Object} Local preferences
   */
  getLocalPreferences() {
    const defaultPreferences = {
      filters: {
        max_distance: 10,
        max_expiry_hours: 24,
      },
      sortBy: 'freshness_score',
      sortOrder: 'desc',
      recentSearches: [],
    };

    const saved = storage.get('searchPreferences');
    return saved ? { ...defaultPreferences, ...saved } : defaultPreferences;
  }

  /**
   * Save preferences to local storage
   * @param {Object} preferences - Preferences to save
   */
  saveLocalPreferences(preferences) {
    const current = this.getLocalPreferences();
    const updated = { ...current, ...preferences };
    storage.set('searchPreferences', updated);
  }

  /**
   * Add a search query to recent searches
   * @param {string} query - Search query to add
   */
  addRecentSearch(query) {
    if (!query || query.trim() === '') return;

    const preferences = this.getLocalPreferences();
    const recentSearches = preferences.recentSearches || [];
    
    // Remove if already exists
    const filtered = recentSearches.filter(search => search !== query);
    
    // Add to beginning and limit to 5
    const updated = [query, ...filtered].slice(0, 5);
    
    const newPreferences = {
      ...preferences,
      recentSearches: updated,
    };

    this.saveLocalPreferences(newPreferences);
    
    // Also try to save to server
    this.savePreferences(newPreferences).catch(error => {
      console.warn('Failed to sync recent searches to server:', error);
    });
  }

  /**
   * Get recent search queries
   * @returns {string[]} Array of recent search queries
   */
  getRecentSearches() {
    const preferences = this.getLocalPreferences();
    return preferences.recentSearches || [];
  }

  /**
   * Clear all recent searches
   */
  clearRecentSearches() {
    const preferences = this.getLocalPreferences();
    const updated = {
      ...preferences,
      recentSearches: [],
    };
    
    this.saveLocalPreferences(updated);
    this.savePreferences(updated).catch(error => {
      console.warn('Failed to sync cleared searches to server:', error);
    });
  }

  /**
   * Reset all preferences to defaults
   */
  resetPreferences() {
    const defaultPreferences = {
      filters: {
        max_distance: 10,
        max_expiry_hours: 24,
      },
      sortBy: 'freshness_score',
      sortOrder: 'desc',
      recentSearches: [],
    };

    this.saveLocalPreferences(defaultPreferences);
    this.savePreferences(defaultPreferences).catch(error => {
      console.warn('Failed to sync reset preferences to server:', error);
    });

    return defaultPreferences;
  }
}

export default new SearchPreferenceService();