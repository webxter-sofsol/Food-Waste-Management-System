import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import FoodListingGrid from '../FoodListingGrid';
import foodListingService from '../../../services/foodListingService';

// Mock the food listing service
vi.mock('../../../services/foodListingService');

// Mock the storage utility
vi.mock('../../../utils/helpers', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock child components
vi.mock('../ListingCard', () => ({
  default: ({ listing, isSelected, onCompareToggle }) => (
    <div data-testid={`listing-card-${listing.id}`}>
      <span>{listing.food_type}</span>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onCompareToggle(listing.id)}
        data-testid={`compare-checkbox-${listing.id}`}
      />
    </div>
  ),
}));

vi.mock('../FilterPanel', () => ({
  default: ({ filters, onFilterChange }) => (
    <div data-testid="filter-panel">
      <button onClick={() => onFilterChange({ food_type: 'Pizza' })}>
        Apply Filter
      </button>
    </div>
  ),
}));

vi.mock('../SortControls', () => ({
  default: ({ sortBy, sortOrder, onSortChange }) => (
    <div data-testid="sort-controls">
      <button onClick={() => onSortChange('distance', 'asc')}>
        Sort by Distance
      </button>
    </div>
  ),
}));

describe('FoodListingGrid', () => {
  const mockListings = [
    {
      id: 1,
      food_type: 'Pizza',
      quantity: 5,
      expiry_time: '2024-12-31T23:59:59Z',
    },
    {
      id: 2,
      food_type: 'Salad',
      quantity: 3,
      expiry_time: '2024-12-31T23:59:59Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    foodListingService.getListings.mockResolvedValue({
      results: mockListings,
      count: 2,
    });
  });

  it('renders loading state initially', () => {
    render(<FoodListingGrid />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders listings after loading', async () => {
    render(<FoodListingGrid />);
    
    await waitFor(() => {
      expect(screen.getByTestId('listing-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('listing-card-2')).toBeInTheDocument();
    });

    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getByText('Salad')).toBeInTheDocument();
  });

  it('displays correct results count', async () => {
    render(<FoodListingGrid />);
    
    await waitFor(() => {
      expect(screen.getByText('2 listings found')).toBeInTheDocument();
    });
  });

  it('handles filter changes', async () => {
    render(<FoodListingGrid />);
    
    await waitFor(() => {
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Apply Filter'));

    await waitFor(() => {
      expect(foodListingService.getListings).toHaveBeenCalledWith(
        expect.objectContaining({
          food_type: 'Pizza',
        })
      );
    });
  });

  it('handles sort changes', async () => {
    render(<FoodListingGrid />);
    
    await waitFor(() => {
      expect(screen.getByTestId('sort-controls')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sort by Distance'));

    await waitFor(() => {
      expect(foodListingService.getListings).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_by: 'distance',
          sort_order: 'asc',
        })
      );
    });
  });

  it('handles comparison selection', async () => {
    render(<FoodListingGrid />);
    
    await waitFor(() => {
      expect(screen.getByTestId('listing-card-1')).toBeInTheDocument();
    });

    // Select first item for comparison
    fireEvent.click(screen.getByTestId('compare-checkbox-1'));
    
    expect(screen.getByText(/1 item selected for comparison/)).toBeInTheDocument();

    // Select second item for comparison
    fireEvent.click(screen.getByTestId('compare-checkbox-2'));
    
    expect(screen.getByText(/2 items selected for comparison/)).toBeInTheDocument();
    expect(screen.getByText('Compare (2)')).toBeInTheDocument();
  });

  it('limits comparison to 4 items', async () => {
    const manyListings = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      food_type: `Food ${i + 1}`,
      quantity: 1,
      expiry_time: '2024-12-31T23:59:59Z',
    }));

    foodListingService.getListings.mockResolvedValue({
      results: manyListings,
      count: 6,
    });

    render(<FoodListingGrid />);
    
    await waitFor(() => {
      expect(screen.getByTestId('listing-card-1')).toBeInTheDocument();
    });

    // Select 4 items
    for (let i = 1; i <= 4; i++) {
      fireEvent.click(screen.getByTestId(`compare-checkbox-${i}`));
    }

    expect(screen.getByText(/4 items selected for comparison/)).toBeInTheDocument();

    // Try to select 5th item - should show alert
    fireEvent.click(screen.getByTestId('compare-checkbox-5'));
    
    await waitFor(() => {
      expect(screen.getByText(/You can compare up to 4 listings at once/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no listings found', async () => {
    foodListingService.getListings.mockResolvedValue({
      results: [],
      count: 0,
    });

    render(<FoodListingGrid />);
    
    await waitFor(() => {
      expect(screen.getByText('No food listings found')).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your filters/)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    foodListingService.getListings.mockRejectedValue(new Error('API Error'));

    render(<FoodListingGrid />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load food listings/)).toBeInTheDocument();
    });
  });

  it('implements pagination correctly', async () => {
    foodListingService.getListings.mockResolvedValue({
      results: mockListings,
      count: 50, // More than 20 items
    });

    render(<FoodListingGrid />);
    
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    // Check pagination component is rendered
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});