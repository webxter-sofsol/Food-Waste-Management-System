import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Card, CardContent, Chip, CircularProgress,
  Container, Divider, Grid, IconButton, Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import { LocalShipping, LocationOn, Refresh } from '@mui/icons-material';
import api from '../services/api';

const STATUS_CFG = {
  matched:     { label: 'Matched',     color: 'info' },
  in_progress: { label: 'In Progress', color: 'warning' },
  completed:   { label: 'Completed',   color: 'success' },
  cancelled:   { label: 'Cancelled',   color: 'error' },
};

const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—';

const DeliveryCard = ({ item }) => {
  const cfg = STATUS_CFG[item.assignment_status] ?? STATUS_CFG[item.status] ?? { label: 'Unknown', color: 'default' };
  const match = item.match || item;
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='flex-start' gap={1} mb={1.5}>
          <Box minWidth={0}>
            <Typography variant='subtitle2' fontWeight={700} noWrap>
              {match.listing_food_type || match.food_type || 'Delivery'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>ID #{item.id}</Typography>
          </Box>
          <Chip label={cfg.label} color={cfg.color} size='small' sx={{ flexShrink: 0 }} />
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Box display='flex' flexDirection='column' gap={0.75}>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Quantity</Typography>
            <Typography variant='caption' fontWeight={600}>{match.matched_quantity || '—'} servings</Typography>
          </Box>
          {item.pickup_address && (
            <Box display='flex' alignItems='flex-start' gap={0.75}>
              <LocationOn sx={{ fontSize: 14, color: 'text.secondary', mt: 0.1 }} />
              <Typography variant='caption' color='text.secondary'>{item.pickup_address}</Typography>
            </Box>
          )}
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Accepted</Typography>
            <Typography variant='caption' fontWeight={600}>{fmt(item.assigned_at)}</Typography>
          </Box>
          {item.completed_at && (
            <Box display='flex' justifyContent='space-between'>
              <Typography variant='caption' color='text.secondary'>Completed</Typography>
              <Typography variant='caption' fontWeight={600} color='success.main'>{fmt(item.completed_at)}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const VolunteerDeliveriesPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/volunteer/assignments/');
      const data = res.data.results || res.data || [];
      // Active deliveries = accepted assignments
      const deliveries = (Array.isArray(data) ? data : []).filter(i => i.assignment_status === 'accepted' || i.assignment_status === 'completed');
      setItems(deliveries);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load deliveries.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === 'all' ? items : items.filter(i => i.assignment_status === tab);
  const counts = items.reduce((a, i) => { a[i.assignment_status] = (a[i.assignment_status] || 0) + 1; return a; }, {});

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      <Box display='flex' justifyContent='space-between' alignItems='flex-start' flexWrap='wrap' gap={2} mb={3}>
        <Box display='flex' alignItems='center' gap={1.5}>
          <Avatar sx={{ bgcolor: '#eff6ff', color: 'info.main', width: 44, height: 44 }}><LocalShipping /></Avatar>
          <Box>
            <Typography variant='h5' fontWeight={800}>Active Deliveries</Typography>
            <Typography variant='body2' color='text.secondary'>Your accepted and completed deliveries</Typography>
          </Box>
        </Box>
        <Tooltip title='Refresh'><IconButton size='small' onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' scrollButtons='auto'>
          <Tab label={`All (${items.length})`} value='all' />
          <Tab label={`Active (${counts.accepted || 0})`} value='accepted' />
          <Tab label={`Completed (${counts.completed || 0})`} value='completed' />
        </Tabs>
      </Box>

      {loading ? (
        <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign='center' py={8}>
          <LocalShipping sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant='h6' color='text.secondary'>No {tab === 'all' ? '' : tab} deliveries</Typography>
          <Typography variant='body2' color='text.secondary' mt={1}>
            Accept an assignment to start a delivery.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {filtered.map(item => (
            <Grid item xs={12} sm={6} lg={4} key={item.id}>
              <DeliveryCard item={item} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default VolunteerDeliveriesPage;
