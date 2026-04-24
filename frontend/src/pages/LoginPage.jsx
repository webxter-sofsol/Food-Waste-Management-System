import { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Box, Typography, Paper, Divider } from '@mui/material';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: '#f8fafc',
      }}
    >
      {/* Left panel — decorative */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 45%',
          background: 'linear-gradient(160deg, #16a34a 0%, #15803d 50%, #166534 100%)',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <Box sx={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: -60, width: 250, height: 250, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', top: '40%', right: -40, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />

        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 360 }}>
          <Box sx={{ fontSize: '4rem', mb: 2 }}>🌿</Box>
          <Typography variant="h3" sx={{ color: 'white', fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
            Reduce waste.<br />Feed hope.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontSize: '1rem' }}>
            Join thousands of donors, receivers, and volunteers making a difference in their communities every day.
          </Typography>

          <Box sx={{ mt: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { emoji: '🍽️', text: '15,000+ meals shared' },
              { emoji: '🤝', text: '8,900+ successful matches' },
              { emoji: '🚚', text: '2,800+ active volunteers' },
            ].map(({ emoji, text }) => (
              <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '12px', px: 2, py: 1.25 }}>
                <Box sx={{ fontSize: '1.25rem' }}>{emoji}</Box>
                <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right panel — form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile brand */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              🌿
            </Box>
            <Typography variant="h5" fontWeight={800}>FoodShare</Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.75, color: 'text.primary' }}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Sign in to your account to continue
          </Typography>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              bgcolor: 'white',
            }}
          >
            <LoginForm onSuccess={() => navigate(location.state?.from?.pathname || '/dashboard', { replace: true })} />
          </Paper>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Box component={Link} to="/register" sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                Create one free
              </Box>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
