import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip,
  CircularProgress, Container, Divider, IconButton, List,
  ListItem, ListItemAvatar, ListItemText, Tooltip, Typography,
} from '@mui/material';
import {
  Notifications, DoneAll, Refresh, FiberManualRecord,
  Restaurant, Handshake, LocalShipping, VerifiedUser, Cancel,
} from '@mui/icons-material';
import api from '../services/api';

const TYPE_ICON = {
  food_request:        <Restaurant fontSize='small' />,
  match_created:       <Handshake fontSize='small' />,
  volunteer_assignment:<LocalShipping fontSize='small' />,
  verification:        <VerifiedUser fontSize='small' />,
  cancellation:        <Cancel fontSize='small' />,
  delivery_update:     <LocalShipping fontSize='small' />,
  safety_alert:        <Notifications fontSize='small' />,
};

const TYPE_COLOR = {
  food_request: '#f97316',
  match_created: '#16a34a',
  volunteer_assignment: '#3b82f6',
  verification: '#8b5cf6',
  cancellation: '#ef4444',
  delivery_update: '#3b82f6',
  safety_alert: '#ef4444',
};

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return d.toLocaleDateString();
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingRead, setMarkingRead] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data.results || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load notifications.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    setMarkingRead(true);
    try {
      await api.post('/notifications/mark-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      setError('Failed to mark notifications as read.');
    }
    setMarkingRead(false);
  };

  const markOneRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <Container maxWidth='md' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      <Box display='flex' justifyContent='space-between' alignItems='flex-start' flexWrap='wrap' gap={2} mb={3}>
        <Box display='flex' alignItems='center' gap={1.5}>
          <Avatar sx={{ bgcolor: '#f0fdf4', color: 'primary.main', width: 44, height: 44 }}>
            <Notifications />
          </Avatar>
          <Box>
            <Box display='flex' alignItems='center' gap={1}>
              <Typography variant='h5' fontWeight={800}>Notifications</Typography>
              {unread > 0 && <Chip label={unread + ' new'} color='primary' size='small' />}
            </Box>
            <Typography variant='body2' color='text.secondary'>Your recent activity</Typography>
          </Box>
        </Box>
        <Box display='flex' gap={1}>
          <Tooltip title='Refresh'><IconButton size='small' onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
          {unread > 0 && (
            <Button size='small' variant='outlined' startIcon={<DoneAll />} onClick={markAllRead} disabled={markingRead}>
              Mark all read
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
      ) : notifications.length === 0 ? (
        <Box textAlign='center' py={8}>
          <Notifications sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant='h6' color='text.secondary'>No notifications yet</Typography>
          <Typography variant='body2' color='text.secondary' mt={1}>
            Activity from food requests, matches, and deliveries will appear here.
          </Typography>
        </Box>
      ) : (
        <Card sx={{ border: '1px solid #f1f5f9' }}>
          <List disablePadding>
            {notifications.map((n, i) => (
              <Box key={n.id}>
                <ListItem
                  alignItems='flex-start'
                  onClick={() => !n.is_read && markOneRead(n.id)}
                  sx={{
                    cursor: !n.is_read ? 'pointer' : 'default',
                    bgcolor: n.is_read ? 'transparent' : '#f0fdf4',
                    '&:hover': { bgcolor: n.is_read ? '#f8fafc' : '#dcfce7' },
                    transition: 'background 0.15s',
                    px: { xs: 2, sm: 3 },
                    py: 2,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: TYPE_COLOR[n.type] + '20', color: TYPE_COLOR[n.type] || 'text.secondary', width: 40, height: 40 }}>
                      {TYPE_ICON[n.type] || <Notifications fontSize='small' />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display='flex' alignItems='center' gap={1}>
                        <Typography variant='body2' fontWeight={n.is_read ? 500 : 700}>{n.title}</Typography>
                        {!n.is_read && <FiberManualRecord sx={{ fontSize: 8, color: 'primary.main' }} />}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25, lineHeight: 1.5 }}>{n.message}</Typography>
                        <Typography variant='caption' color='text.disabled' sx={{ mt: 0.5, display: 'block' }}>{fmt(n.created_at)}</Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {i < notifications.length - 1 && <Divider component='li' />}
              </Box>
            ))}
          </List>
        </Card>
      )}
    </Container>
  );
};

export default NotificationsPage;
