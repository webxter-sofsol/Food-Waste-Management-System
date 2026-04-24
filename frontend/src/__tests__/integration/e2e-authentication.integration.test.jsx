/**
 * End-to-End Integration Tests for Authentication Flow
 * Task 1.6: Integration testing - Authentication flow
 * 
 * These tests verify the complete authentication flow with actual backend integration
 * Tests are designed to run against a live backend server
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Test user data
const testUsers = {
  donor: {
    email: `donor-${Date.now()}@test.com`,
    username: `donor${Date.now()}`,
    password: 'TestPass123!',
    password_confirm: 'TestPass123!',
    role: 'donor',
    full_name: 'Test Donor',
    organization_name: 'Test Restaurant',
  },
  receiver: {
    email: `receiver-${Date.now()}@test.com`,
    username: `receiver${Date.now()}`,
    password: 'TestPass123!',
    password_confirm: 'TestPass123!',
    role: 'receiver',
    full_name: 'Test Receiver',
  },
  volunteer: {
    email: `volunteer-${Date.now()}@test.com`,
    username: `volunteer${Date.now()}`,
    password: 'TestPass123!',
    password_confirm: 'TestPass123!',
    role: 'volunteer',
    full_name: 'Test Volunteer',
  },
  admin: {
    email: 'admin@test.com',
    username: 'admin',
    password: 'AdminPass123!',
    role: 'admin',
  },
};

describe('E2E Authentication Flow Integration Tests', () => {
  let createdUserIds = [];
  let adminToken = null;

  beforeAll(async () => {
    // Login as admin to approve users later
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUsers.admin.email,
        password: testUsers.admin.password,
      });
      adminToken = response.data.access;
    } catch (error) {
      console.warn('Admin login failed, some tests may be skipped:', error.message);
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test users
    if (adminToken) {
      for (const userId of createdUserIds) {
        try {
          await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
          });
        } catch (error) {
          console.warn(`Failed to delete user ${userId}:`, error.message);
        }
      }
    }
  });

  describe('Complete Registration → Verification → Login Flow', () => {
    it('should register a donor, get verified, and login successfully', async () => {
      // Step 1: Register donor
      const registerResponse = await axios.post(
        `${API_BASE_URL}/auth/register`,
        testUsers.donor
      );

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data.user).toBeDefined();
      expect(registerResponse.data.user.email).toBe(testUsers.donor.email);
      expect(registerResponse.data.user.role).toBe('donor');
      expect(registerResponse.data.user.verification_status).toBe('pending');

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      // Step 2: Verify user cannot login while pending
      try {
        await axios.post(`${API_BASE_URL}/auth/login`, {
          email: testUsers.donor.email,
          password: testUsers.donor.password,
        });
        throw new Error('Should not allow login for pending user');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }

      // Step 3: Admin approves user
      if (adminToken) {
        const approveResponse = await axios.put(
          `${API_BASE_URL}/admin/users/${userId}/verify`,
          {},
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );

        expect(approveResponse.status).toBe(200);
        expect(approveResponse.data.verification_status).toBe('approved');
      } else {
        // Manually approve for testing
        console.warn('Skipping admin approval - no admin token');
        return;
      }

      // Step 4: Login with approved user
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUsers.donor.email,
        password: testUsers.donor.password,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.access).toBeDefined();
      expect(loginResponse.data.refresh).toBeDefined();
      expect(loginResponse.data.user.email).toBe(testUsers.donor.email);
      expect(loginResponse.data.user.verification_status).toBe('approved');

      // Step 5: Access profile with token
      const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${loginResponse.data.access}` },
      });

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.email).toBe(testUsers.donor.email);
      expect(profileResponse.data.role).toBe('donor');
    });

    it('should register a receiver with dietary preferences', async () => {
      // Step 1: Register receiver
      const registerResponse = await axios.post(
        `${API_BASE_URL}/auth/register`,
        testUsers.receiver
      );

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data.user.role).toBe('receiver');

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      // Step 2: Approve user
      if (adminToken) {
        await axios.put(
          `${API_BASE_URL}/admin/users/${userId}/verify`,
          {},
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );
      } else {
        return;
      }

      // Step 3: Login
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUsers.receiver.email,
        password: testUsers.receiver.password,
      });

      const token = loginResponse.data.access;

      // Step 4: Update profile with dietary preferences
      const updateResponse = await axios.put(
        `${API_BASE_URL}/auth/profile`,
        {
          full_name: 'Test Receiver',
          dietary_preferences: ['vegetarian', 'gluten-free'],
          allergies: ['peanuts', 'shellfish'],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.dietary_preferences).toEqual(['vegetarian', 'gluten-free']);
      expect(updateResponse.data.allergies).toEqual(['peanuts', 'shellfish']);

      // Step 5: Verify profile was saved
      const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(profileResponse.data.dietary_preferences).toEqual(['vegetarian', 'gluten-free']);
      expect(profileResponse.data.allergies).toEqual(['peanuts', 'shellfish']);
    });

    it('should register a volunteer with availability', async () => {
      // Step 1: Register volunteer
      const registerResponse = await axios.post(
        `${API_BASE_URL}/auth/register`,
        testUsers.volunteer
      );

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data.user.role).toBe('volunteer');

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      // Step 2: Approve user
      if (adminToken) {
        await axios.put(
          `${API_BASE_URL}/admin/users/${userId}/verify`,
          {},
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );
      } else {
        return;
      }

      // Step 3: Login
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUsers.volunteer.email,
        password: testUsers.volunteer.password,
      });

      const token = loginResponse.data.access;

      // Step 4: Update profile with availability
      const updateResponse = await axios.put(
        `${API_BASE_URL}/auth/profile`,
        {
          full_name: 'Test Volunteer',
          available_time_slots: ['Monday 9-5', 'Wednesday 9-5', 'Friday 9-5'],
          transportation_capacity: 50,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.available_time_slots).toHaveLength(3);
      expect(updateResponse.data.transportation_capacity).toBe(50);
    });
  });

  describe('Role-Based Access Control', () => {
    let donorToken, receiverToken, volunteerToken;
    let donorId, receiverId, volunteerId;

    beforeEach(async () => {
      // Create and approve test users
      if (!adminToken) {
        console.warn('Skipping RBAC tests - no admin token');
        return;
      }

      // Register donor
      const donorResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...testUsers.donor,
        email: `donor-rbac-${Date.now()}@test.com`,
        username: `donor-rbac-${Date.now()}`,
      });
      donorId = donorResponse.data.user.id;
      createdUserIds.push(donorId);

      await axios.put(
        `${API_BASE_URL}/admin/users/${donorId}/verify`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const donorLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: donorResponse.data.user.email,
        password: testUsers.donor.password,
      });
      donorToken = donorLogin.data.access;

      // Register receiver
      const receiverResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...testUsers.receiver,
        email: `receiver-rbac-${Date.now()}@test.com`,
        username: `receiver-rbac-${Date.now()}`,
      });
      receiverId = receiverResponse.data.user.id;
      createdUserIds.push(receiverId);

      await axios.put(
        `${API_BASE_URL}/admin/users/${receiverId}/verify`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const receiverLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: receiverResponse.data.user.email,
        password: testUsers.receiver.password,
      });
      receiverToken = receiverLogin.data.access;
    });

    it('should restrict admin endpoints to admin users only', async () => {
      if (!adminToken || !donorToken) return;

      // Admin should access admin endpoints
      const adminResponse = await axios.get(
        `${API_BASE_URL}/admin/pending-verifications`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      expect(adminResponse.status).toBe(200);

      // Donor should not access admin endpoints
      try {
        await axios.get(`${API_BASE_URL}/admin/pending-verifications`, {
          headers: { Authorization: `Bearer ${donorToken}` },
        });
        throw new Error('Should not allow donor to access admin endpoints');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });

    it('should allow users to access their own profile only', async () => {
      if (!donorToken || !receiverToken) return;

      // Donor should access their own profile
      const donorProfile = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      expect(donorProfile.status).toBe(200);

      // Receiver should access their own profile
      const receiverProfile = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${receiverToken}` },
      });
      expect(receiverProfile.status).toBe(200);

      // Profiles should be different
      expect(donorProfile.data.id).not.toBe(receiverProfile.data.id);
    });
  });

  describe('JWT Token Refresh and Session Management', () => {
    it('should refresh access token using refresh token', async () => {
      // Register and login user
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...testUsers.donor,
        email: `donor-refresh-${Date.now()}@test.com`,
        username: `donor-refresh-${Date.now()}`,
      });

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      if (adminToken) {
        await axios.put(
          `${API_BASE_URL}/admin/users/${userId}/verify`,
          {},
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } else {
        return;
      }

      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: registerResponse.data.user.email,
        password: testUsers.donor.password,
      });

      const refreshToken = loginResponse.data.refresh;

      // Refresh access token
      const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh: refreshToken,
      });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.data.access).toBeDefined();
      expect(refreshResponse.data.access).not.toBe(loginResponse.data.access);

      // Verify new token works
      const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${refreshResponse.data.access}` },
      });

      expect(profileResponse.status).toBe(200);
    });

    it('should reject invalid refresh token', async () => {
      try {
        await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh: 'invalid-refresh-token',
        });
        throw new Error('Should reject invalid refresh token');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should logout and invalidate refresh token', async () => {
      // Register and login user
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...testUsers.donor,
        email: `donor-logout-${Date.now()}@test.com`,
        username: `donor-logout-${Date.now()}`,
      });

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      if (adminToken) {
        await axios.put(
          `${API_BASE_URL}/admin/users/${userId}/verify`,
          {},
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } else {
        return;
      }

      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: registerResponse.data.user.email,
        password: testUsers.donor.password,
      });

      const accessToken = loginResponse.data.access;
      const refreshToken = loginResponse.data.refresh;

      // Logout
      const logoutResponse = await axios.post(
        `${API_BASE_URL}/auth/logout`,
        { refresh: refreshToken },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(logoutResponse.status).toBe(200);

      // Verify refresh token is invalidated
      try {
        await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh: refreshToken,
        });
        throw new Error('Should reject invalidated refresh token');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Admin Verification Workflow', () => {
    it('should list pending verifications for admin', async () => {
      if (!adminToken) {
        console.warn('Skipping admin verification tests - no admin token');
        return;
      }

      // Register a new user
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...testUsers.donor,
        email: `donor-pending-${Date.now()}@test.com`,
        username: `donor-pending-${Date.now()}`,
      });

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      // Get pending verifications
      const pendingResponse = await axios.get(
        `${API_BASE_URL}/admin/pending-verifications`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(pendingResponse.status).toBe(200);
      expect(pendingResponse.data.results).toBeDefined();

      // Find our user in pending list
      const pendingUser = pendingResponse.data.results.find((u) => u.id === userId);
      expect(pendingUser).toBeDefined();
      expect(pendingUser.verification_status).toBe('pending');
    });

    it('should approve user and send confirmation', async () => {
      if (!adminToken) return;

      // Register a new user
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...testUsers.donor,
        email: `donor-approve-${Date.now()}@test.com`,
        username: `donor-approve-${Date.now()}`,
      });

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      // Approve user
      const approveResponse = await axios.put(
        `${API_BASE_URL}/admin/users/${userId}/verify`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.data.verification_status).toBe('approved');

      // Verify user can now login
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: registerResponse.data.user.email,
        password: testUsers.donor.password,
      });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject user with reason', async () => {
      if (!adminToken) return;

      // Register a new user
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...testUsers.donor,
        email: `donor-reject-${Date.now()}@test.com`,
        username: `donor-reject-${Date.now()}`,
      });

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      // Reject user
      const rejectResponse = await axios.put(
        `${API_BASE_URL}/admin/users/${userId}/reject`,
        {
          reason: 'Invalid documentation provided',
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.data.verification_status).toBe('rejected');

      // Verify user cannot login
      try {
        await axios.post(`${API_BASE_URL}/auth/login`, {
          email: registerResponse.data.user.email,
          password: testUsers.donor.password,
        });
        throw new Error('Should not allow rejected user to login');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Profile Management', () => {
    it('should update and persist profile changes', async () => {
      // Register and login user
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...testUsers.donor,
        email: `donor-profile-${Date.now()}@test.com`,
        username: `donor-profile-${Date.now()}`,
      });

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      if (adminToken) {
        await axios.put(
          `${API_BASE_URL}/admin/users/${userId}/verify`,
          {},
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } else {
        return;
      }

      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: registerResponse.data.user.email,
        password: testUsers.donor.password,
      });

      const token = loginResponse.data.access;

      // Update profile
      const updateData = {
        full_name: 'Updated Donor Name',
        organization_name: 'Updated Restaurant',
        phone: '9876543210',
        address: '456 Updated St',
        food_types: ['Italian', 'Chinese'],
        operating_hours: { monday: '9-5', tuesday: '9-5' },
      };

      const updateResponse = await axios.put(
        `${API_BASE_URL}/auth/profile`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.full_name).toBe('Updated Donor Name');
      expect(updateResponse.data.organization_name).toBe('Updated Restaurant');

      // Verify changes persisted
      const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(profileResponse.data.full_name).toBe('Updated Donor Name');
      expect(profileResponse.data.organization_name).toBe('Updated Restaurant');
      expect(profileResponse.data.phone).toBe('9876543210');
      expect(profileResponse.data.address).toBe('456 Updated St');
    });

    it('should validate profile updates', async () => {
      // Register and login user
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...testUsers.donor,
        email: `donor-validate-${Date.now()}@test.com`,
        username: `donor-validate-${Date.now()}`,
      });

      const userId = registerResponse.data.user.id;
      createdUserIds.push(userId);

      if (adminToken) {
        await axios.put(
          `${API_BASE_URL}/admin/users/${userId}/verify`,
          {},
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } else {
        return;
      }

      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: registerResponse.data.user.email,
        password: testUsers.donor.password,
      });

      const token = loginResponse.data.access;

      // Try to update with invalid data
      try {
        await axios.put(
          `${API_BASE_URL}/auth/profile`,
          {
            phone: 'invalid-phone-number-with-letters',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        throw new Error('Should reject invalid phone number');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
