import { describe, it, expect, vi, beforeEach } from 'vitest';
import adminService from '../adminService';
import api from '../api';

// Mock the api module
vi.mock('../api');

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPendingVerifications', () => {
    it('should fetch pending verifications successfully', async () => {
      const mockData = [
        {
          id: 1,
          email: 'user@example.com',
          username: 'testuser',
          role: 'donor',
          verification_status: 'pending',
          full_name: 'Test User',
          date_joined: '2024-01-01T00:00:00Z',
        },
      ];

      api.get.mockResolvedValue({ data: mockData });

      const result = await adminService.getPendingVerifications();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(api.get).toHaveBeenCalledWith('/admin/pending-verifications');
    });

    it('should handle errors when fetching pending verifications', async () => {
      const errorMessage = 'Network error';
      api.get.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      const result = await adminService.getPendingVerifications();

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('verifyUser', () => {
    it('should verify user successfully', async () => {
      const userId = 1;
      const mockResponse = {
        message: 'User verified successfully',
        user: { id: userId, verification_status: 'approved' },
      };

      api.put.mockResolvedValue({ data: mockResponse });

      const result = await adminService.verifyUser(userId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(mockResponse.message);
      expect(api.put).toHaveBeenCalledWith(`/admin/users/${userId}/verify`);
    });

    it('should handle errors when verifying user', async () => {
      const userId = 1;
      const errorMessage = 'User not found';
      
      api.put.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      const result = await adminService.verifyUser(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });

    it('should handle already verified user error', async () => {
      const userId = 1;
      const errorMessage = 'User is already verified';
      
      api.put.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      const result = await adminService.verifyUser(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('rejectUser', () => {
    it('should reject user successfully with reason', async () => {
      const userId = 1;
      const reason = 'Incomplete information';
      const mockResponse = {
        message: 'User rejected successfully',
        user_id: userId,
        reason: reason,
      };

      api.put.mockResolvedValue({ data: mockResponse });

      const result = await adminService.rejectUser(userId, reason);

      expect(result.success).toBe(true);
      expect(result.message).toBe(mockResponse.message);
      expect(api.put).toHaveBeenCalledWith(`/admin/users/${userId}/reject`, { reason });
    });

    it('should reject user with empty reason', async () => {
      const userId = 1;
      const reason = '';
      const mockResponse = {
        message: 'User rejected successfully',
        user_id: userId,
        reason: 'No reason provided',
      };

      api.put.mockResolvedValue({ data: mockResponse });

      const result = await adminService.rejectUser(userId, reason);

      expect(result.success).toBe(true);
      expect(api.put).toHaveBeenCalledWith(`/admin/users/${userId}/reject`, { reason });
    });

    it('should handle errors when rejecting user', async () => {
      const userId = 1;
      const reason = 'Invalid credentials';
      const errorMessage = 'User not found';
      
      api.put.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      const result = await adminService.rejectUser(userId, reason);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('getAdminMetrics', () => {
    it('should fetch admin metrics successfully', async () => {
      const mockMetrics = {
        user_counts: {
          donor: 10,
          receiver: 20,
          volunteer: 5,
          admin: 2,
          total: 37,
        },
        food_listings: {
          total: 50,
          active: 30,
        },
        matches: {
          total: 40,
          completed_deliveries: 35,
        },
        average_response_times: {
          volunteer_assignment_seconds: 600,
          delivery_completion_seconds: 3600,
        },
        pending_verifications: 3,
        system_alerts: {
          expiring_soon_listings: 2,
        },
      };

      api.get.mockResolvedValue({ data: mockMetrics });

      const result = await adminService.getAdminMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMetrics);
      expect(api.get).toHaveBeenCalledWith('/admin/metrics');
    });

    it('should handle errors when fetching metrics', async () => {
      const errorMessage = 'Unauthorized';
      api.get.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      const result = await adminService.getAdminMetrics();

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('getAdminReports', () => {
    it('should fetch admin reports with filters', async () => {
      const filters = {
        type: 'users',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        role: 'donor',
      };

      const mockReportData = {
        report_type: 'users',
        filters: filters,
        data: [{ id: 1, email: 'user@example.com' }],
        count: 1,
      };

      api.get.mockResolvedValue({ data: mockReportData });

      const result = await adminService.getAdminReports(filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReportData);
      expect(api.get).toHaveBeenCalledWith('/admin/reports', { params: filters });
    });

    it('should fetch reports without filters', async () => {
      const mockReportData = {
        report_type: 'users',
        data: [],
        count: 0,
      };

      api.get.mockResolvedValue({ data: mockReportData });

      const result = await adminService.getAdminReports();

      expect(result.success).toBe(true);
      expect(api.get).toHaveBeenCalledWith('/admin/reports', { params: {} });
    });
  });

  describe('exportReport', () => {
    it('should export report as CSV', async () => {
      const exportData = {
        format: 'csv',
        type: 'users',
        start_date: '2024-01-01',
      };

      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      api.post.mockResolvedValue({ data: mockBlob });

      const result = await adminService.exportReport(exportData);

      expect(result.success).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/admin/reports/export', exportData, {
        responseType: 'blob',
      });
    });

    it('should handle export errors', async () => {
      const exportData = { format: 'csv', type: 'users' };
      const errorMessage = 'Export failed';
      
      api.post.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      const result = await adminService.exportReport(exportData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });
});
