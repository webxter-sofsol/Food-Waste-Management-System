import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent,
  CircularProgress, IconButton, InputAdornment,
  Link, TextField, Typography,
} from '@mui/material';
import { ArrowBack, LockReset, Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../services/api';

const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect to forgot-password if no token in URL
  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true });
  }, [token, navigate]);

  const validate = () => {
    const errs = {};
    if (!password) errs.password = 'Password is required';
    else if (!passwordRules.test(password))
      errs.password = 'Must be 8+ chars with uppercase, lowercase, number, and special character';
    if (!confirm) errs.confirm = 'Please confirm your password';
    else if (password !== confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await api.post('/auth/reset-password/', {
        token,
        password,
        password_confirm: confirm,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const data = err.response?.data;
      setApiError(
        Array.isArray(data?.error) ? data.error.join(' ') : data?.error || 'Something went wrong.'
      );
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
              Set New Password
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {success ? 'Your password has been reset.' : 'Choose a strong new password.'}
            </Typography>
          </Box>

          {/* Success state */}
          {success ? (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                Password reset successfully! Redirecting to login…
              </Alert>
              <Button
                fullWidth
                variant="contained"
                component={RouterLink}
                to="/login"
                startIcon={<ArrowBack />}
              >
                Go to Login
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

              <TextField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                error={Boolean(errors.password)}
                helperText={errors.password}
                autoFocus
                autoComplete="new-password"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword(v => !v)} edge="end">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Confirm New Password"
                type={showConfirm ? 'text' : 'password'}
                fullWidth
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: '' })); }}
                error={Boolean(errors.confirm)}
                helperText={errors.confirm}
                autoComplete="new-password"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowConfirm(v => !v)} edge="end">
                          {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
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
                {loading ? <><CircularProgress size={20} sx={{ mr: 1 }} />Resetting…</> : 'Reset Password'}
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

export default ResetPasswordPage;
