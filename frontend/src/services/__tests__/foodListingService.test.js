import { vi } from 'vitest';
import foodListingService from '../foodListingService';
import api from '../api';

// Mock the api module
vi.mock('../api');

describe('FoodListingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createListing', () => {
    it('creates a food listing with form data', async () => {
      const mockResponse = {
        data: {
          id: 1,
          food_type: 'Test Food',
          status: 'available'
        }
      };
      
      api.post.mockResolvedValue(mockResponse);

      const listingData = {
        food_type: 'Test Food',
        description: 'Test description',
        quantity: 10,
        unit: 'servings'
      };
      
      const images = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ];

      const result = await foodListingService.createListing(listingData, images);

      expect(api.post).toHaveBeenCalledWith(
        '/food-listings',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('creates a food listing without images', async () => {
      const mockResponse = {
        data: {
          id: 1,
          food_type: 'Test Food',
          status: 'available'
        }
      };
      
      api.post.mockResolvedValue(mockResponse);

      const listingData = {
        food_type: 'Test Food',
        description: 'Test description',
        quantity: 10,
        unit: 'servings'
      };

      const result = await foodListingService.createListing(listingData);

      expect(api.post).toHaveBeenCalledWith(
        '/food-listings',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('handles complex object data correctly', async () => {
      const mockResponse = { data: { id: 1 } };
      api.post.mockResolvedValue(mockResponse);

      const listingData = {
        food_type: 'Test Food',
        allergen_info: {
          contains_nuts: true,
          contains_dairy: false
        }
      };

      await foodListingService.createListing(listingData);

      expect(api.post).toHaveBeenCalled();
      
      // Verify FormData was created (we can't easily inspect FormData contents in tests)
      const callArgs = api.post.mock.calls[0];
      expect(callArgs[1]).toBeInstanceOf(FormData);
    });
  });

  describe('getListings', () => {
    it('fetches listings without filters', async () => {
      const mockResponse = {
        data: {
          results: [
            { id: 1, food_type: 'Food 1' },
            { id: 2, food_type: 'Food 2' }
          ]
        }
      };
      
      api.get.mockResolvedValue(mockResponse);

      const result = await foodListingService.getListings();

      expect(api.get).toHaveBeenCalledWith('/food-listings?');
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches listings with filters', async () => {
      const mockResponse = {
        data: {
          results: [{ id: 1, food_type: 'Vegetarian Food' }]
        }
      };
      
      api.get.mockResolvedValue(mockResponse);

      const filters = {
        food_type: 'vegetarian',
        is_vegetarian: true,
        max_distance: 10
      };

      const result = await foodListingService.getListings(filters);

      expect(api.get).toHaveBeenCalledWith('/food-listings?food_type=vegetarian&is_vegetarian=true&max_distance=10');
      expect(result).toEqual(mockResponse.data);
    });

    it('ignores null and undefined filter values', async () => {
      const mockResponse = { data: { results: [] } };
      api.get.mockResolvedValue(mockResponse);

      const filters = {
        food_type: 'vegetarian',
        is_vegetarian: null,
        max_distance: undefined,
        description: ''
      };

      await foodListingService.getListings(filters);

      expect(api.get).toHaveBeenCalledWith('/food-listings?food_type=vegetarian');
    });
  });

  describe('getListing', () => {
    it('fetches a specific listing by ID', async () => {
      const mockResponse = {
        data: {
          id: 1,
          food_type: 'Test Food',
          description: 'Test description'
        }
      };
      
      api.get.mockResolvedValue(mockResponse);

      const result = await foodListingService.getListing(1);

      expect(api.get).toHaveBeenCalledWith('/food-listings/1');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateListing', () => {
    it('updates a listing', async () => {
      const mockResponse = {
        data: {
          id: 1,
          food_type: 'Updated Food',
          description: 'Updated description'
        }
      };
      
      api.put.mockResolvedValue(mockResponse);

      const updateData = {
        food_type: 'Updated Food',
        description: 'Updated description'
      };

      const result = await foodListingService.updateListing(1, updateData);

      expect(api.put).toHaveBeenCalledWith('/food-listings/1', updateData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('deleteListing', () => {
    it('deletes a listing with reason', async () => {
      const mockResponse = { data: { message: 'Listing deleted successfully' } };
      api.delete.mockResolvedValue(mockResponse);

      const result = await foodListingService.deleteListing(1, 'No longer available');

      expect(api.delete).toHaveBeenCalledWith('/food-listings/1', {
        data: { reason: 'No longer available' }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('compareListings', () => {
    it('compares multiple listings', async () => {
      const mockResponse = {
        data: {
          listings: [
            { id: 1, food_type: 'Food 1' },
            { id: 2, food_type: 'Food 2' }
          ],
          differences: ['food_type', 'quantity']
        }
      };
      
      api.post.mockResolvedValue(mockResponse);

      const listingIds = [1, 2, 3];
      const result = await foodListingService.compareListings(listingIds);

      expect(api.post).toHaveBeenCalledWith('/food-listings/compare', {
        listing_ids: listingIds
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('calculateFreshnessScore', () => {
    beforeEach(() => {
      // Mock Date.now() to return a fixed timestamp
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calculates freshness score correctly', () => {
      const preparationTime = new Date('2024-01-01T10:00:00Z'); // 2 hours ago
      const expiryTime = new Date('2024-01-01T16:00:00Z'); // 4 hours from now
      
      // Total shelf life: 6 hours
      // Time remaining: 4 hours
      // Score should be: (4/6) * 100 = 67% (rounded)
      
      const score = foodListingService.calculateFreshnessScore(preparationTime, expiryTime);
      expect(score).toBe(67);
    });

    it('returns 0 for expired food', () => {
      const preparationTime = new Date('2024-01-01T08:00:00Z');
      const expiryTime = new Date('2024-01-01T10:00:00Z'); // 2 hours ago
      
      const score = foodListingService.calculateFreshnessScore(preparationTime, expiryTime);
      expect(score).toBe(0);
    });

    it('returns 0 for missing times', () => {
      expect(foodListingService.calculateFreshnessScore(null, null)).toBe(0);
      expect(foodListingService.calculateFreshnessScore(new Date(), null)).toBe(0);
      expect(foodListingService.calculateFreshnessScore(null, new Date())).toBe(0);
    });

    it('caps score at 100', () => {
      const preparationTime = new Date('2024-01-01T11:00:00Z'); // 1 hour ago
      const expiryTime = new Date('2024-01-01T13:00:00Z'); // 1 hour from now
      
      // This would give > 100% if not capped
      const score = foodListingService.calculateFreshnessScore(preparationTime, expiryTime);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('ensures minimum score of 0', () => {
      const preparationTime = new Date('2024-01-01T06:00:00Z');
      const expiryTime = new Date('2024-01-01T08:00:00Z'); // Way in the past
      
      const score = foodListingService.calculateFreshnessScore(preparationTime, expiryTime);
      expect(score).toBe(0);
    });

    it('handles edge case where preparation time equals expiry time', () => {
      const time = new Date('2024-01-01T12:00:00Z');
      
      const score = foodListingService.calculateFreshnessScore(time, time);
      expect(score).toBe(0);
    });
  });
});