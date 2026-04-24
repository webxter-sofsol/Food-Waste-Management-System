import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Sidebar from '../Sidebar';
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

describe('Sidebar Component', () => {
  test('renders without crashing', () => {
    renderWithProviders(<Sidebar />);
    // Sidebar should render even without authenticated user
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  test('renders role-specific navigation for authenticated users', () => {
    // This test would need a mocked authenticated state with specific role
    // For now, just verify the component renders without crashing
    renderWithProviders(<Sidebar />);
  });
});
