import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { RefreshRounded } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
          }}
        >
          <Alert severity="error" sx={{ maxWidth: 600, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshRounded />}
              onClick={this.handleReload}
              size="small"
            >
              Refresh Page
            </Button>
          </Alert>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box sx={{ maxWidth: 800, mt: 2 }}>
              <Typography variant="h6" color="error" gutterBottom>
                Error Details (Development Only):
              </Typography>
              <Typography variant="body2" component="pre" sx={{ 
                backgroundColor: 'grey.100', 
                p: 2, 
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.75rem',
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;