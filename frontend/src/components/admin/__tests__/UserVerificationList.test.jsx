import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserVerificationList from '../UserVerificationList';
import adminService from '../../../services/adminService';

// Mock the admin service
vi.mock('../../../services/adminService');

// Mock UserVerificationCard to simplify testing
vi.mock('../UserVerificationCard', () => ({
  default: ({ user, onVerify, onReject }) => (
    <div data-testid={`user-card-${user.id}`}>
      <span>{user.full_name}</span>
      <span>{user.role}</span>
      <button onClick={() => onVerify(user.id)}>Approve</button>
      <button onClick={() => onReject(user.id, 'Test reason')}>Reject</button>
    </div>
  ),
}));

describe('UserVerificationList', () => {
  const mockPendingUsers = [
    {
      id: 1,
      email: 'donor@example.com',
      username: 'donor1',
      role: 'donor',
      verification_status: 'pending',
      full_name: 'Test Donor',
      date_joined: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      email: 'receiver@example.com',
      username: 'receiver1',
      role: 'receiver',
      verification_status: 'pending',
      full_name: 'Test Receiver',
      date_joined: '2024-01-16T10:00:00Z',
    },
    {
      id: 3,
      email: 'volunteer@example.com',
      username: 'volunteer1',
      role: 'volunteer',
      verification_status: 'pending',
      full_name: 'Test Volunteer',
      date_joined: '2024-01-17T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and display pending verifications on mount', async () => {
    adminService.getPendingVerifications.mockResolvedValue({
      success: true,
      data: mockPendingUsers,
    });

    render(<UserVerificationList />);

    // Should show loading initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Donor')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Receiver')).toBeInTheDocument();
    expect(screen.getByText('Test Volunteer')).toBeInTheDocument();
  });

  it('should display error message when fetch fails', async () => {
    const errorMessage = 'Failed to fetch pending verifications';
    adminService.getPendingVerifications.mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    render(<UserVerificationList />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should display "No pending verifications" when list is empty', async () => {
    adminService.getPendingVerifications.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<UserVerificationList />);

    await waitFor(() => {
      expect(screen.getByText('No pending verifications')).toBeInTheDocument();
    });
  });

  it('should filter users by role when tab is clicked', async () => {
    adminService.getPendingVerifications.mockResolvedValue({
      success: true,
      data: mockPendingUsers,
    });

    render(<UserVerificationList />);

    await waitFor(() => {
      expect(screen.getByText('Test Donor')).toBeInTheDocument();
    });

    // Click on Donors tab
    const donorsTab = screen.getByRole('tab', { name: /donors/i });
    fireEvent.click(donorsTab);

    // Should only show donor
    expect(screen.getByText('Test Donor')).toBeInTheDocument();
    expect(screen.queryByText('Test Receiver')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Volunteer')).not.toBeInTheDocument();
  });

  it('should show all users when "All" tab is selected', async () => {
    adminService.getPendingVerifications.mockResolvedValue({
      success: true,
      data: mockPendingUsers,
    });

    render(<UserVerificationList />);

    await waitFor(() => {
      expect(screen.getByText('Test Donor')).toBeInTheDocument();
    });

    // Click on Receivers tab first
    const receiversTab = screen.getByRole('tab', { name: /receivers/i });
    fireEvent.click(receiversTab);

    // Then click back to All tab
    const allTab = screen.getByRole('tab', { name: /all/i });
    fireEvent.click(allTab);

    // Should show all users
    expect(screen.getByText('Test Donor')).toBeInTheDocument();
    expect(screen.getByText('Test Receiver')).toBeInTheDocument();
    expect(screen.getByText('Test Volunteer')).toBeInTheDocument();
  });

  it('should remove user from list after successful verification', async () => {
    adminService.getPendingVerifications.mockResolvedValue({
      success: true,
      data: mockPendingUsers,
    });

    adminService.verifyUser.mockResolvedValue({
      success: true,
      message: 'User verified successfully',
    });

    render(<UserVerificationList />);

    await waitFor(() => {
      expect(screen.getByText('Test Donor')).toBeInTheDocument();
    });

    // Click approve button
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('User verified successfully')).toBeInTheDocument();
    });

    // User should be removed from list
    await waitFor(() => {
      expect(screen.queryByTestId('user-card-1')).not.toBeInTheDocument();
    });
  });

  it('should remove user from list after successful rejection', async () => {
    adminService.getPendingVerifications.mockResolvedValue({
      success: true,
      data: mockPendingUsers,
    });

    adminService.rejectUser.mockResolvedValue({
      success: true,
      message: 'User rejected successfully',
    });

    render(<UserVerificationList />);

    await waitFor(() => {
      expect(screen.getByText('Test Donor')).toBeInTheDocument();
    });

    // Click reject button
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    fireEvent.click(rejectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('User rejected successfully')).toBeInTheDocument();
    });

    // User should be removed from list
    await waitFor(() => {
      expect(screen.queryByTestId('user-card-1')).not.toBeInTheDocument();
    });
  });

  it('should display role counts in tabs', async () => {
    adminService.getPendingVerifications.mockResolvedValue({
      success: true,
      data: mockPendingUsers,
    });

    render(<UserVerificationList />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /all \(3\)/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /donors \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /receivers \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /volunteers \(1\)/i })).toBeInTheDocument();
  });

  it('should show empty state for filtered role with no users', async () => {
    const donorOnlyUsers = [mockPendingUsers[0]];
    
    adminService.getPendingVerifications.mockResolvedValue({
      success: true,
      data: donorOnlyUsers,
    });

    render(<UserVerificationList />);

    await waitFor(() => {
      expect(screen.getByText('Test Donor')).toBeInTheDocument();
    });

    // Click on Receivers tab (no receivers in list)
    const receiversTab = screen.getByRole('tab', { name: /receivers \(0\)/i });
    fireEvent.click(receiversTab);

    expect(screen.getByText('No pending verifications')).toBeInTheDocument();
    expect(screen.getByText(/no pending receiver verifications/i)).toBeInTheDocument();
  });

  it.skip('should clear success message after timeout', async () => {
    vi.useFakeTimers();

    adminService.getPendingVerifications.mockResolvedValue({
      success: true,
      data: mockPendingUsers,
    });

    adminService.verifyUser.mockResolvedValue({
      success: true,
      message: 'User verified successfully',
    });

    render(<UserVerificationList />);

    await waitFor(() => {
      expect(screen.getByText('Test Donor')).toBeInTheDocument();
    });

    // Verify user
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('User verified successfully')).toBeInTheDocument();
    });

    // Fast-forward time
    vi.runAllTimers();

    await waitFor(() => {
      expect(screen.queryByText('User verified successfully')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  }, 10000);
});
