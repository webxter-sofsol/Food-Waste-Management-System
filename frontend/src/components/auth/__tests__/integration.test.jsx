import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LoginForm from '../LoginForm';
import RegistrationForm from '../RegistrationForm';
import { AuthProvider } from '../../../context/AuthContext';

// Mock the auth context
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  }),
  AuthProvider: ({ children }) => children,
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Authentication Components Integration', () => {
  test('LoginForm renders without crashing', () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('RegistrationForm renders without crashing', () => {
    renderWithProviders(<RegistrationForm />);
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('Both forms have proper form structure', () => {
    const { unmount } = renderWithProviders(<LoginForm />);
    
    // Login form should have email and password fields
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    
    unmount();
    
    // Registration form should have all required fields
    renderWithProviders(<RegistrationForm />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // Role select
  });
});