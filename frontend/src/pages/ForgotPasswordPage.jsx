import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent,
  CircularProgress, Link, TextField, Typography,
} from '@mui/material';
import { ArrowBack, Email, LockReset } from '@mui/icons-material';
import api from '../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim()) { setEmailError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Invalid email format'); return false; }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password/', { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f8fafc',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Header */}
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '16px',
                bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center',
                justifyContent: 'center', mb: 2,
              }}
            >
              <LockReset sx={{ fontSize: 28, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Forgot Password
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {submitted
                ? 'Check your inbox for the reset link.'
                : "Enter your email and we'll send you a reset link."}
            </Typography>
          </Box>

          {/* Success state */}
          {submitted ? (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                If <strong>{email}</strong> is registered, a password reset link has been sent.
                Check your inbox (and spam folder).
              </Alert>
              <Typography variant="body2" color="text.secondary" textAlign="center" mb={2}>
                Didn't receive it?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => { setSubmitted(false); }}
                  sx={{ fontWeight: 600 }}
                >
                  Try again
                </Link>
              </Typography>
              <Button
                fullWidth
                variant="contained"
                component={RouterLink}
                to="/login"
                startIcon={<ArrowBack />}
              >
                Back to Login
              </Button>
            </Box>
          ) : (
            /* Request form */
            <Box component="form" onSubmit={handleSubmit}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <TextField
                label="Email Address"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                error={Boolean(emailError)}
                helperText={emailError}
                autoFocus
                autoComplete="email"
                slotProps={{ input: { startAdornment: <Email sx={{ mr: 1, color: 'text.disabled', fontSize: 20 }} /> } }}
                sx={{ mb: 2.5 }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ py: 1.5, mb: 2 }}
              >
                {loading ? <><CircularProgress size={20} sx={{ mr: 1 }} />Sending…</> : 'Send Reset Link'}
              </Button>

              <Box textAlign="center">
                <Link component={RouterLink} to="/login" variant="body2" color="text.secondary">
                  <ArrowBack sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                  Back to Login
                </Link>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPasswordPage;
