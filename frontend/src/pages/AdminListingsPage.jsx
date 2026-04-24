import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, IconButton, LinearProgress, Paper, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { OpenInNew, Refresh, Restaurant } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import adminService from '../services/adminService';

const STATUS_COLOR = {
  available: 'success', reserved: 'warning', completed: 'info',
  expired: 'default', cancelled: 'error',
};
const FRESHNESS_COLOR = (s) => s >= 60 ? 'success' : s >= 30 ? 'warning' : 'error';
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString() : '—';

const TABS = [
  { value: 'all',       label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'reserved',  label: 'Reserved' },
  { value: 'expired',   label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const AdminListingsPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const res = await adminService.getAdminReports({ type: 'listings', page_size: 100 });
    if (res.success) setListings(res.data.data || []);
    else setError(res.error || 'Failed to load listings.');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === 'all' ? listings : listings.filter(l => l.status === tab);
  const counts = listings.reduce((a, l) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display='flex' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={2} mb={3}>
        <Box display='flex' alignItems='center' gap={1.5}>
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Restaurant color='primary' />
          </Box>
          <Box>
            <Typography variant='h5' fontWeight={800}>Food Listings</Typography>
            <Typography variant='body2' color='text.secondary'>All listings across all donors</Typography>
          </Box>
        </Box>
        <Box display='flex' gap={1}>
          <Tooltip title='Refresh'><IconButton size='small' onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
          <Button size='small' variant='outlined' endIcon={<OpenInNew />} onClick={() => navigate('/admin/reports')}>
            Full Report
          </Button>
        </Box>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary chips */}
      <Box display='flex' gap={1.5} flexWrap='wrap' mb={3}>
        {[
          { label: 'Total', value: listings.length, color: 'default' },
          { label: 'Available', value: counts.available || 0, color: 'success' },
          { label: 'Reserved', value: counts.reserved || 0, color: 'warning' },
          { label: 'Expired', value: counts.expired || 0, color: 'error' },
          { label: 'Cancelled', value: counts.cancelled || 0, color: 'default' },
        ].map(s => (
          <Box key={s.label} sx={{ textAlign: 'center', px: 2, py: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid #f1f5f9', minWidth: 80 }}>
            <Typography variant='h5' fontWeight={800} color={s.color === 'default' ? 'text.primary' : s.color + '.main'}>{s.value}</Typography>
            <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' scrollButtons='auto'>
            {TABS.map(t => (
              <Tab key={t.value}
                label={t.value === 'all' ? `All (${listings.length})` : `${t.label} (${counts[t.value] || 0})`}
                value={t.value}
                sx={{ fontSize: '0.8rem', minWidth: 'auto', px: 1.5 }}
              />
            ))}
          </Tabs>
        </Box>

        {loading ? (
          <Box display='flex' justifyContent='center' py={6}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box textAlign='center' py={6}>
            <Restaurant sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant='body1' color='text.secondary'>No {tab === 'all' ? '' : tab} listings found</Typography>
          </Box>
        ) : isMobile ? (
          <Box p={2} display='flex' flexDirection='column' gap={1.5}>
            {filtered.map((l, i) => (
              <Card key={i} variant='outlined'>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box display='flex' justifyContent='space-between' alignItems='flex-start' gap={1} mb={1}>
                    <Typography variant='subtitle2' fontWeight={700} noWrap>{l.food_type}</Typography>
                    <Chip label={l.status} color={STATUS_COLOR[l.status] || 'default'} size='small' sx={{ flexShrink: 0 }} />
                  </Box>
                  <Typography variant='caption' color='text.secondary' display='block' mb={0.5}>{l['donor__email'] || '—'}</Typography>
                  <Box display='flex' gap={2} flexWrap='wrap'>
                    <Typography variant='caption'>{l.quantity} {l.unit}</Typography>
                    <Typography variant='caption' color='text.secondary'>{fmtDate(l.created_at)}</Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <TableContainer>
            <Table size='small' stickyHeader>
              <TableHead>
                <TableRow>
                  {['#', 'Food Type', 'Donor', 'Qty', 'Status', 'Freshness', 'Pickup Address', 'Created'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((l, i) => (
                  <TableRow key={i} hover>
                    <TableCell><Typography variant='caption' color='text.secondary'>{l.id}</Typography></TableCell>
                    <TableCell><Typography variant='body2' fontWeight={600} noWrap sx={{ maxWidth: 180 }}>{l.food_type}</Typography></TableCell>
                    <TableCell><Typography variant='body2' noWrap sx={{ maxWidth: 160 }}>{l['donor__email'] || '—'}</Typography></TableCell>
                    <TableCell><Typography variant='body2' noWrap>{l.quantity} {l.unit}</Typography></TableCell>
                    <TableCell><Chip label={l.status} color={STATUS_COLOR[l.status] || 'default'} size='small' /></TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Box display='flex' alignItems='center' gap={1}>
                        <LinearProgress variant='determinate' value={l.freshness_score || 0} color={FRESHNESS_COLOR(l.freshness_score || 0)} sx={{ height: 6, borderRadius: 99, width: 60, flexShrink: 0 }} />
                        <Typography variant='caption' fontWeight={600}>{Math.round(l.freshness_score || 0)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant='body2' noWrap sx={{ maxWidth: 200 }} title={l.pickup_address}>{l.pickup_address || '—'}</Typography></TableCell>
                    <TableCell><Typography variant='body2' noWrap>{fmtDate(l.created_at)}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default AdminListingsPage;
