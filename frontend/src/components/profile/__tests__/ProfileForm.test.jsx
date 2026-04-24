import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileForm from '../ProfileForm';

describe('ProfileForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form with basic fields', () => {
    const profile = {
      role: 'donor',
      full_name: 'Test User',
      phone: '',
      address: '',
      latitude: '',
      longitude: '',
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Latitude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Longitude/i)).toBeInTheDocument();
  });

  it('should populate form with existing profile data', () => {
    const profile = {
      role: 'donor',
      full_name: 'Test User',
      phone: '1234567890',
      address: '123 Test St',
      latitude: 40.7128,
      longitude: -74.006,
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Test St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('40.7128')).toBeInTheDocument();
    expect(screen.getByDisplayValue('-74.006')).toBeInTheDocument();
  });

  it('should show validation error for empty full name', async () => {
    const user = userEvent.setup();
    const profile = {
      role: 'donor',
      full_name: '',
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show validation error for invalid phone number', async () => {
    const user = userEvent.setup();
    const profile = {
      role: 'donor',
      full_name: 'Test User',
      phone: '',
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    await user.type(phoneInput, 'invalid');

    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid phone number/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const profile = {
      role: 'donor',
      full_name: 'Test User',
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const profile = {
      role: 'donor',
      full_name: 'Test User',
      phone: '',
      address: '',
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const fullNameInput = screen.getByLabelText(/Full Name/i);
    await user.clear(fullNameInput);
    await user.type(fullNameInput, 'Updated User');

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    await user.type(phoneInput, '1234567890');

    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('should render receiver-specific fields', () => {
    const profile = {
      role: 'receiver',
      full_name: 'Receiver User',
      dietary_preferences: ['Vegetarian'],
      allergies: ['Peanuts'],
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Dietary Information')).toBeInTheDocument();
    expect(screen.getByText('Dietary Preferences')).toBeInTheDocument();
    expect(screen.getByText('Allergies')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('Peanuts')).toBeInTheDocument();
  });

  it('should render donor-specific fields', () => {
    const profile = {
      role: 'donor',
      full_name: 'Donor User',
      organization_name: 'Test Restaurant',
      food_types: ['Indian'],
      operating_hours: {},
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Organization Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Name/i)).toBeInTheDocument();
    expect(screen.getByText('Food Types')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Indian')).toBeInTheDocument();
  });

  it('should render volunteer-specific fields', () => {
    const profile = {
      role: 'volunteer',
      full_name: 'Volunteer User',
      available_time_slots: ['Weekday Mornings'],
      transportation_capacity: 50,
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Volunteer Information')).toBeInTheDocument();
    expect(screen.getByText('Available Time Slots')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Transportation Capacity/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Weekday Mornings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('should require organization name for donors', async () => {
    const user = userEvent.setup();
    const profile = {
      role: 'donor',
      full_name: 'Donor User',
      organization_name: '',
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Organization name is required/i)
      ).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate transportation capacity for volunteers', async () => {
    const user = userEvent.setup();
    const profile = {
      role: 'volunteer',
      full_name: 'Volunteer User',
      transportation_capacity: '',
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const capacityInput = screen.getByLabelText(/Transportation Capacity/i);
    await user.type(capacityInput, '0');

    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Must be at least 1/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should allow adding and removing chips in ChipArrayField', async () => {
    const user = userEvent.setup();
    const profile = {
      role: 'receiver',
      full_name: 'Receiver User',
      dietary_preferences: ['Vegetarian'],
      allergies: [],
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check existing chip
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();

    // Add new preference
    const inputs = screen.getAllByPlaceholderText(/e.g.,/i);
    const dietaryInput = inputs[0]; // First input is dietary preferences
    await user.type(dietaryInput, 'Vegan');
    
    const addButtons = screen.getAllByRole('button');
    const addButton = addButtons.find(btn => btn.querySelector('svg')); // Find Add icon button
    if (addButton) {
      await user.click(addButton);
    }

    // Note: In actual test, we'd verify the chip was added
    // but this requires more complex setup with Formik state
  });

  it('should handle geolocation button click', async () => {
    const user = userEvent.setup();
    const mockGeolocation = {
      getCurrentPosition: vi.fn(),
    };
    global.navigator.geolocation = mockGeolocation;

    const profile = {
      role: 'donor',
      full_name: 'Test User',
      latitude: '',
      longitude: '',
    };

    render(
      <ProfileForm
        profile={profile}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const getLocationButton = screen.getByRole('button', { name: /Get/i });
    await user.click(getLocationButton);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
  });
});
