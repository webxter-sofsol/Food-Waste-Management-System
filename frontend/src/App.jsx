import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

// Import pages (will be created in subsequent tasks)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DonorDashboard from './pages/DonorDashboard';
import DonorListingsPage from './pages/DonorListingsPage';
import DonorRequestsPage from './pages/DonorRequestsPage';
import DonorMatchesPage from './pages/DonorMatchesPage';
import ReceiverDashboard from './pages/ReceiverDashboard';
import ReceiverRequestsPage from './pages/ReceiverRequestsPage';
import ReceiverMatchesPage from './pages/ReceiverMatchesPage';
import VolunteerDashboard from './pages/VolunteerDashboard';
import VolunteerAssignmentsPage from './pages/VolunteerAssignmentsPage';
import VolunteerDeliveriesPage from './pages/VolunteerDeliveriesPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminVerificationsPage from './pages/AdminVerificationsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminMetricsPage from './pages/AdminMetricsPage';
import AdminListingsPage from './pages/AdminListingsPage';
import FoodListingsPage from './pages/FoodListingsPage';
import FoodListingDetailPage from './pages/FoodListingDetailPage';
import FoodListingComparisonPage from './pages/FoodListingComparisonPage';
import ProfilePage from './pages/ProfilePage';
import CreateFoodListingPage from './pages/CreateFoodListingPage';
import EditFoodListingPage from './pages/EditFoodListingPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Modern theme ──────────────────────────────────────────────────────────────
const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: '#16a34a', light: '#4ade80', dark: '#15803d', contrastText: '#fff' },
    secondary: { main: '#f97316', light: '#fb923c', dark: '#ea580c', contrastText: '#fff' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text:       { primary: '#0f172a', secondary: '#64748b' },
    divider:    '#e2e8f0',
    success:    { main: '#16a34a' },
    warning:    { main: '#f59e0b' },
    error:      { main: '#ef4444' },
    info:       { main: '#3b82f6' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
          border: '1px solid #f1f5f9',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 16 },
        elevation1: { boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08)' },
        elevation2: { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)' },
        elevation3: { boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 0 0 #e2e8f0',
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#f8fafc',
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#16a34a' },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '1px 8px',
          width: 'calc(100% - 16px)',
          '&.Mui-selected': {
            backgroundColor: '#dcfce7',
            color: '#15803d',
            '& .MuiListItemIcon-root': { color: '#15803d' },
            '&:hover': { backgroundColor: '#bbf7d0' },
          },
          '&:hover': { backgroundColor: '#f0fdf4' },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99 },
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes - no layout */}
              <Route
                path="/login"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <LoginPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <RegisterPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/404" element={<NotFoundPage />} />

              {/* Protected routes - with layout */}
              <Route
                path="/*"
                element={
                  <MainLayout>
                    <Routes>
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <DashboardPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <ProfilePage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Donor routes */}
                      <Route
                        path="/donor/dashboard"
                        element={
                          <ProtectedRoute requiredRole="donor">
                            <DonorDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/donor/listings"
                        element={
                          <ProtectedRoute requiredRole="donor">
                            <DonorListingsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/donor/requests"
                        element={
                          <ProtectedRoute requiredRole="donor">
                            <DonorRequestsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/donor/matches"
                        element={
                          <ProtectedRoute requiredRole="donor">
                            <DonorMatchesPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/donor/create-listing"
                        element={
                          <ProtectedRoute requiredRole="donor">
                            <CreateFoodListingPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/donor/edit-listing/:id"
                        element={
                          <ProtectedRoute requiredRole="donor">
                            <EditFoodListingPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Receiver routes */}
                      <Route
                        path="/receiver/dashboard"
                        element={
                          <ProtectedRoute requiredRole="receiver">
                            <ReceiverDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/receiver/requests"
                        element={
                          <ProtectedRoute requiredRole="receiver">
                            <ReceiverRequestsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/receiver/matches"
                        element={
                          <ProtectedRoute requiredRole="receiver">
                            <ReceiverMatchesPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/receiver/food-listings"
                        element={
                          <ProtectedRoute requiredRole="receiver">
                            <FoodListingsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/receiver/food-listings/:id"
                        element={
                          <ProtectedRoute requiredRole="receiver">
                            <FoodListingDetailPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/receiver/food-listings/compare"
                        element={
                          <ProtectedRoute requiredRole="receiver">
                            <FoodListingComparisonPage />
                          </ProtectedRoute>
                        }
                      />
                      {/* Shorthand routes used by ListingCard and FoodListingGrid */}
                      <Route
                        path="/food-listings/compare"
                        element={
                          <ProtectedRoute requiredRole="receiver">
                            <FoodListingComparisonPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/food-listings/:id"
                        element={
                          <ProtectedRoute requiredRole="receiver">
                            <FoodListingDetailPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Volunteer routes */}
                      <Route
                        path="/volunteer/dashboard"
                        element={
                          <ProtectedRoute requiredRole="volunteer">
                            <VolunteerDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/volunteer/assignments"
                        element={
                          <ProtectedRoute requiredRole="volunteer">
                            <VolunteerAssignmentsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/volunteer/deliveries"
                        element={
                          <ProtectedRoute requiredRole="volunteer">
                            <VolunteerDeliveriesPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Notifications — all roles */}
                      <Route
                        path="/notifications"
                        element={
                          <ProtectedRoute>
                            <NotificationsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin routes */}
                      <Route
                        path="/admin/dashboard"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/verifications"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminVerificationsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/reports"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminReportsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/metrics"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminMetricsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/listings"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminListingsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Default redirects */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="*" element={<Navigate to="/404" replace />} />
                    </Routes>
                  </MainLayout>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;




