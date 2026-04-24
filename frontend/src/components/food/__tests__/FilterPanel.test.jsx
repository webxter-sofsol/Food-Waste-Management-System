import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import FilterPanel from '../FilterPanel';

describe('FilterPanel', () => {
  const mockOnFilterChange = vi.fn();
  const defaultProps = {
    filters: {},
    onFilterChange: mockOnFilterChange,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filter controls', () => {
    render(<FilterPanel {...defaultProps} />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Search food items')).toBeInTheDocument();
    expect(screen.getByLabelText('Food Type')).toBeInTheDocument();
    expect(screen.getByText(/Max Distance/)).toBeInTheDocument();
  });

  it('shows active filter count', () => {
    const filtersWithActive = {
      food_type: 'Pizza',
      is_vegetarian: true,
    };

    render(<FilterPanel {...defaultProps} filters={filtersWithActive} />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Filter count chip
  });

  it('handles food type selection', async () => {
    render(<FilterPanel {...defaultProps} />);
    
    const foodTypeSelect = screen.getByLabelText('Food Type');
    fireEvent.mouseDown(foodTypeSelect);
    
    const pizzaOption = screen.getByText('Main Course');
    fireEvent.click(pizzaOption);
    
    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          food_type: 'Main Course',
        })
      );
    });
  });

  it('handles distance slider changes', () => {
    render(<FilterPanel {...defaultProps} />);
    
    const distanceSlider = screen.getByRole('slider');
    fireEvent.change(distanceSlider, { target: { value: 25 } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        max_distance: 25,
      })
    );
  });

  it('expands to show advanced filters', () => {
    render(<FilterPanel {...defaultProps} />);
    
    // Advanced filters should not be visible initially
    expect(screen.queryByText('Dietary Preferences')).not.toBeInTheDocument();
    
    // Click expand button
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
    
    // Advanced filters should now be visible
    expect(screen.getByText('Dietary Preferences')).toBeInTheDocument();
    expect(screen.getByLabelText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByLabelText('Vegan')).toBeInTheDocument();
    expect(screen.getByLabelText('Gluten-Free')).toBeInTheDocument();
  });

  it('handles dietary preference checkboxes', async () => {
    render(<FilterPanel {...defaultProps} />);
    
    // Expand to show advanced filters
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
    
    const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
    fireEvent.click(vegetarianCheckbox);
    
    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          is_vegetarian: true,
        })
      );
    });
  });

  it('handles search form submission', () => {
    render(<FilterPanel {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search food items');
    fireEvent.change(searchInput, { target: { value: 'pizza' } });
    fireEvent.submit(searchInput.closest('form'));
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        search_query: 'pizza',
      })
    );
  });

  it('clears all filters', async () => {
    const filtersWithActive = {
      food_type: 'Pizza',
      is_vegetarian: true,
      max_distance: 25,
    };

    render(<FilterPanel {...defaultProps} filters={filtersWithActive} />);
    
    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith({});
    });
  });

  it('disables controls when loading', () => {
    render(<FilterPanel {...defaultProps} loading={true} />);
    
    expect(screen.getByLabelText('Search food items')).toBeDisabled();
    expect(screen.getByLabelText('Food Type')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Clear All')).toBeDisabled();
  });

  it('handles expiry time slider', async () => {
    render(<FilterPanel {...defaultProps} />);
    
    // Expand to show advanced filters
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
    
    const expirySliders = screen.getAllByRole('slider');
    const expirySlider = expirySliders.find(slider => 
      slider.getAttribute('aria-valuenow') === '24'
    );
    
    fireEvent.change(expirySlider, { target: { value: 12 } });
    
    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          max_expiry_hours: 12,
        })
      );
    });
  });

  it('applies filters when Apply Filters button is clicked', async () => {
    render(<FilterPanel {...defaultProps} />);
    
    // Expand to show advanced filters
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
    
    // Change a filter
    const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
    fireEvent.click(vegetarianCheckbox);
    
    // Click Apply Filters
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          is_vegetarian: true,
        })
      );
    });
  });
});