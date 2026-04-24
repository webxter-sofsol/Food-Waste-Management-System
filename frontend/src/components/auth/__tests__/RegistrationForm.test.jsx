import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RegistrationForm from '../RegistrationForm';
import { AuthProvider } from '../../../context/AuthContext';

// Mock the auth context
const mockRegister = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
  AuthProvider: ({ children }) => children,
}));

const renderRegistrationForm = (onSuccess = vi.fn()) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <RegistrationForm onSuccess={onSuccess} />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('RegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders registration form with title', () => {
    renderRegistrationForm();
    
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockRegister.mockResolvedValue({ success: true });
    
    renderRegistrationForm(onSuccess);
    
    // Fill out form fields by name attribute
    const fullNameInput = screen.getByDisplayValue('');
    const emailInput = screen.getByDisplayValue('');
    
    // Use more specific selectors
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '+1234567890');
    
    // Find address field by placeholder or name
    const addressField = screen.getByRole('textbox', { name: /address/i });
    await user.type(addressField, '123 Main St, City, State');
    
    // Select role using combobox
    const roleSelect = screen.getByRole('combobox');
    await user.click(roleSelect);
    await user.click(screen.getByText('Donor'));
    
    // Find password fields by name
    const passwordFields = screen.getAllByDisplayValue('');
    const passwordField = passwordFields.find(field => field.name === 'password');
    const confirmPasswordField = passwordFields.find(field => field.name === 'confirmPassword');
    
    await user.type(passwordField, 'Password123!');
    await user.type(confirmPasswordField, 'Password123!');
    
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St, City, State',
        role: 'donor',
        password: 'Password123!',
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  }, 10000);
});