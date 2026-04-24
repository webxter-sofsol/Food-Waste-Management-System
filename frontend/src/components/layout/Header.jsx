import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Badge,
  Menu, MenuItem, Box, Drawer, List, ListItem, ListItemButton,
  ListItemText, useMediaQuery, useTheme, Avatar, Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  KeyboardArrowDown,
  Logout,
  Person,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import useNotifications from '../../hooks/useNotifications';

const ROLE_COLORS = {
  donor:     { bg: '#dcfce7', text: '#15803d' },
  receiver:  { bg: '#dbeafe', text: '#1d4ed8' },
  volunteer: { bg: '#fef3c7', text: '#b45309' },
  admin:     { bg: '#f3e8ff', text: '#7e22ce' },
};

const Header = ({ onMenuClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    if (!isAuthenticated || !user) return [];
    const role = user.role;
    const map = {
      donor:     [{ label: 'Dashboard', path: '/donor/dashboard' }, { label: 'Create Listing', path: '/donor/create-listing' }],
      receiver:  [{ label: 'Browse Food', path: '/receiver/food-listings' }, { label: 'My Requests', path: '/receiver/dashboard' }],
      volunteer: [{ label: 'Available', path: '/volunteer/dashboard' }, { label: 'Assignments', path: '/volunteer/assignments' }],
      admin:     [{ label: 'Dashboard', path: '/admin/dashboard' }, { label: 'Verifications', path: '/admin/verifications' }, { label: 'Reports', path: '/admin/reports' }, { label: 'Metrics', path: '/admin/metrics' }],
    };
    return [{ label: 'Home', path: '/dashboard' }, ...(map[role] || [])];
  };

  const navLinks = getNavLinks();
  const initials = user?.profile?.full_name
    ? user.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? '?';
  const roleStyle = ROLE_COLORS[user?.role] ?? { bg: '#f1f5f9', text: '#475569' };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'white',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ gap: 1, minWidth: 0, px: { xs: 2, sm: 3 } }}>
          {/* Mobile hamburger */}
          {isMobile && isAuthenticated && (
            <IconButton edge="start" onClick={onMenuClick} size="small" sx={{ mr: 0.5, color: 'text.secondary' }}>
              <MenuIcon />
            </IconButton>
          )}

          {/* Brand */}
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              textDecoration: 'none', flexShrink: 0,
              mr: { xs: 1, md: 4 },
            }}
          >
            <Box
              sx={{
                width: 32, height: 32, borderRadius: '10px',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem',
              }}
            >
              🌿
            </Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '1rem', sm: '1.15rem' }, letterSpacing: '-0.3px' }}
            >
              FoodShare
            </Typography>
          </Box>

          {/* Desktop nav */}
          {!isMobile && isAuthenticated && (
            <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1, overflow: 'hidden' }}>
              {navLinks.map((link) => {
                const active = location.pathname === link.path || location.pathname.startsWith(link.path + '/');
                return (
                  <Button
                    key={link.path}
                    component={Link}
                    to={link.path}
                    size="small"
                    sx={{
                      color: active ? 'primary.main' : 'text.secondary',
                      fontWeight: active ? 700 : 500,
                      bgcolor: active ? 'primary.light' + '20' : 'transparent',
                      px: 1.5,
                      '&:hover': { bgcolor: '#f0fdf4', color: 'primary.main' },
                    }}
                  >
                    {link.label}
                  </Button>
                );
              })}
            </Box>
          )}

          {!isAuthenticated && <Box sx={{ flexGrow: 1 }} />}

          {/* Right actions */}
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, ml: 'auto' }}>
              {/* Notifications */}
              <IconButton
                size="small"
                onClick={() => navigate('/notifications')}
                sx={{
                  color: 'text.secondary',
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  width: 36, height: 36,
                  '&:hover': { bgcolor: '#f0fdf4', borderColor: 'primary.main' },
                }}
              >
                <Badge badgeContent={unreadCount > 0 ? unreadCount : null} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
                  <NotificationsIcon sx={{ fontSize: 18 }} />
                </Badge>
              </IconButton>

              {/* User menu trigger */}
              <Box
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  cursor: 'pointer', px: 1, py: 0.5,
                  borderRadius: '10px', border: '1px solid #e2e8f0',
                  bgcolor: '#f8fafc',
                  '&:hover': { bgcolor: '#f0fdf4', borderColor: 'primary.main' },
                  transition: 'all 0.15s',
                }}
              >
                <Avatar
                  sx={{
                    width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700,
                    bgcolor: roleStyle.bg, color: roleStyle.text,
                  }}
                >
                  {initials}
                </Avatar>
                {!isMobile && (
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" fontWeight={600} noWrap sx={{ display: 'block', lineHeight: 1.2, color: 'text.primary' }}>
                      {user?.profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
                    </Typography>
                    <Typography variant="caption" sx={{ color: roleStyle.text, fontSize: '0.65rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      {user?.role}
                    </Typography>
                  </Box>
                )}
                <KeyboardArrowDown sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
              </Box>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    mt: 1, minWidth: 200, borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.12)',
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{user?.profile?.full_name || 'User'}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{user?.email}</Typography>
                  <Box
                    sx={{
                      mt: 0.5, display: 'inline-block', px: 1, py: 0.25,
                      borderRadius: 6, bgcolor: roleStyle.bg,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: roleStyle.text, fontWeight: 600, textTransform: 'capitalize', fontSize: '0.65rem' }}>
                      {user?.role}
                    </Typography>
                  </Box>
                </Box>
                <Divider />
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }} sx={{ gap: 1.5, py: 1 }}>
                  <Person fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2">Profile</Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1, color: 'error.main' }}>
                  <Logout fontSize="small" />
                  <Typography variant="body2">Sign out</Typography>
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Button component={Link} to="/login" variant="outlined" size="small" sx={{ borderRadius: 8 }}>
                Sign in
              </Button>
              <Button component={Link} to="/register" variant="contained" size="small" sx={{ borderRadius: 8, display: { xs: 'none', sm: 'inline-flex' } }}>
                Get started
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: '80vw', maxWidth: 280, borderRadius: '0 16px 16px 0' } }}
        >
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={800}>FoodShare</Typography>
            <IconButton size="small" onClick={() => setMobileOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Divider />
          <List sx={{ pt: 1 }}>
            {navLinks.map((link) => (
              <ListItem key={link.path} disablePadding>
                <ListItemButton component={Link} to={link.path} onClick={() => setMobileOpen(false)}>
                  <ListItemText primary={link.label} slotProps={{ primary: { variant: 'body2', fontWeight: 500 } }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
      )}
    </>
  );
};

export default Header;
