import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../ProfilePage';
import profileService from '../../services/profileService';
import { AuthProvider } from '../../context/AuthContext';

// Mock the profile service
vi.mock('../../services/profileService');

// Mock the auth service
vi.mock('../../services/authService', () => ({
  default: {
    isAuthenticated: () => true,
    verifySession: () => Promise.resolve({ success: true, data: { user: { role: 'donor' } } }),
  },
}));

const renderProfilePage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ProfilePage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    profileService.getProfile.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderProfilePage();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display profile data after loading', async () => {
    const mockProfile = {
      email: 'donor@example.com',
      role: 'donor',
      full_name: 'Test Donor',
      phone: '1234567890',
      address: '123 Test St',
      organization_name: 'Test Restaurant',
      verification_status: 'approved',
      average_rating: 4.5,
      total_ratings: 10,
    };

    profileService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile,
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText('Test Donor')).toBeInTheDocument();
    });

    expect(screen.getByText('donor@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
  });

  it('should display error message on fetch failure', async () => {
    profileService.getProfile.mockResolvedValue({
      success: false,
      error: 'Failed to fetch profile',
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch profile')).toBeInTheDocument();
    });
  });

  it('should show edit button when profile is loaded', async () => {
    const mockProfile = {
      email: 'donor@example.com',
      role: 'donor',
      full_name: 'Test Donor',
      verification_status: 'approved',
      average_rating: 0,
      total_ratings: 0,
    };

    profileService.getProfile.mockResolvedValue({
      success: true,
      data: mockProfile,
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
    });
  });
});
