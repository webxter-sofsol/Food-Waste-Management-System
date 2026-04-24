import { describe, it, expect, vi, beforeEach } from 'vitest';
import profileService from '../profileService';
import api from '../api';

// Mock the api module
vi.mock('../api');

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should successfully fetch profile data', async () => {
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        role: 'donor',
        full_name: 'Test User',
        phone: '1234567890',
        address: '123 Test St',
        average_rating: 4.5,
        total_ratings: 10,
      };

      api.get.mockResolvedValue({ data: mockProfile });

      const result = await profileService.getProfile();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfile);
      expect(api.get).toHaveBeenCalledWith('/profile');
    });

    it('should handle fetch profile error', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Profile not found',
          },
        },
      };

      api.get.mockRejectedValue(mockError);

      const result = await profileService.getProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile not found');
    });

    it('should handle network error', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      const result = await profileService.getProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch profile');
    });
  });

  describe('updateProfile', () => {
    it('should successfully update profile', async () => {
      const profileData = {
        full_name: 'Updated Name',
        phone: '9876543210',
        address: '456 New St',
      };

      const mockResponse = {
        ...profileData,
        id: 1,
        email: 'test@example.com',
        role: 'donor',
      };

      api.put.mockResolvedValue({ data: mockResponse });

      const result = await profileService.updateProfile(profileData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(result.message).toBe('Profile updated successfully');
      expect(api.put).toHaveBeenCalledWith('/profile', profileData);
    });

    it('should handle validation errors', async () => {
      const profileData = {
        full_name: '',
        phone: 'invalid',
      };

      const mockError = {
        response: {
          data: {
            full_name: ['This field is required'],
            phone: ['Invalid phone number'],
          },
        },
      };

      api.put.mockRejectedValue(mockError);

      const result = await profileService.updateProfile(profileData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update profile');
      expect(result.fieldErrors).toEqual(mockError.response.data);
    });

    it('should handle update error', async () => {
      const profileData = {
        full_name: 'Test User',
      };

      const mockError = {
        response: {
          data: {
            error: 'Update failed',
          },
        },
      };

      api.put.mockRejectedValue(mockError);

      const result = await profileService.updateProfile(profileData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle network error during update', async () => {
      const profileData = {
        full_name: 'Test User',
      };

      api.put.mockRejectedValue(new Error('Network error'));

      const result = await profileService.updateProfile(profileData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update profile');
    });
  });

  describe('role-specific profile updates', () => {
    it('should update receiver profile with dietary preferences', async () => {
      const profileData = {
        full_name: 'Receiver User',
        dietary_preferences: ['Vegetarian', 'Gluten-free'],
        allergies: ['Peanuts'],
      };

      const mockResponse = {
        ...profileData,
        id: 1,
        email: 'receiver@example.com',
        role: 'receiver',
      };

      api.put.mockResolvedValue({ data: mockResponse });

      const result = await profileService.updateProfile(profileData);

      expect(result.success).toBe(true);
      expect(result.data.dietary_preferences).toEqual(['Vegetarian', 'Gluten-free']);
      expect(result.data.allergies).toEqual(['Peanuts']);
    });

    it('should update donor profile with organization info', async () => {
      const profileData = {
        full_name: 'Donor User',
        organization_name: 'Test Restaurant',
        food_types: ['Indian', 'Chinese'],
        operating_hours: { monday: '9:00-17:00' },
      };

      const mockResponse = {
        ...profileData,
        id: 1,
        email: 'donor@example.com',
        role: 'donor',
      };

      api.put.mockResolvedValue({ data: mockResponse });

      const result = await profileService.updateProfile(profileData);

      expect(result.success).toBe(true);
      expect(result.data.organization_name).toBe('Test Restaurant');
      expect(result.data.food_types).toEqual(['Indian', 'Chinese']);
    });

    it('should update volunteer profile with availability', async () => {
      const profileData = {
        full_name: 'Volunteer User',
        available_time_slots: ['Weekday Mornings', 'Weekend Afternoons'],
        transportation_capacity: 50,
      };

      const mockResponse = {
        ...profileData,
        id: 1,
        email: 'volunteer@example.com',
        role: 'volunteer',
      };

      api.put.mockResolvedValue({ data: mockResponse });

      const result = await profileService.updateProfile(profileData);

      expect(result.success).toBe(true);
      expect(result.data.available_time_slots).toEqual([
        'Weekday Mornings',
        'Weekend Afternoons',
      ]);
      expect(result.data.transportation_capacity).toBe(50);
    });
  });
});
