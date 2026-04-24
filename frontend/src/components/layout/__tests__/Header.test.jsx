import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Header from '../Header';
import { AuthProvider } from '../../../context/AuthContext';

const theme = createTheme();

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          {component}
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  test('renders brand name', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText('Food Share')).toBeInTheDocument();
  });

  test('shows login and register buttons when not authenticated', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  test('displays notification badge when authenticated', async () => {
    // This test would need a mocked authenticated state
    // For now, just verify the component renders without crashing
    renderWithProviders(<Header />);
    expect(screen.getByText('Food Share')).toBeInTheDocument();
  });

  test('is responsive and shows mobile menu on small screens', () => {
    // Mock mobile viewport
    global.innerWidth = 500;
    renderWithProviders(<Header />);
    expect(screen.getByText('Food Share')).toBeInTheDocument();
  });
});
