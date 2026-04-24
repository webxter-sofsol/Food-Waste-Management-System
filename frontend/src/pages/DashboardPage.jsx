import {
  Box, Button, Card, CardContent, Chip, Grid,
  Typography, Avatar, Divider,
} from '@mui/material';
import {
  ArrowForward,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Restaurant as RestaurantIcon,
  CheckCircleOutline,
  Verified,
  HourglassEmpty,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ── per-role config ────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  donor: {
    title: 'Donor Dashboard',
    subtitle: 'Share your surplus food and help reduce waste in your community.',
    emoji: '🍽️',
    gradient: ['#16a34a', '#15803d'],
    actions: [
      { label: 'Create Listing', path: '/donor/create-listing', primary: true },
      { label: 'My Listings',    path: '/donor/dashboard' },
      { label: 'View Requests',  path: '/donor/requests' },
    ],
    quickLinks: [
      { emoji: '📋', label: 'My Listings',    path: '/donor/dashboard' },
      { emoji: '➕', label: 'New Listing',    path: '/donor/create-listing' },
      { emoji: '📬', label: 'Requests',       path: '/donor/requests' },
      { emoji: '🤝', label: 'Matches',        path: '/donor/matches' },
    ],
  },
  receiver: {
    title: 'Receiver Dashboard',
    subtitle: 'Find and request food items from generous donors near you.',
    emoji: '🤲',
    gradient: ['#2563eb', '#1d4ed8'],
    actions: [
      { label: 'Browse Food',  path: '/receiver/food-listings', primary: true },
      { label: 'My Requests', path: '/receiver/dashboard' },
      { label: 'My Matches',  path: '/receiver/matches' },
    ],
    quickLinks: [
      { emoji: '🔍', label: 'Browse Food',  path: '/receiver/food-listings' },
      { emoji: '📬', label: 'My Requests', path: '/receiver/dashboard' },
      { emoji: '🤝', label: 'My Matches',  path: '/receiver/matches' },
      { emoji: '👤', label: 'Profile',     path: '/profile' },
    ],
  },
  volunteer: {
    title: 'Volunteer Dashboard',
    subtitle: 'Help deliver food from donors to receivers in your area.',
    emoji: '🚚',
    gradient: ['#ea580c', '#c2410c'],
    actions: [
      { label: 'Available Deliveries', path: '/volunteer/dashboard',   primary: true },
      { label: 'My Assignments',       path: '/volunteer/assignments' },
      { label: 'Delivery History',     path: '/volunteer/history' },
    ],
    quickLinks: [
      { emoji: '📦', label: 'Available',   path: '/volunteer/dashboard' },
      { emoji: '📋', label: 'Assignments', path: '/volunteer/assignments' },
      { emoji: '🚚', label: 'Deliveries',  path: '/volunteer/deliveries' },
      { emoji: '👤', label: 'Profile',     path: '/profile' },
    ],
  },
  admin: {
    title: 'Admin Dashboard',
    subtitle: 'Manage users, verify accounts, and monitor system health.',
    emoji: '⚙️',
    gradient: ['#7c3aed', '#6d28d9'],
    actions: [
      { label: 'Admin Panel',    path: '/admin/dashboard',     primary: true },
      { label: 'Verifications',  path: '/admin/verifications' },
      { label: 'Reports',        path: '/admin/reports' },
      { label: 'Metrics',        path: '/admin/metrics' },
    ],
    quickLinks: [
      { emoji: '🛡️', label: 'Verifications', path: '/admin/verifications' },
      { emoji: '📊', label: 'Reports',       path: '/admin/reports' },
      { emoji: '📈', label: 'Metrics',       path: '/admin/metrics' },
      { emoji: '👤', label: 'Profile',       path: '/profile' },
    ],
  },
};

const STATS = [
  { label: 'Active Users',       value: '2,847',  icon: <PeopleIcon sx={{ fontSize: 20 }} />,      color: '#2563eb', bg: '#eff6ff' },
  { label: 'Food Items Shared',  value: '15,234', icon: <RestaurantIcon sx={{ fontSize: 20 }} />,  color: '#16a34a', bg: '#f0fdf4' },
  { label: 'Successful Matches', value: '8,921',  icon: <TrendingUpIcon sx={{ fontSize: 20 }} />,  color: '#ea580c', bg: '#fff7ed' },
];

// ── small reusable pieces ──────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color, bg }) => (
  <Card sx={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%' }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </Box>
        <TrendingUpIcon sx={{ fontSize: 14, color: '#16a34a' }} />
      </Box>
      <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1, mb: 0.5 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
    </CardContent>
  </Card>
);

const QuickLinkCard = ({ emoji, label, path, navigate }) => (
  <Card
    onClick={() => navigate(path)}
    sx={{
      cursor: 'pointer', border: '1px solid #f1f5f9',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'all 0.15s',
      '&:hover': { borderColor: '#16a34a', boxShadow: '0 4px 12px rgba(22,163,74,0.12)', transform: 'translateY(-1px)' },
    }}
  >
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
      <Box sx={{ fontSize: '1.5rem', mb: 0.75 }}>{emoji}</Box>
      <Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

// ── main component ─────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const cfg = ROLE_CONFIG[user?.role] ?? {
    title: 'Dashboard', subtitle: 'Welcome to FoodShare.', emoji: '🌿',
    gradient: ['#16a34a', '#15803d'], actions: [], quickLinks: [],
  };

  const firstName = user?.profile?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  const isVerified = user?.is_verified || user?.verification_status === 'approved';

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100%', p: { xs: 2, sm: 3 } }}>
      <Grid container spacing={3}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <Grid item xs={12} lg={8}>

          {/* Welcome card */}
          <Card
            sx={{
              mb: 3,
              background: `linear-gradient(135deg, ${cfg.gradient[0]} 0%, ${cfg.gradient[1]} 100%)`,
              border: 'none',
              boxShadow: `0 8px 24px ${cfg.gradient[0]}40`,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Decorative circles */}
            <Box sx={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -40, right: 60, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, '&:last-child': { pb: { xs: 2.5, sm: 3.5 } }, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2.5 }}>
                <Box
                  sx={{
                    width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 },
                    borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: { xs: '1.5rem', sm: '1.75rem' }, flexShrink: 0,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {cfg.emoji}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                    {cfg.title}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ color: 'white', fontWeight: 800, lineHeight: 1.2, fontSize: { xs: '1.4rem', sm: '1.75rem' }, wordBreak: 'break-word' }}
                  >
                    Good day, {firstName}!
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ color: 'rgba(255,255,255,0.85)', mb: 3, fontSize: { xs: '0.875rem', sm: '0.95rem' }, maxWidth: 480, lineHeight: 1.6 }}>
                {cfg.subtitle}
              </Typography>

              {/* Status badges */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                <Chip
                  size="small"
                  label={`${cfg.emoji} ${user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.75rem' }}
                />
                <Chip
                  size="small"
                  icon={isVerified
                    ? <Verified sx={{ fontSize: '14px !important', color: 'white !important' }} />
                    : <HourglassEmpty sx={{ fontSize: '14px !important', color: 'rgba(255,255,255,0.8) !important' }} />
                  }
                  label={isVerified ? 'Verified' : 'Pending Verification'}
                  sx={{
                    bgcolor: isVerified ? 'rgba(255,255,255,0.2)' : 'rgba(251,191,36,0.25)',
                    color: 'white', fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.25)',
                    fontSize: '0.75rem',
                  }}
                />
              </Box>

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {cfg.actions.map((action, i) => (
                  <Button
                    key={i}
                    size="small"
                    variant={action.primary ? 'contained' : 'outlined'}
                    endIcon={action.primary ? <ArrowForward sx={{ fontSize: 14 }} /> : null}
                    onClick={() => navigate(action.path)}
                    sx={action.primary ? {
                      bgcolor: 'white', color: cfg.gradient[0],
                      fontWeight: 700, px: 2,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      '&:hover': { bgcolor: '#f8fafc', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
                    } : {
                      borderColor: 'rgba(255,255,255,0.45)', color: 'white',
                      fontWeight: 600, px: 2,
                      '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Stats row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {STATS.map((s) => (
              <Grid item xs={12} sm={4} key={s.label}>
                <StatCard {...s} />
              </Grid>
            ))}
          </Grid>

          {/* How it works */}
          <Card sx={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5 }}>
                How FoodShare Works
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { step: 1, emoji: '🍽️', title: 'Donors list food', body: 'Restaurants and households post surplus food with pickup details and expiry times.' },
                  { step: 2, emoji: '🔍', title: 'Receivers browse', body: 'People in need browse available listings and request what they need.' },
                  { step: 3, emoji: '🚚', title: 'Volunteers deliver', body: 'Volunteers coordinate pickup and delivery to get food where it\'s needed.' },
                ].map(({ step, emoji, title, body }, i, arr) => (
                  <Box key={step}>
                    <Box sx={{ display: 'flex', gap: 2, py: 2 }}>
                      {/* Step indicator */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <Box
                          sx={{
                            width: 40, height: 40, borderRadius: '50%',
                            bgcolor: '#f0fdf4', border: '2px solid #bbf7d0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem',
                          }}
                        >
                          {emoji}
                        </Box>
                        {i < arr.length - 1 && (
                          <Box sx={{ width: 2, flexGrow: 1, bgcolor: '#e2e8f0', mt: 1, minHeight: 20 }} />
                        )}
                      </Box>
                      {/* Content */}
                      <Box sx={{ pt: 0.5, pb: i < arr.length - 1 ? 1 : 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: 'white', fontSize: '0.65rem', fontWeight: 800 }}>{step}</Typography>
                          </Box>
                          <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{body}</Typography>
                      </Box>
                    </Box>
                    {i < arr.length - 1 && <Divider sx={{ ml: 7 }} />}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <Grid item xs={12} lg={4}>

          {/* Quick links */}
          <Card sx={{ mb: 3, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Quick Links</Typography>
              <Grid container spacing={1.5}>
                {cfg.quickLinks.map((ql) => (
                  <Grid item xs={6} key={ql.label}>
                    <QuickLinkCard {...ql} navigate={navigate} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Account info */}
          <Card sx={{ mb: 3, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Account</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Avatar
                  sx={{
                    width: 44, height: 44, fontWeight: 800, fontSize: '1rem',
                    bgcolor: '#f0fdf4', color: '#15803d',
                  }}
                >
                  {(user?.profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {user?.profile?.full_name || user?.email?.split('@')[0]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {user?.email}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  {
                    label: 'Role',
                    value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1),
                    icon: <Box sx={{ fontSize: '0.9rem' }}>{cfg.emoji}</Box>,
                  },
                  {
                    label: 'Status',
                    value: isVerified ? 'Verified' : 'Pending',
                    icon: isVerified
                      ? <CheckCircleOutline sx={{ fontSize: 16, color: '#16a34a' }} />
                      : <HourglassEmpty sx={{ fontSize: 16, color: '#f59e0b' }} />,
                    valueColor: isVerified ? '#16a34a' : '#b45309',
                  },
                ].map(({ label, value, icon, valueColor }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {icon}
                      <Typography variant="caption" fontWeight={700} sx={{ color: valueColor || 'text.primary' }}>{value}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => navigate('/profile')}
                sx={{ mt: 2, borderRadius: '8px', fontWeight: 600 }}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Mission card */}
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #bbf7d0',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ fontSize: '1.5rem', mb: 1 }}>💚</Box>
              <Typography variant="subtitle2" fontWeight={700} color="primary.dark" gutterBottom>
                Our Mission
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block' }}>
                Connecting food donors with receivers through our volunteer network — reducing waste and fighting hunger, one meal at a time.
              </Typography>
            </CardContent>
          </Card>

        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
