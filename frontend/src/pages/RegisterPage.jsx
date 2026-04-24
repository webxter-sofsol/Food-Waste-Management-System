import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import RegistrationForm from '../components/auth/RegistrationForm';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => navigate('/login'), 3500);
  };

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', p: 2 }}>
        <Paper
          elevation={0}
          sx={{ p: 5, maxWidth: 440, width: '100%', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '20px' }}
        >
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <CheckCircle sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Account created!</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            Your account is pending admin verification. You'll be able to log in once approved.
            Redirecting to sign in…
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#f8fafc' }}>
      {/* Left decorative panel */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flex: '0 0 40%',
          background: 'linear-gradient(160deg, #16a34a 0%, #15803d 50%, #166534 100%)',
          flexDirection: 'column',
          justifyContent: 'center',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 340 }}>
          <Box sx={{ fontSize: '3.5rem', mb: 2 }}>🌱</Box>
          <Typography variant="h3" sx={{ color: 'white', fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
            Join the movement
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
            Whether you're a donor, receiver, or volunteer — your role matters. Together we fight food waste and hunger.
          </Typography>

          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[
              { role: '🍽️ Donor', desc: 'Share surplus food from your restaurant or home' },
              { role: '🤲 Receiver', desc: 'Access free food from generous donors nearby' },
              { role: '🚚 Volunteer', desc: 'Help coordinate pickups and deliveries' },
            ].map(({ role, desc }) => (
              <Box key={role} sx={{ bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '12px', px: 2, py: 1.5 }}>
                <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{role}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', mt: 0.25 }}>{desc}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right — form */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 4 }, overflowY: 'auto' }}>
        <Box sx={{ width: '100%', maxWidth: 480, py: 2 }}>
          {/* Mobile brand */}
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              🌿
            </Box>
            <Typography variant="h5" fontWeight={800}>FoodShare</Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.75 }}>Create your account</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Join thousands making a difference in their community
          </Typography>

          <Paper
            elevation={0}
            sx={{ p: { xs: 3, sm: 4 }, border: '1px solid #e2e8f0', borderRadius: '20px', bgcolor: 'white' }}
          >
            <RegistrationForm onSuccess={handleSuccess} />
          </Paper>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Box component={Link} to="/login" sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                Sign in
              </Box>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RegisterPage;
