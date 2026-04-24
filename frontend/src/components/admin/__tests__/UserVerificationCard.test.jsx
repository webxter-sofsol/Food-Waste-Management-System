import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserVerificationCard from '../UserVerificationCard';

describe('UserVerificationCard', () => {
  const mockUser = {
    id: 1,
    email: 'donor@example.com',
    username: 'testdonor',
    role: 'donor',
    verification_status: 'pending',
    full_name: 'Test Donor',
    organization_name: 'Test Restaurant',
    phone: '+1234567890',
    date_joined: '2024-01-15T10:00:00Z',
  };

  const mockOnVerify = vi.fn();
  const mockOnReject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render user information correctly', () => {
    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('Test Donor')).toBeInTheDocument();
    expect(screen.getByText('donor@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('testdonor', { exact: false })).toBeInTheDocument();
  });

  it('should display role chip with correct color', () => {
    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    const roleChip = screen.getByText('Donor');
    expect(roleChip).toBeInTheDocument();
  });

  it('should render approve and reject buttons', () => {
    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('should call onVerify when approve button is clicked', async () => {
    mockOnVerify.mockResolvedValue();

    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockOnVerify).toHaveBeenCalledWith(mockUser.id);
    });
  });

  it('should open reject dialog when reject button is clicked', () => {
    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    expect(screen.getByText('Reject User Registration')).toBeInTheDocument();
    expect(screen.getByLabelText('Rejection Reason')).toBeInTheDocument();
  });

  it('should call onReject with reason when rejection is confirmed', async () => {
    mockOnReject.mockResolvedValue();

    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    // Open reject dialog
    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    // Enter rejection reason
    const reasonInput = screen.getByLabelText('Rejection Reason');
    fireEvent.change(reasonInput, { target: { value: 'Incomplete information' } });

    // Confirm rejection
    const confirmButton = screen.getByRole('button', { name: /confirm rejection/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnReject).toHaveBeenCalledWith(mockUser.id, 'Incomplete information');
    });
  });

  it('should show error when rejecting without reason', async () => {
    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    // Open reject dialog
    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    // Try to confirm without entering reason
    const confirmButton = screen.getByRole('button', { name: /confirm rejection/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getAllByText('Please provide a reason for rejection').length).toBeGreaterThan(0);
    });

    expect(mockOnReject).not.toHaveBeenCalled();
  });

  it('should close reject dialog when cancel is clicked', async () => {
    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    // Open reject dialog
    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    expect(screen.getByText('Reject User Registration')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText('Reject User Registration')).not.toBeInTheDocument();
    });
  });

  it('should disable buttons while processing', async () => {
    mockOnVerify.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    const approveButton = screen.getByRole('button', { name: /approve/i });
    const rejectButton = screen.getByRole('button', { name: /reject/i });

    fireEvent.click(approveButton);

    // Buttons should be disabled during processing
    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnVerify).toHaveBeenCalled();
    });
  });

  it('should render user without optional fields', () => {
    const minimalUser = {
      id: 2,
      email: 'receiver@example.com',
      username: 'testreceiver',
      role: 'receiver',
      verification_status: 'pending',
      full_name: 'Test Receiver',
      date_joined: '2024-01-15T10:00:00Z',
    };

    render(
      <UserVerificationCard
        user={minimalUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('Test Receiver')).toBeInTheDocument();
    expect(screen.getByText('receiver@example.com')).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument(); // No phone
  });

  it('should display username when full_name is not provided', () => {
    const userWithoutName = {
      ...mockUser,
      full_name: null,
    };

    render(
      <UserVerificationCard
        user={userWithoutName}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('testdonor')).toBeInTheDocument();
  });

  it('should handle verification error', async () => {
    mockOnVerify.mockRejectedValue(new Error('Verification failed'));

    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });
  });

  it('should handle rejection error', async () => {
    mockOnReject.mockRejectedValue(new Error('Rejection failed'));

    render(
      <UserVerificationCard
        user={mockUser}
        onVerify={mockOnVerify}
        onReject={mockOnReject}
      />
    );

    // Open reject dialog
    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    // Enter reason and confirm
    const reasonInput = screen.getByLabelText('Rejection Reason');
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } });

    const confirmButton = screen.getByRole('button', { name: /confirm rejection/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getAllByText(/rejection failed/i).length).toBeGreaterThan(0);
    });
  });
});
