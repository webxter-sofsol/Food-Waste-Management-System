import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, Grid, IconButton, InputLabel, MenuItem, Select,
  Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import { Handshake, PersonAdd, Refresh } from '@mui/icons-material';
import api from '../services/api';

const STATUS_CFG = {
  matched:     { label: 'Matched',     color: 'info' },
  in_progress: { label: 'In Progress', color: 'warning' },
  completed:   { label: 'Completed',   color: 'success' },
  cancelled:   { label: 'Cancelled',   color: 'error' },
};

const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—';

const AssignDialog = ({ open, match, volunteers, onClose, onAssign }) => {
  const [volunteerId, setVolunteerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAssign = async () => {
    if (!volunteerId) { setError('Please select a volunteer.'); return; }
    setLoading(true); setError('');
    try {
      await onAssign(match.id, volunteerId);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign volunteer.');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Assign Volunteer</DialogTitle>
      <DialogContent>
        {match && (
          <Box mb={2} p={1.5} bgcolor='#f8fafc' borderRadius={2}>
            <Typography variant='body2' fontWeight={700}>{match.listing_food_type}</Typography>
            <Typography variant='caption' color='text.secondary'>{match.listing_pickup_address}</Typography>
            <Box display='flex' gap={1} mt={0.5}>
              <Typography variant='caption'>Donor: {match.donor_name}</Typography>
              <Typography variant='caption'>•</Typography>
              <Typography variant='caption'>Receiver: {match.receiver_name}</Typography>
            </Box>
          </Box>
        )}
        {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth>
          <InputLabel>Select Volunteer</InputLabel>
          <Select value={volunteerId} label='Select Volunteer' onChange={e => setVolunteerId(e.target.value)}>
            {volunteers.map(v => (
              <MenuItem key={v.id} value={v.id}>
                {v.name} ({v.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {volunteers.length === 0 && (
          <Typography variant='caption' color='text.secondary' mt={1} display='block'>
            No verified volunteers available.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant='contained' onClick={handleAssign} disabled={loading || !volunteerId}>
          {loading ? <CircularProgress size={18} /> : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MatchCard = ({ match, onAssign }) => {
  const cfg = STATUS_CFG[match.status] ?? { label: match.status, color: 'default' };
  const canAssign = match.status === 'matched' && !match.volunteer_assigned;
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='flex-start' gap={1} mb={1.5}>
          <Box minWidth={0}>
            <Typography variant='subtitle2' fontWeight={700} noWrap>{match.listing_food_type}</Typography>
            <Typography variant='caption' color='text.secondary' noWrap>{match.listing_pickup_address}</Typography>
          </Box>
          <Chip label={cfg.label} color={cfg.color} size='small' sx={{ flexShrink: 0 }} />
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Box display='flex' flexDirection='column' gap={0.75}>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Donor</Typography>
            <Typography variant='caption' fontWeight={600}>{match.donor_name}</Typography>
          </Box>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Receiver</Typography>
            <Typography variant='caption' fontWeight={600}>{match.receiver_name}</Typography>
          </Box>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Quantity</Typography>
            <Typography variant='caption' fontWeight={600}>{match.matched_quantity} servings</Typography>
          </Box>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Volunteer</Typography>
            {match.volunteer_assigned ? (
              <Chip label={match.volunteer_name || match.volunteer_email} color='success' size='small' sx={{ height: 18, fontSize: '0.65rem' }} />
            ) : (
              <Chip label='Unassigned' color='warning' size='small' variant='outlined' sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Created</Typography>
            <Typography variant='caption'>{fmt(match.created_at)}</Typography>
          </Box>
        </Box>
      </CardContent>
      {canAssign && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1.25 }}>
            <Button size='small' variant='contained' fullWidth startIcon={<PersonAdd />} onClick={() => onAssign(match)}>
              Assign Volunteer
            </Button>
          </Box>
        </>
      )}
    </Card>
  );
};

const AdminMatchesPage = () => {
  const [matches, setMatches] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('all');
  const [assignTarget, setAssignTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [mr, vr] = await Promise.all([
        api.get('/admin/matches/'),
        api.get('/admin/volunteers/'),
      ]);
      setMatches(mr.data.results || []);
      setVolunteers(vr.data.results || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (matchId, volunteerId) => {
    await api.post(`/admin/matches/${matchId}/assign-volunteer/`, { volunteer_id: volunteerId });
    setSuccess('Volunteer assigned successfully!');
    load();
  };

  const filtered = tab === 'all' ? matches : matches.filter(m => m.status === tab);
  const counts = matches.reduce((a, m) => { a[m.status] = (a[m.status] || 0) + 1; return a; }, {});
  const unassigned = matches.filter(m => m.status === 'matched' && !m.volunteer_assigned).length;

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      <Box display='flex' justifyContent='space-between' alignItems='flex-start' flexWrap='wrap' gap={2} mb={3}>
        <Box display='flex' alignItems='center' gap={1.5}>
          <Avatar sx={{ bgcolor: '#eff6ff', color: 'info.main', width: 44, height: 44 }}><Handshake /></Avatar>
          <Box>
            <Box display='flex' alignItems='center' gap={1}>
              <Typography variant='h5' fontWeight={800}>Matches</Typography>
              {unassigned > 0 && <Chip label={`${unassigned} need volunteer`} color='warning' size='small' />}
            </Box>
            <Typography variant='body2' color='text.secondary'>Manage food delivery assignments</Typography>
          </Box>
        </Box>
        <Tooltip title='Refresh'><IconButton size='small' onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity='success' sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' scrollButtons='auto'>
          <Tab label={`All (${matches.length})`} value='all' />
          <Tab label={`Matched (${counts.matched || 0})`} value='matched' />
          <Tab label={`In Progress (${counts.in_progress || 0})`} value='in_progress' />
          <Tab label={`Completed (${counts.completed || 0})`} value='completed' />
        </Tabs>
      </Box>

      {loading ? (
        <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign='center' py={8}>
          <Handshake sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant='h6' color='text.secondary'>No {tab === 'all' ? '' : tab} matches</Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {filtered.map(m => (
            <Grid item xs={12} sm={6} lg={4} key={m.id}>
              <MatchCard match={m} onAssign={setAssignTarget} />
            </Grid>
          ))}
        </Grid>
      )}

      <AssignDialog
        open={!!assignTarget}
        match={assignTarget}
        volunteers={volunteers}
        onClose={() => setAssignTarget(null)}
        onAssign={handleAssign}
      />
    </Container>
  );
};

export default AdminMatchesPage;
