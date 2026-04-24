import { Typography, Paper, Box, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home, Login, Shield } from '@mui/icons-material';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%)',
            borderRadius: 3,
          }}
        >
          <Shield sx={{ fontSize: '4rem', mb: 2, color: 'warning.main' }} />
          <Typography variant="h4" component="h1" gutterBottom color="warning.main">
            Unauthorized Access
          </Typography>
          <Typography variant="body1" gutterBottom color="text.secondary" sx={{ mb: 4 }}>
            You don't have permission to access this page. Please check your account permissions 
            or contact an administrator if you believe this is an error.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              startIcon={<Home />}
              onClick={() => navigate('/dashboard')}
              sx={{ minWidth: 140 }}
            >
              Go Home
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Login />}
              onClick={() => navigate('/login')}
              sx={{ minWidth: 140 }}
            >
              Login
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default UnauthorizedPage;