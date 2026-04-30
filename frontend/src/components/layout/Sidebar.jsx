import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Divider, Box, Typography, Avatar, useMediaQuery, useTheme, Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Restaurant as RestaurantIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  LocalShipping as DeliveryIcon,
  VerifiedUser as VerifiedUserIcon,
  Assessment as ReportIcon,
  BarChart as MetricsIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

export const SIDEBAR_WIDTH = 240;

const ROLE_META = {
  donor:     { label: 'Donor',     bg: '#dcfce7', color: '#15803d', emoji: '🍽️' },
  receiver:  { label: 'Receiver',  bg: '#dbeafe', color: '#1d4ed8', emoji: '🤲' },
  volunteer: { label: 'Volunteer', bg: '#fef3c7', color: '#b45309', emoji: '🚚' },
  admin:     { label: 'Admin',     bg: '#f3e8ff', color: '#7e22ce', emoji: '⚙️' },
};

const NAV = {
  donor: [
    { label: 'Dashboard',      path: '/donor/dashboard',      icon: <DashboardIcon /> },
    { label: 'My Listings',    path: '/donor/listings',       icon: <RestaurantIcon /> },
    { label: 'Create Listing', path: '/donor/create-listing', icon: <AddIcon /> },
    { label: 'Requests',       path: '/donor/requests',       icon: <AssignmentIcon /> },
    { label: 'Matches',        path: '/donor/matches',        icon: <DeliveryIcon /> },
  ],
  receiver: [
    { label: 'Dashboard',   path: '/receiver/dashboard',     icon: <DashboardIcon /> },
    { label: 'Browse Food', path: '/receiver/food-listings', icon: <SearchIcon /> },
    { label: 'My Requests', path: '/receiver/requests',      icon: <AssignmentIcon /> },
    { label: 'Matches',     path: '/receiver/matches',       icon: <DeliveryIcon /> },
  ],
  volunteer: [
    { label: 'Dashboard',        path: '/volunteer/dashboard',   icon: <DashboardIcon /> },
    { label: 'Available Matches',path: '/volunteer/available',   icon: <SearchIcon /> },
    { label: 'My Assignments',   path: '/volunteer/assignments', icon: <AssignmentIcon /> },
    { label: 'Active Deliveries',path: '/volunteer/deliveries',  icon: <DeliveryIcon /> },
  ],
  admin: [
    { label: 'Dashboard',       path: '/admin/dashboard',     icon: <DashboardIcon /> },
    { label: 'All Users',       path: '/admin/users',         icon: <PeopleIcon /> },
    { label: 'Food Listings',   path: '/admin/listings',      icon: <RestaurantIcon /> },
    { label: 'Verifications',   path: '/admin/verifications', icon: <VerifiedUserIcon /> },
    { label: 'Reports',         path: '/admin/reports',       icon: <ReportIcon /> },
    { label: 'System Metrics',  path: '/admin/metrics',       icon: <MetricsIcon /> },
  ],
};

const Sidebar = ({ open, onClose, variant = 'permanent' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const go = (path) => { navigate(path); if (isMobile && onClose) onClose(); };
  const handleLogout = async () => { await logout(); navigate('/login'); };

  const items = NAV[user?.role] || [];
  const meta = ROLE_META[user?.role] ?? { label: 'User', bg: '#f1f5f9', color: '#475569', emoji: '👤' };
  const initials = user?.profile?.full_name
    ? user.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? '?';

  const content = (
    <Box sx={{ width: SIDEBAR_WIDTH, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'white' }}>
      {/* Brand strip */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Box
          sx={{
            width: 34, height: 34, borderRadius: '10px',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', flexShrink: 0,
          }}
        >
          🌿
        </Box>
        <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.3px', fontSize: '1.05rem' }}>
          FoodShare
        </Typography>
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* User card */}
      {user && (
        <Box sx={{ mx: 1.5, my: 1.5, p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar sx={{ width: 36, height: 36, fontSize: '0.8rem', fontWeight: 700, bgcolor: meta.bg, color: meta.color, flexShrink: 0 }}>
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.3 }}>
                {user.profile?.full_name || user.email.split('@')[0]}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem' }}>
                {user.email}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Chip
              label={`${meta.emoji} ${meta.label}`}
              size="small"
              sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 600, fontSize: '0.7rem', height: 22, borderRadius: 6 }}
            />
          </Box>
        </Box>
      )}

      {/* Nav label */}
      <Typography variant="caption" sx={{ px: 2.5, mb: 0.5, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
        Navigation
      </Typography>

      {/* Nav items */}
      <List sx={{ flexGrow: 1, py: 0, px: 0 }}>
        {items.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                selected={active}
                onClick={() => go(item.path)}
                sx={{ py: 0.9, minHeight: 40 }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { variant: 'body2', fontWeight: active ? 700 : 500, noWrap: true } }}
                />
                {active && (
                  <Box sx={{ width: 3, height: 20, borderRadius: 99, bgcolor: 'primary.main', flexShrink: 0 }} />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: 2 }} />

      {/* Bottom links */}
      <List sx={{ py: 0.5 }}>
        <ListItem disablePadding sx={{ mb: 0.25 }}>
          <ListItemButton onClick={() => go('/profile')} sx={{ py: 0.9 }}>
            <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}><PersonIcon /></ListItemIcon>
            <ListItemText primary="Profile" slotProps={{ primary: { variant: 'body2', fontWeight: 500 } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ py: 0.9, '&:hover': { bgcolor: '#fef2f2' } }}>
            <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Sign out" slotProps={{ primary: { variant: 'body2', fontWeight: 500, sx: { color: 'error.main' } } }} />
          </ListItemButton>
        </ListItem>
      </List>

      {/* Bottom padding */}
      <Box sx={{ pb: 1 }} />
    </Box>
  );

  if (variant === 'temporary') {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { width: SIDEBAR_WIDTH, maxWidth: '80vw', border: 'none' } }}
      >
        {content}
      </Drawer>
    );
  }

  return <Box sx={{ width: SIDEBAR_WIDTH, height: '100%' }}>{content}</Box>;
};

export default Sidebar;
