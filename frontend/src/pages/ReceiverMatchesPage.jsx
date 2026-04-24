import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Card, CardContent, Chip, CircularProgress,
  Container, Divider, Grid, IconButton, LinearProgress,
  Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import { Handshake, LocationOn, Person, Refresh } from '@mui/icons-material';
import api from '../services/api';

const STATUS_CFG = {
  matched:     { label: 'Matched',     color: 'info' },
  in_progress: { label: 'In Progress', color: 'warning' },
  completed:   { label: 'Completed',   color: 'success' },
  cancelled:   { label: 'Cancelled',   color: 'error' },
};

const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—';

const MatchCard = ({ match }) => {
  const cfg = STATUS_CFG[match.status] ?? { label: match.status, color: 'default' };
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='flex-start' gap={1} mb={1.5}>
          <Box minWidth={0}>
            <Typography variant='subtitle2' fontWeight={700} noWrap>
              {match.listing_food_type || 'Food Match'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>Match #{match.id}</Typography>
          </Box>
          <Chip label={cfg.label} color={cfg.color} size='small' sx={{ flexShrink: 0 }} />
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Box display='flex' flexDirection='column' gap={0.75}>
          <Box display='flex' alignItems='center' gap={0.75}>
            <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant='caption' color='text.secondary'>Donor:</Typography>
            <Typography variant='caption' fontWeight={600}>{match.donor_name || '—'}</Typography>
          </Box>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Quantity</Typography>
            <Typography variant='caption' fontWeight={600}>{match.matched_quantity} servings</Typography>
          </Box>
          {match.listing_pickup_address && (
            <Box display='flex' alignItems='flex-start' gap={0.75}>
              <LocationOn sx={{ fontSize: 14, color: 'text.secondary', mt: 0.1 }} />
              <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.4 }}>
                {match.listing_pickup_address}
              </Typography>
            </Box>
          )}
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Created</Typography>
            <Typography variant='caption' fontWeight={600}>{fmt(match.created_at)}</Typography>
          </Box>
          {match.completed_at && (
            <Box display='flex' justifyContent='space-between'>
              <Typography variant='caption' color='text.secondary'>Completed</Typography>
              <Typography variant='caption' fontWeight={600} color='success.main'>{fmt(match.completed_at)}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const ReceiverMatchesPage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/matches/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setMatches(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load matches.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === 'all' ? matches : matches.filter(m => m.status === tab);
  const counts = matches.reduce((a, m) => { a[m.status] = (a[m.status] || 0) + 1; return a; }, {});

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      <Box display='flex' justifyContent='space-between' alignItems='flex-start' flexWrap='wrap' gap={2} mb={3}>
        <Box display='flex' alignItems='center' gap={1.5}>
          <Avatar sx={{ bgcolor: '#eff6ff', color: 'info.main', width: 44, height: 44 }}>
            <Handshake />
          </Avatar>
          <Box>
            <Typography variant='h5' fontWeight={800}>My Matches</Typography>
            <Typography variant='body2' color='text.secondary'>Approved food matches for you</Typography>
          </Box>
        </Box>
        <Tooltip title='Refresh'><IconButton size='small' onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

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
          <Typography variant='h6' color='text.secondary'>No {tab === 'all' ? '' : tab} matches yet</Typography>
          <Typography variant='body2' color='text.secondary' mt={1}>
            Matches appear here once a donor approves your food request.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {filtered.map(m => (
            <Grid item xs={12} sm={6} lg={4} key={m.id}>
              <MatchCard match={m} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default ReceiverMatchesPage;
