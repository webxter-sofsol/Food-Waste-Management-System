import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip,
  CircularProgress, Container, Divider, Grid, IconButton,
  Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import { Assignment, CheckCircle, Refresh } from '@mui/icons-material';
import api from '../services/api';

const STATUS_CFG = {
  pending:   { label: 'Pending',   color: 'warning' },
  accepted:  { label: 'Accepted',  color: 'info' },
  completed: { label: 'Completed', color: 'success' },
};

const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—';

const AssignmentCard = ({ item, onAccept }) => {
  const cfg = STATUS_CFG[item.assignment_status] ?? { label: item.assignment_status, color: 'default' };
  const match = item.match || item;
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='flex-start' gap={1} mb={1.5}>
          <Box minWidth={0}>
            <Typography variant='subtitle2' fontWeight={700} noWrap>
              {match.listing_food_type || match.food_type || 'Assignment'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>ID #{item.id}</Typography>
          </Box>
          <Chip label={cfg.label} color={cfg.color} size='small' sx={{ flexShrink: 0 }} />
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Box display='flex' flexDirection='column' gap={0.75}>
          {item.distance_km != null && (
            <Box display='flex' justifyContent='space-between'>
              <Typography variant='caption' color='text.secondary'>Distance</Typography>
              <Typography variant='caption' fontWeight={600}>{item.distance_km} km</Typography>
            </Box>
          )}
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Quantity</Typography>
            <Typography variant='caption' fontWeight={600}>{match.matched_quantity || '—'} servings</Typography>
          </Box>
          {item.pickup_address && (
            <Typography variant='caption' color='text.secondary' noWrap>📍 {item.pickup_address}</Typography>
          )}
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Created</Typography>
            <Typography variant='caption' fontWeight={600}>{fmt(item.created_at)}</Typography>
          </Box>
          {item.assigned_at && (
            <Box display='flex' justifyContent='space-between'>
              <Typography variant='caption' color='text.secondary'>Accepted</Typography>
              <Typography variant='caption' fontWeight={600}>{fmt(item.assigned_at)}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
      {item.assignment_status === 'pending' && onAccept && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1.25 }}>
            <Button size='small' variant='contained' fullWidth startIcon={<CheckCircle />} onClick={() => onAccept(item)}>
              Accept Assignment
            </Button>
          </Box>
        </>
      )}
    </Card>
  );
};

const VolunteerAssignmentsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/volunteer/assignments/');
      const data = res.data.results || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load assignments.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (item) => {
    try {
      await api.post(`/volunteer/assignments/${item.id}/accept/`);
      setSuccess('Assignment accepted!');
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to accept assignment.');
    }
  };

  const filtered = tab === 'all' ? items : items.filter(i => i.assignment_status === tab);
  const counts = items.reduce((a, i) => { a[i.assignment_status] = (a[i.assignment_status] || 0) + 1; return a; }, {});

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      <Box display='flex' justifyContent='space-between' alignItems='flex-start' flexWrap='wrap' gap={2} mb={3}>
        <Box display='flex' alignItems='center' gap={1.5}>
          <Avatar sx={{ bgcolor: '#fff7ed', color: 'warning.main', width: 44, height: 44 }}><Assignment /></Avatar>
          <Box>
            <Typography variant='h5' fontWeight={800}>My Assignments</Typography>
            <Typography variant='body2' color='text.secondary'>Volunteer pickup assignments</Typography>
          </Box>
        </Box>
        <Tooltip title='Refresh'><IconButton size='small' onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity='success' sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' scrollButtons='auto'>
          <Tab label={`All (${items.length})`} value='all' />
          <Tab label={`Pending (${counts.pending || 0})`} value='pending' />
          <Tab label={`Accepted (${counts.accepted || 0})`} value='accepted' />
          <Tab label={`Completed (${counts.completed || 0})`} value='completed' />
        </Tabs>
      </Box>

      {loading ? (
        <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign='center' py={8}>
          <Assignment sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant='h6' color='text.secondary'>No {tab === 'all' ? '' : tab} assignments</Typography>
          <Typography variant='body2' color='text.secondary' mt={1}>
            Check Available Matches to find deliveries near you.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {filtered.map(item => (
            <Grid item xs={12} sm={6} lg={4} key={item.id}>
              <AssignmentCard item={item} onAccept={handleAccept} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default VolunteerAssignmentsPage;
