import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';
import adminService from '../../services/adminService';
import { AuthProvider } from '../../context/AuthContext';

// Mock the admin service
vi.mock('../../services/adminService');

// Mock UserVerificationList component
vi.mock('../../components/admin/UserVerificationList', () => ({
  default: () => <div data-testid="user-verification-list">User Verification List</div>,
}));

// Mock Layout component
vi.mock('../../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe('AdminDashboard', () => {
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

  const renderWithProviders = (component) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render admin dashboard title', async () => {
    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('should fetch and display metrics on mount', async () => {
    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    renderWithProviders(<AdminDashboard />);

    // Should show loading initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for metrics to load
    await waitFor(() => {
      expect(screen.getByText('User Statistics')).toBeInTheDocument();
    });

    // Check user counts
    expect(screen.getByText('37')).toBeInTheDocument(); // Total users
    expect(screen.getByText('10')).toBeInTheDocument(); // Donors
    expect(screen.getByText('20')).toBeInTheDocument(); // Receivers
    expect(screen.getByText('5')).toBeInTheDocument(); // Volunteers
    expect(screen.getByText('2')).toBeInTheDocument(); // Admins
  });

  it('should display system metrics correctly', async () => {
    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Metrics')).toBeInTheDocument();
    });

    expect(screen.getByText('50')).toBeInTheDocument(); // Total food listings
    expect(screen.getByText('40')).toBeInTheDocument(); // Total matches
    expect(screen.getByText('35')).toBeInTheDocument(); // Completed deliveries
    expect(screen.getByText('3')).toBeInTheDocument(); // Pending verifications
  });

  it('should display average response times', async () => {
    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Average Response Times')).toBeInTheDocument();
    });

    expect(screen.getByText('Volunteer Assignment')).toBeInTheDocument();
    expect(screen.getByText('Delivery Completion')).toBeInTheDocument();
    expect(screen.getByText('10m')).toBeInTheDocument(); // 600 seconds = 10 minutes
    expect(screen.getByText('1h 0m')).toBeInTheDocument(); // 3600 seconds = 1 hour
  });

  it('should display system alert for expiring listings', async () => {
    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/2 food listing\(s\) expiring within 2 hours/i)).toBeInTheDocument();
    });
  });

  it('should not display system alert when no expiring listings', async () => {
    const metricsWithoutAlerts = {
      ...mockMetrics,
      system_alerts: {
        expiring_soon_listings: 0,
      },
    };

    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: metricsWithoutAlerts,
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Metrics')).toBeInTheDocument();
    });

    expect(screen.queryByText(/expiring within 2 hours/i)).not.toBeInTheDocument();
  });

  it('should display error message when metrics fetch fails', async () => {
    const errorMessage = 'Failed to fetch admin metrics';
    adminService.getAdminMetrics.mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should render UserVerificationList component', async () => {
    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('user-verification-list')).toBeInTheDocument();
    });
  });

  it('should format time correctly for hours and minutes', async () => {
    const metricsWithVariousTimes = {
      ...mockMetrics,
      average_response_times: {
        volunteer_assignment_seconds: 7200, // 2 hours
        delivery_completion_seconds: 300, // 5 minutes
      },
    };

    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: metricsWithVariousTimes,
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('2h 0m')).toBeInTheDocument();
    });

    expect(screen.getByText('5m')).toBeInTheDocument();
  });

  it('should display N/A for null response times', async () => {
    const metricsWithNullTimes = {
      ...mockMetrics,
      average_response_times: {
        volunteer_assignment_seconds: null,
        delivery_completion_seconds: null,
      },
    };

    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: metricsWithNullTimes,
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Average Response Times')).toBeInTheDocument();
    });

    const naElements = screen.getAllByText('N/A');
    expect(naElements).toHaveLength(2);
  });

  it('should display subtitle for active food listings', async () => {
    adminService.getAdminMetrics.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('30 active')).toBeInTheDocument();
    });
  });
});
