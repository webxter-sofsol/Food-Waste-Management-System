import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip,
  CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, IconButton,
  Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import { Assignment, Cancel, Refresh } from '@mui/icons-material';
import api from '../services/api';

const STATUS_CFG = {
  pending:   { label: 'Pending',   color: 'warning' },
  approved:  { label: 'Approved',  color: 'success' },
  rejected:  { label: 'Rejected',  color: 'error' },
  cancelled: { label: 'Cancelled', color: 'default' },
};

const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—';

const RequestCard = ({ req, onCancel }) => {
  const cfg = STATUS_CFG[req.status] ?? { label: req.status, color: 'default' };
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='flex-start' gap={1} mb={1.5}>
          <Box minWidth={0}>
            <Typography variant='subtitle2' fontWeight={700} noWrap>
              {req.listing_food_type || 'Food Request'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              from {req.donor_name || 'Donor'}
            </Typography>
          </Box>
          <Chip label={cfg.label} color={cfg.color} size='small' sx={{ flexShrink: 0 }} />
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Box display='flex' flexDirection='column' gap={0.75}>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Quantity</Typography>
            <Typography variant='caption' fontWeight={600}>{req.requested_quantity} servings</Typography>
          </Box>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Pickup preference</Typography>
            <Typography variant='caption' fontWeight={600}>{fmt(req.pickup_time_preference)}</Typography>
          </Box>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Requested</Typography>
            <Typography variant='caption' fontWeight={600}>{fmt(req.created_at)}</Typography>
          </Box>
          {req.special_instructions && (
            <Box mt={0.5} p={1} bgcolor='#f8fafc' borderRadius={1}>
              <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                "{req.special_instructions}"
              </Typography>
            </Box>
          )}
          {req.rejection_reason && (
            <Box mt={0.5} p={1} bgcolor='#fef2f2' borderRadius={1}>
              <Typography variant='caption' color='error.main'>Reason: {req.rejection_reason}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
      {req.status === 'pending' && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1.25 }}>
            <Button size='small' color='error' variant='outlined' fullWidth startIcon={<Cancel />} onClick={() => onCancel(req)}>
              Cancel Request
            </Button>
          </Box>
        </>
      )}
    </Card>
  );
};

const CancelDialog = ({ open, onClose, onConfirm, loading }) => (
  <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
    <DialogTitle>Cancel Request</DialogTitle>
    <DialogContent>
      <Typography variant='body2' color='text.secondary'>
        Are you sure you want to cancel this food request?
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>Keep</Button>
      <Button variant='contained' color='error' onClick={onConfirm} disabled={loading}>
        {loading ? <CircularProgress size={18} /> : 'Cancel Request'}
      </Button>
    </DialogActions>
  </Dialog>
);

const ReceiverRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/food-requests/list/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRequests(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load requests.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await api.delete(`/food-requests/${cancelTarget.id}/`);
      setSuccess('Request cancelled.');
      setCancelTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel request.');
    }
    setCancelLoading(false);
  };

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab);
  const counts = requests.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      <Box display='flex' justifyContent='space-between' alignItems='flex-start' flexWrap='wrap' gap={2} mb={3}>
        <Box display='flex' alignItems='center' gap={1.5}>
          <Avatar sx={{ bgcolor: '#fff7ed', color: 'warning.main', width: 44, height: 44 }}>
            <Assignment />
          </Avatar>
          <Box>
            <Typography variant='h5' fontWeight={800}>My Requests</Typography>
            <Typography variant='body2' color='text.secondary'>Food requests you have submitted</Typography>
          </Box>
        </Box>
        <Tooltip title='Refresh'><IconButton size='small' onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity='success' sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' scrollButtons='auto'>
          <Tab label={`All (${requests.length})`} value='all' />
          <Tab label={`Pending (${counts.pending || 0})`} value='pending' />
          <Tab label={`Approved (${counts.approved || 0})`} value='approved' />
          <Tab label={`Rejected (${counts.rejected || 0})`} value='rejected' />
          <Tab label={`Cancelled (${counts.cancelled || 0})`} value='cancelled' />
        </Tabs>
      </Box>

      {loading ? (
        <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign='center' py={8}>
          <Assignment sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant='h6' color='text.secondary'>No {tab === 'all' ? '' : tab} requests</Typography>
          <Typography variant='body2' color='text.secondary' mt={1}>
            Browse food listings and submit a request to get started.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {filtered.map(req => (
            <Grid item xs={12} sm={6} lg={4} key={req.id}>
              <RequestCard req={req} onCancel={setCancelTarget} />
            </Grid>
          ))}
        </Grid>
      )}

      <CancelDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        loading={cancelLoading}
      />
    </Container>
  );
};

export default ReceiverRequestsPage;
