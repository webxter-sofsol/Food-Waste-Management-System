import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';
import RegistrationForm from '../components/auth/RegistrationForm';
import { useAuth } from '../context/AuthContext';
import { RegisterIllustration } from '../components/illustrations';

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
          {/* Success SVG checkmark */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="36" cy="36" r="36" fill="#f0fdf4" />
              <circle cx="36" cy="36" r="28" fill="#dcfce7" />
              <path d="M22 36 L31 45 L50 26" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
        {/* SVG illustration */}
        <Box sx={{ position: 'absolute', bottom: 40, right: 0, left: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', userSelect: 'none' }}>
          <RegisterIllustration width={320} height={280} />
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 340 }}>
          {/* Brand mark */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="36" height="36" rx="10" fill="rgba(255,255,255,0.2)" />
              <path d="M18 8 C14 8 10 12 10 16 C10 20 13 23 17 23.9 L17 28 L19 28 L19 23.9 C23 23 26 20 26 16 C26 12 22 8 18 8Z"
                fill="white" fillOpacity="0.9" />
              <path d="M14 16 Q16 13 18 16 Q20 19 22 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
            </svg>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.3px' }}>
              FoodShare
            </Typography>
          </Box>

          <Typography variant="h3" sx={{ color: 'white', fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
            Join the movement
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, mb: 4 }}>
            Whether you're a donor, receiver, or volunteer — your role matters. Together we fight food waste and hunger.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[
              {
                label: 'Donor',
                desc: 'Share surplus food from your restaurant or home',
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2C8 2 4 6 4 10c0 4 3 7 7 7.9V22h2v-4.1c4-1 7-4 7-7.9C20 6 16 2 12 2z"
                      stroke="white" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                label: 'Receiver',
                desc: 'Access free food from generous donors nearby',
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 21C12 21 4 16 4 10C4 7.239 6.239 5 9 5C10.5 5 11.866 5.685 12.8 6.757C13.734 5.685 15.1 5 16.6 5C19.361 5 21.6 7.239 21.6 10C21.6 16 12 21 12 21Z"
                      stroke="white" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                label: 'Volunteer',
                desc: 'Help coordinate pickups and deliveries',
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="1" y="8" width="13" height="9" rx="2" stroke="white" strokeWidth="2" />
                    <path d="M14 11h4l3 4v2h-7V11z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="6" cy="19" r="2" stroke="white" strokeWidth="2" />
                    <circle cx="18" cy="19" r="2" stroke="white" strokeWidth="2" />
                  </svg>
                ),
              },
            ].map(({ label, desc, svg }) => (
              <Box key={label} sx={{ bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '12px', px: 2, py: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ mt: 0.2, flexShrink: 0 }}>{svg}</Box>
                <Box>
                  <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{label}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', mt: 0.25 }}>{desc}</Typography>
                </Box>
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
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="40" height="40" rx="12" fill="url(#brandGrad)" />
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#16a34a" />
                  <stop offset="1" stopColor="#15803d" />
                </linearGradient>
              </defs>
              <path d="M20 9C16 9 12 13 12 17c0 4 3 7 7 7.9V31h2v-6.1c4-1 7-4 7-7.9C28 13 24 9 20 9z"
                fill="white" fillOpacity="0.95" />
              <path d="M16 17q2-3 4 0q2 3 4 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
            </svg>
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
