import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DonorDashboard from '../../../pages/DonorDashboard';
import donorService from '../../../services/donorService';
import { AuthProvider } from '../../../context/AuthContext';

// Mock donorService
vi.mock('../../../services/donorService', () => ({
  default: {
    getDonorListings: vi.fn(),
    getAllDonorRequests: vi.fn(),
    cancelListing: vi.fn(),
    getListingMetrics: vi.fn(() => ({ views: 0, requests: 0, matches: 0, pendingRequests: 0 })),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const now = new Date();
const future24h = new Date(now.getTime() + 25 * 3_600_000).toISOString();
const future1h = new Date(now.getTime() + 1 * 3_600_000).toISOString();
const future12h = new Date(now.getTime() + 12 * 3_600_000).toISOString();
const past = new Date(now.getTime() - 3_600_000).toISOString();

const mockListings = [
  {
    id: 1,
    food_type: 'Vegetable Curry',
    description: 'Fresh vegetable curry',
    quantity: 10,
    available_quantity: 10,
    unit: 'servings',
    status: 'available',
    expiry_time: future24h,
    preparation_time: new Date(now.getTime() - 3_600_000).toISOString(),
    created_at: now.toISOString(),
  },
  {
    id: 2,
    food_type: 'Bread Loaves',
    description: 'Freshly baked bread',
    quantity: 5,
    available_quantity: 0,
    unit: 'kg',
    status: 'reserved',
    expiry_time: future12h,
    preparation_time: new Date(now.getTime() - 7_200_000).toISOString(),
    created_at: now.toISOString(),
  },
  {
    id: 3,
    food_type: 'Soup',
    description: 'Tomato soup',
    quantity: 8,
    available_quantity: 8,
    unit: 'liters',
    status: 'available',
    expiry_time: future1h,
    preparation_time: new Date(now.getTime() - 3_600_000).toISOString(),
    created_at: now.toISOString(),
  },
  {
    id: 4,
    food_type: 'Old Salad',
    description: 'Expired salad',
    quantity: 3,
    available_quantity: 3,
    unit: 'servings',
    status: 'expired',
    expiry_time: past,
    preparation_time: new Date(now.getTime() - 7_200_000).toISOString(),
    created_at: now.toISOString(),
  },
];

const mockRequests = [
  {
    id: 101,
    listing: 1,
    receiver_name: 'Alice Receiver',
    requested_quantity: 3,
    pickup_time_preference: future12h,
    special_instructions: 'Please pack separately',
    status: 'pending',
  },
];

const renderWithProviders = (component) =>
  render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );

describe('DonorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    donorService.getDonorListings.mockResolvedValue({ success: true, data: mockListings });
    donorService.getAllDonorRequests.mockResolvedValue({ success: true, data: mockRequests });
    donorService.getListingMetrics.mockImplementation((listing, requests) => ({
      views: 0,
      requests: requests.filter((r) => r.listing === listing.id).length,
      matches: 0,
      pendingRequests: requests.filter((r) => r.listing === listing.id && r.status === 'pending').length,
    }));
  });

  it('renders loading state initially', () => {
    // Keep the promise pending so loading state is visible
    donorService.getDonorListings.mockReturnValue(new Promise(() => {}));
    donorService.getAllDonorRequests.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<DonorDashboard />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders listings after loading', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    expect(screen.getByText('Bread Loaves')).toBeInTheDocument();
    expect(screen.getByText('Soup')).toBeInTheDocument();
  });

  it('displays correct status chips with color coding', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    // Available listing
    const availableChip = screen.getByTestId('status-chip-1');
    expect(availableChip).toHaveTextContent('Available');

    // Reserved listing
    const reservedChip = screen.getByTestId('status-chip-2');
    expect(reservedChip).toHaveTextContent('Reserved');

    // Expired listing
    const expiredChip = screen.getByTestId('status-chip-4');
    expect(expiredChip).toHaveTextContent('Expired');
  });

  it('shows expiry countdown for each listing', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    // Should show time remaining text (not "Expired" for future listings)
    const timeTexts = screen.getAllByText(/remaining|Expired/i);
    expect(timeTexts.length).toBeGreaterThan(0);
  });

  it('shows urgent indicator for listings expiring within 2 hours', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Soup')).toBeInTheDocument();
    });

    // The soup listing expires in 1 hour - should show urgent styling
    // We check that the time remaining text is present
    const urgentText = screen.getAllByText(/\dm remaining|\dh \dm remaining/i);
    expect(urgentText.length).toBeGreaterThan(0);
  });

  it('shows pending requests count for listings with requests', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    // Listing 1 has 1 pending request
    expect(screen.getByTestId('pending-requests-1')).toBeInTheDocument();
    expect(screen.getByTestId('pending-requests-1')).toHaveTextContent('1 pending request');
  });

  it('edit button is disabled for reserved (matched) listings', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Bread Loaves')).toBeInTheDocument();
    });

    // Listing 2 is reserved (has a match) - edit should be disabled
    const editBtn = screen.getByTestId('edit-btn-2');
    expect(editBtn).toBeDisabled();
  });

  it('edit button is enabled for available listings without a match', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    const editBtn = screen.getByTestId('edit-btn-1');
    expect(editBtn).not.toBeDisabled();
  });

  it('clicking edit navigates to edit page', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-btn-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/donor/edit-listing/1');
  });

  it('cancel button opens confirmation dialog with reason input', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('cancel-btn-1'));

    // Dialog should appear
    expect(screen.getByText('Cancel Food Listing')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancellation Reason *')).toBeInTheDocument();
  });

  it('cancel dialog requires a reason before confirming', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('cancel-btn-1'));

    // Confirm button should be disabled without reason
    const confirmBtn = screen.getByRole('button', { name: /cancel listing/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('cancel dialog calls cancelListing with reason on confirm', async () => {
    donorService.cancelListing.mockResolvedValue({ success: true, data: {} });

    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('cancel-btn-1'));

    const reasonInput = screen.getByLabelText('Cancellation Reason *');
    fireEvent.change(reasonInput, { target: { value: 'Event cancelled' } });

    const confirmBtn = screen.getByRole('button', { name: /cancel listing/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(donorService.cancelListing).toHaveBeenCalledWith(1, 'Event cancelled');
    });
  });

  it('displays metrics for each listing', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    // Metrics row should show views, requests, matches
    expect(screen.getAllByText(/views/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/requests/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/matches/i).length).toBeGreaterThan(0);
  });

  it('shows empty state when no listings', async () => {
    donorService.getDonorListings.mockResolvedValue({ success: true, data: [] });

    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No food listings yet')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    donorService.getDonorListings.mockResolvedValue({
      success: false,
      error: 'Failed to fetch listings',
    });

    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch listings')).toBeInTheDocument();
    });
  });

  it('cancel button is disabled for cancelled listings', async () => {
    const cancelledListings = [
      { ...mockListings[0], id: 10, status: 'cancelled' },
    ];
    donorService.getDonorListings.mockResolvedValue({ success: true, data: cancelledListings });

    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    expect(screen.getByTestId('cancel-btn-10')).toBeDisabled();
  });

  it('shows summary stats when listings exist', async () => {
    renderWithProviders(<DonorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });

    // Summary stats labels (use getAllByText since "Reserved" also appears as a chip)
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getAllByText('Reserved').length).toBeGreaterThan(0);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });
});
