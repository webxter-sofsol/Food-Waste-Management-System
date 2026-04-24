import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import authService from '../authService';
import api from '../api';

// Mock the api module
vi.mock('../api');

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('register', () => {
    test('successful registration', async () => {
      const mockResponse = { data: { message: 'Registration successful' } };
      api.post.mockResolvedValue(mockResponse);

      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User',
        role: 'donor',
      };

      const result = await authService.register(userData);

      expect(api.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        message: 'Registration successful. Please wait for admin verification.',
      });
    });

    test('failed registration', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Email already exists',
            errors: { email: ['This email is already registered'] },
          },
        },
      };
      api.post.mockRejectedValue(mockError);

      const result = await authService.register({});

      expect(result).toEqual({
        success: false,
        error: 'Email already exists',
        fieldErrors: { email: ['This email is already registered'] },
      });
    });
  });

  describe('login', () => {
    test('successful login', async () => {
      const mockResponse = {
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: { id: 1, email: 'test@example.com', role: 'donor' },
        },
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password');

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password',
      });
      expect(localStorage.getItem('accessToken')).toBe('access-token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
      expect(result.success).toBe(true);
    });

    test('failed login', async () => {
      const mockError = {
        response: {
          data: { message: 'Invalid credentials' },
        },
      };
      api.post.mockRejectedValue(mockError);

      const result = await authService.login('test@example.com', 'wrong-password');

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials',
        fieldErrors: null,
      });
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  describe('logout', () => {
    test('successful logout', async () => {
      localStorage.setItem('accessToken', 'access-token');
      localStorage.setItem('refreshToken', 'refresh-token');
      api.post.mockResolvedValue({});

      const result = await authService.logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout');
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(result.success).toBe(true);
    });

    test('logout with API error still clears tokens', async () => {
      localStorage.setItem('accessToken', 'access-token');
      localStorage.setItem('refreshToken', 'refresh-token');
      api.post.mockRejectedValue(new Error('Network error'));

      const result = await authService.logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(result.success).toBe(true);
    });
  });

  describe('token management', () => {
    test('isAuthenticated returns true when token exists', () => {
      localStorage.setItem('accessToken', 'access-token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    test('isAuthenticated returns false when no token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    test('decodeToken decodes JWT payload', () => {
      // Mock JWT token (header.payload.signature)
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const decoded = authService.decodeToken(mockToken);
      
      expect(decoded).toEqual({
        sub: '1234567890',
        name: 'John Doe',
        iat: 1516239022,
      });
    });

    test('isTokenExpired returns true for expired token', () => {
      // Create token that expired 1 hour ago
      const expiredTime = Math.floor(Date.now() / 1000) - 3600;
      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: expiredTime }))}.signature`;
      
      expect(authService.isTokenExpired(mockToken)).toBe(true);
    });

    test('isTokenExpired returns false for valid token', () => {
      // Create token that expires in 1 hour
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: futureTime }))}.signature`;
      
      expect(authService.isTokenExpired(mockToken)).toBe(false);
    });
  });
});