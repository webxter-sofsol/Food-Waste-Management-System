# Buffet Management System - Frontend

This is the React.js frontend for the Buffet Management and Food Distribution System.

## Technology Stack

- **React.js 19.2** - UI library
- **Vite** - Build tool and development server
- **Material-UI (MUI)** - Component library and theming
- **React Router** - Client-side routing
- **React Query (TanStack Query)** - Server state management
- **Axios** - HTTP client with JWT token management
- **Formik + Yup** - Form handling and validation

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx      # Main layout wrapper
│   └── ProtectedRoute.jsx # Route protection component
├── pages/              # Page components
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── DashboardPage.jsx
│   └── ...
├── services/           # API services
│   └── api.js         # Axios configuration with interceptors
├── context/            # React contexts
│   └── AuthContext.jsx # Authentication state management
├── hooks/              # Custom React hooks
│   └── useApi.js      # API request hook
├── utils/              # Utility functions
│   ├── constants.js   # Application constants
│   └── helpers.js     # Helper functions
└── assets/            # Static assets
```

## Features Implemented

### Task 1.1 - React Project Structure ✅

- ✅ React app created with Vite
- ✅ Directory structure set up
- ✅ Dependencies installed:
  - react-router-dom
  - axios
  - @tanstack/react-query
  - formik
  - yup
  - @mui/material
  - @emotion/react
  - @emotion/styled
  - @mui/icons-material
- ✅ Axios configured with JWT token interceptors
- ✅ React Router set up with all routes
- ✅ AuthContext created for authentication state
- ✅ ProtectedRoute component for role-based access control
- ✅ Placeholder pages created for all routes

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure the API URL.

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Run tests:**
   ```bash
   npm run test
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage

## Authentication Flow

The app uses JWT tokens for authentication:

1. **Login/Register** - User provides credentials
2. **Token Storage** - Access and refresh tokens stored in localStorage
3. **Request Interceptor** - Automatically adds Bearer token to requests
4. **Response Interceptor** - Handles token refresh on 401 errors
5. **Route Protection** - ProtectedRoute component checks authentication

## Route Structure

- `/` - Redirects to dashboard
- `/login` - Login page (public)
- `/register` - Registration page (public)
- `/dashboard` - Main dashboard (protected)
- `/profile` - User profile (protected)
- `/donor/dashboard` - Donor dashboard (donor only)
- `/receiver/dashboard` - Receiver dashboard (receiver only)
- `/receiver/food-listings` - Browse food listings (receiver only)
- `/volunteer/dashboard` - Volunteer dashboard (volunteer only)
- `/admin/dashboard` - Admin dashboard (admin only)
- `/unauthorized` - Unauthorized access page
- `/404` - Page not found

## Next Steps

The following tasks will implement the actual functionality:

- **Task 1.2** - Authentication components (login/register forms)
- **Task 1.3** - Layout and navigation components
- **Task 1.4** - User profile components
- **Task 1.5** - Admin verification interface
- **Task 2.1** - Food listing creation interface
- And more...

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:8000/api)
- `VITE_ENV` - Environment (development/production)
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key (for future use)