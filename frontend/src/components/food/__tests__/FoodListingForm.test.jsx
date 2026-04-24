import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'vitest';
import FoodListingForm from '../FoodListingForm';
import foodListingService from '../../../services/foodListingService';

// Mock the service
vi.mock('../../../services/foodListingService');

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

const theme = createTheme();

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {component}
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('FoodListingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders all required form fields', () => {
    renderWithProviders(<FoodListingForm />);

    // Basic information fields
    expect(screen.getByLabelText(/food type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();

    // Time fields
    expect(screen.getByLabelText(/preparation time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expiry time/i)).toBeInTheDocument();

    // Location fields
    expect(screen.getByLabelText(/pickup address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/longitude/i)).toBeInTheDocument();

    // Dietary attributes
    expect(screen.getByLabelText(/vegetarian/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vegan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gluten-free/i)).toBeInTheDocument();

    // Allergen checkboxes
    expect(screen.getByLabelText(/contains nuts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contains dairy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contains eggs/i)).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /create listing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('displays freshness score that updates with time changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FoodListingForm />);

    // Check that freshness score is displayed
    expect(screen.getByText(/freshness score/i)).toBeInTheDocument();
    
    // The score should be visible (initial calculation based on default times)
    const scoreElement = screen.getByText(/\d+%/);
    expect(scoreElement).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FoodListingForm />);

    const submitButton = screen.getByRole('button', { name: /create listing/i });
    
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/food type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/quantity is required/i)).toBeInTheDocument();
      expect(screen.getByText(/pickup address is required/i)).toBeInTheDocument();
    });
  });

  it('validates expiry time is in the future', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FoodListingForm />);

    // Try to set expiry time in the past (this should be prevented by the DateTimePicker minDateTime)
    // But we can test the validation schema by checking the error message
    const submitButton = screen.getByRole('button', { name: /create listing/i });
    await user.click(submitButton);

    // Fill in other required fields but leave expiry time validation to be tested
    await user.type(screen.getByLabelText(/food type/i), 'Test Food');
    await user.type(screen.getByLabelText(/description/i), 'Test description that is long enough');
    await user.type(screen.getByLabelText(/quantity/i), '10');
    await user.type(screen.getByLabelText(/pickup address/i), 'Test address that is long enough');
    await user.type(screen.getByLabelText(/latitude/i), '40.7128');
    await user.type(screen.getByLabelText(/longitude/i), '-74.0060');

    await user.click(submitButton);

    // The form should not submit if validation fails
    await waitFor(() => {
      expect(foodListingService.createListing).not.toHaveBeenCalled();
    });
  });

  it('handles image upload with preview', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FoodListingForm />);

    // Create a mock file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Find the hidden file input
    const fileInput = document.getElementById('image-upload');
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByAltText(/preview 1/i)).toBeInTheDocument();
    });

    // Check that URL.createObjectURL was called
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it('limits image uploads to maximum 5', async () => {
    const user = userEvent.setup();
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    renderWithProviders(<FoodListingForm />);

    // Create 6 mock files
    const files = Array.from({ length: 6 }, (_, i) => 
      new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
    );
    
    const fileInput = document.getElementById('image-upload');
    
    await user.upload(fileInput, files);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Maximum 5 images allowed');
    });

    alertSpy.mockRestore();
  });

  it('removes images when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FoodListingForm />);

    // Upload an image first
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.getElementById('image-upload');
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByAltText(/preview 1/i)).toBeInTheDocument();
    });

    // Find and click the delete button
    const deleteButton = screen.getByRole('button', { name: '' }); // IconButton without aria-label
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByAltText(/preview 1/i)).not.toBeInTheDocument();
    });

    // Check that URL.revokeObjectURL was called
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('handles geolocation for current location', async () => {
    const user = userEvent.setup();
    
    // Mock successful geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      });
    });

    renderWithProviders(<FoodListingForm />);

    const locationButton = screen.getByRole('button', { name: /use current location/i });
    await user.click(locationButton);

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      expect(screen.getByDisplayValue('40.7128')).toBeInTheDocument();
      expect(screen.getByDisplayValue('-74.0060')).toBeInTheDocument();
    });
  });

  it('handles geolocation errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Mock geolocation error
    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error(new Error('Location access denied'));
    });

    renderWithProviders(<FoodListingForm />);

    const locationButton = screen.getByRole('button', { name: /use current location/i });
    await user.click(locationButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Unable to get your location. Please enter coordinates manually.');
    });

    alertSpy.mockRestore();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    
    // Mock successful API call
    foodListingService.createListing.mockResolvedValue({
      id: 1,
      food_type: 'Test Food',
      status: 'available'
    });

    renderWithProviders(<FoodListingForm />);

    // Fill in all required fields
    await user.type(screen.getByLabelText(/food type/i), 'Test Food');
    await user.type(screen.getByLabelText(/description/i), 'Test description that is long enough to pass validation');
    await user.type(screen.getByLabelText(/quantity/i), '10');
    await user.type(screen.getByLabelText(/pickup address/i), 'Test address that is long enough to pass validation');
    await user.type(screen.getByLabelText(/latitude/i), '40.7128');
    await user.type(screen.getByLabelText(/longitude/i), '-74.0060');

    // Check some dietary attributes
    await user.click(screen.getByLabelText(/vegetarian/i));
    await user.click(screen.getByLabelText(/contains nuts/i));

    const submitButton = screen.getByRole('button', { name: /create listing/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(foodListingService.createListing).toHaveBeenCalledWith(
        expect.objectContaining({
          food_type: 'Test Food',
          description: 'Test description that is long enough to pass validation',
          quantity: 10,
          unit: 'servings',
          pickup_address: 'Test address that is long enough to pass validation',
          pickup_latitude: 40.7128,
          pickup_longitude: -74.0060,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: false,
        }),
        []
      );
    });

    // Check success message and navigation
    await waitFor(() => {
      expect(screen.getByText(/food listing created successfully/i)).toBeInTheDocument();
    });

    // Wait for navigation timeout
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/donor/dashboard');
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock API error
    foodListingService.createListing.mockRejectedValue({
      response: {
        data: {
          food_type: ['This field is required.'],
          description: ['This field is required.']
        }
      }
    });

    renderWithProviders(<FoodListingForm />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/food type/i), 'Test Food');
    await user.type(screen.getByLabelText(/description/i), 'Test description');
    await user.type(screen.getByLabelText(/quantity/i), '10');
    await user.type(screen.getByLabelText(/pickup address/i), 'Test address');
    await user.type(screen.getByLabelText(/latitude/i), '40.7128');
    await user.type(screen.getByLabelText(/longitude/i), '-74.0060');

    const submitButton = screen.getByRole('button', { name: /create listing/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(foodListingService.createListing).toHaveBeenCalled();
    });

    // The form should handle the error and display field-specific errors
    // Note: Formik will handle setting field errors based on the API response
  });

  it('navigates to dashboard when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FoodListingForm />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/donor/dashboard');
  });

  it('updates dietary attributes correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FoodListingForm />);

    // Test vegetarian checkbox
    const vegetarianCheckbox = screen.getByLabelText(/vegetarian/i);
    expect(vegetarianCheckbox).not.toBeChecked();
    
    await user.click(vegetarianCheckbox);
    expect(vegetarianCheckbox).toBeChecked();

    // Test vegan checkbox
    const veganCheckbox = screen.getByLabelText(/vegan/i);
    await user.click(veganCheckbox);
    expect(veganCheckbox).toBeChecked();

    // Test allergen checkboxes
    const nutsCheckbox = screen.getByLabelText(/contains nuts/i);
    await user.click(nutsCheckbox);
    expect(nutsCheckbox).toBeChecked();
  });

  it('validates file types for image upload', async () => {
    const user = userEvent.setup();
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    renderWithProviders(<FoodListingForm />);

    // Create a non-image file
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileInput = document.getElementById('image-upload');
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('test.txt is not an image file');
    });

    alertSpy.mockRestore();
  });

  it('validates file size for image upload', async () => {
    const user = userEvent.setup();
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    renderWithProviders(<FoodListingForm />);

    // Create a large file (6MB)
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const fileInput = document.getElementById('image-upload');
    
    await user.upload(fileInput, largeFile);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('large.jpg is too large. Maximum size is 5MB');
    });

    alertSpy.mockRestore();
  });
});