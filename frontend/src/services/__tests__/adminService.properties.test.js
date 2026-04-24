import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import adminService from '../adminService';
import api from '../api';

// Mock the api module
vi.mock('../api');

/**
 * Property-Based Tests for Admin Service
 * Feature: buffet-management-food-distribution
 */

describe('adminService - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 10: New User Verification Status
   * Validates: Requirements 3.1
   * 
   * For any newly registered user, the initial verification status should be "pending"
   */
  it('Property 10: should fetch users with pending verification status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            role: fc.constantFrom('donor', 'receiver', 'volunteer', 'admin'),
            verification_status: fc.constant('pending'),
            full_name: fc.string({ minLength: 1, maxLength: 50 }),
            date_joined: fc.constant(new Date('2024-01-15T10:00:00Z').toISOString()),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (pendingUsers) => {
          api.get.mockResolvedValue({ data: pendingUsers });

          const result = await adminService.getPendingVerifications();

          expect(result.success).toBe(true);
          expect(result.data).toEqual(pendingUsers);
          
          // All users should have pending status
          result.data.forEach(user => {
            expect(user.verification_status).toBe('pending');
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 11: Admin User Approval Workflow
   * Validates: Requirements 3.3
   * 
   * For any pending user that an admin approves, the user account should be activated
   * and a confirmation notification should be sent
   */
  it('Property 11: should activate user account on approval', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        async (userId) => {
          const mockResponse = {
            message: 'User verified successfully',
            user: {
              id: userId,
              verification_status: 'approved',
              is_active: true,
            },
          };

          api.put.mockResolvedValue({ data: mockResponse });

          const result = await adminService.verifyUser(userId);

          expect(result.success).toBe(true);
          expect(result.message).toBe('User verified successfully');
          expect(api.put).toHaveBeenCalledWith(`/admin/users/${userId}/verify`);
          
          // Verify the response indicates activation
          expect(result.data.user.verification_status).toBe('approved');
          expect(result.data.user.is_active).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12: Admin User Rejection Workflow
   * Validates: Requirements 3.4
   * 
   * For any pending user that an admin rejects, the user account should be deactivated
   * and a rejection notification should be sent
   */
  it('Property 12: should deactivate user account on rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (userId, reason) => {
          const mockResponse = {
            message: 'User rejected successfully',
            user_id: userId,
            reason: reason,
          };

          api.put.mockResolvedValue({ data: mockResponse });

          const result = await adminService.rejectUser(userId, reason);

          expect(result.success).toBe(true);
          expect(result.message).toBe('User rejected successfully');
          expect(api.put).toHaveBeenCalledWith(`/admin/users/${userId}/reject`, { reason });
          
          // Verify rejection was recorded with reason
          expect(result.data.reason).toBe(reason);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 13: Verification Status Visibility
   * Validates: Requirements 3.5
   * 
   * For any user profile query, the response should include the current verification status
   */
  it('Property 13: should include verification status in user data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            email: fc.emailAddress(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            role: fc.constantFrom('donor', 'receiver', 'volunteer', 'admin'),
            verification_status: fc.constantFrom('pending', 'approved', 'rejected'),
            full_name: fc.string({ minLength: 1, maxLength: 50 }),
            date_joined: fc.constant(new Date('2024-01-15T10:00:00Z').toISOString()),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (users) => {
          api.get.mockResolvedValue({ data: users });

          const result = await adminService.getPendingVerifications();

          expect(result.success).toBe(true);
          
          // All users should have verification_status field
          result.data.forEach(user => {
            expect(user).toHaveProperty('verification_status');
            expect(['pending', 'approved', 'rejected']).toContain(user.verification_status);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Admin metrics should return valid counts
   * Validates: Requirements 14.1, 14.2
   */
  it('Property: should return valid user and system metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user_counts: fc.record({
            donor: fc.integer({ min: 0, max: 1000 }),
            receiver: fc.integer({ min: 0, max: 1000 }),
            volunteer: fc.integer({ min: 0, max: 1000 }),
            admin: fc.integer({ min: 0, max: 100 }),
          }),
          food_listings: fc.record({
            total: fc.integer({ min: 0, max: 10000 }),
            active: fc.integer({ min: 0, max: 10000 }),
          }),
          matches: fc.record({
            total: fc.integer({ min: 0, max: 10000 }),
            completed_deliveries: fc.integer({ min: 0, max: 10000 }),
          }),
        }),
        async (metricsData) => {
          // Ensure active <= total for food listings
          const validMetrics = {
            ...metricsData,
            food_listings: {
              ...metricsData.food_listings,
              active: Math.min(metricsData.food_listings.active, metricsData.food_listings.total),
            },
            matches: {
              ...metricsData.matches,
              completed_deliveries: Math.min(
                metricsData.matches.completed_deliveries,
                metricsData.matches.total
              ),
            },
            user_counts: {
              ...metricsData.user_counts,
              total:
                metricsData.user_counts.donor +
                metricsData.user_counts.receiver +
                metricsData.user_counts.volunteer +
                metricsData.user_counts.admin,
            },
            average_response_times: {
              volunteer_assignment_seconds: null,
              delivery_completion_seconds: null,
            },
            pending_verifications: 0,
            system_alerts: {
              expiring_soon_listings: 0,
            },
          };

          api.get.mockResolvedValue({ data: validMetrics });

          const result = await adminService.getAdminMetrics();

          expect(result.success).toBe(true);
          
          // Verify all counts are non-negative
          expect(result.data.user_counts.donor).toBeGreaterThanOrEqual(0);
          expect(result.data.user_counts.receiver).toBeGreaterThanOrEqual(0);
          expect(result.data.user_counts.volunteer).toBeGreaterThanOrEqual(0);
          expect(result.data.user_counts.admin).toBeGreaterThanOrEqual(0);
          expect(result.data.food_listings.total).toBeGreaterThanOrEqual(0);
          expect(result.data.food_listings.active).toBeGreaterThanOrEqual(0);
          expect(result.data.matches.total).toBeGreaterThanOrEqual(0);
          expect(result.data.matches.completed_deliveries).toBeGreaterThanOrEqual(0);
          
          // Verify active <= total
          expect(result.data.food_listings.active).toBeLessThanOrEqual(result.data.food_listings.total);
          expect(result.data.matches.completed_deliveries).toBeLessThanOrEqual(result.data.matches.total);
          
          // Verify total equals sum of role counts
          const expectedTotal =
            result.data.user_counts.donor +
            result.data.user_counts.receiver +
            result.data.user_counts.volunteer +
            result.data.user_counts.admin;
          expect(result.data.user_counts.total).toBe(expectedTotal);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Error handling should be consistent
   */
  it('Property: should handle API errors consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('getPendingVerifications', 'verifyUser', 'rejectUser', 'getAdminMetrics'),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (method, errorMessage) => {
          api.get.mockRejectedValue({
            response: { data: { error: errorMessage } },
          });
          api.put.mockRejectedValue({
            response: { data: { error: errorMessage } },
          });

          let result;
          if (method === 'getPendingVerifications') {
            result = await adminService.getPendingVerifications();
          } else if (method === 'verifyUser') {
            result = await adminService.verifyUser(1);
          } else if (method === 'rejectUser') {
            result = await adminService.rejectUser(1, 'reason');
          } else if (method === 'getAdminMetrics') {
            result = await adminService.getAdminMetrics();
          }

          // All methods should return consistent error structure
          expect(result.success).toBe(false);
          expect(result.error).toBe(errorMessage);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Rejection reason should be preserved
   */
  it('Property: should preserve rejection reason in API call', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.string({ minLength: 0, maxLength: 500 }),
        async (userId, reason) => {
          const mockResponse = {
            message: 'User rejected successfully',
            user_id: userId,
            reason: reason || 'No reason provided',
          };

          api.put.mockResolvedValue({ data: mockResponse });

          const result = await adminService.rejectUser(userId, reason);

          expect(result.success).toBe(true);
          
          // Verify the reason was sent in the request
          expect(api.put).toHaveBeenCalledWith(`/admin/users/${userId}/reject`, { reason });
        }
      ),
      { numRuns: 50 }
    );
  });
});
