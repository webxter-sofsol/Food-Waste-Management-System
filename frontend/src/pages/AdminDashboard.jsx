import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip,
  CircularProgress, Container, Divider, Grid, IconButton,
  LinearProgress, Paper, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, Tooltip, Typography,
  useMediaQuery, useTheme, Snackbar,
} from '@mui/material';
import {
  People, Restaurant, Handshake, CheckCircle, Warning,
  TrendingUp, HourglassEmpty, Refresh, OpenInNew, Schedule,
  LocationOn, CardMembership as CertificateIcon, Send as SendIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import UserVerificationList from '../components/admin/UserVerificationList';
import adminService from '../services/adminService';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (s) => {
  if (!s) return 'N/A';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleString() : '—';

const STATUS_COLOR = {
  available: 'success', reserved: 'warning', completed: 'info',
  expired: 'default', cancelled: 'error',
};

const FRESHNESS_COLOR = (s) => s >= 60 ? 'success' : s >= 30 ? 'warning' : 'error';

// ── Metric card ───────────────────────────────────────────────────────────────
const MetricCard = ({ title, value, icon: Icon, color = 'primary.main', subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
      <Box display='flex' alignItems='center' justifyContent='space-between' gap={1}>
        <Box minWidth={0}>
          <Typography variant='body2' color='text.secondary' gutterBottom noWrap>{title}</Typography>
          <Typography variant='h4' fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{value ?? '—'}</Typography>
          {subtitle && <Typography variant='caption' color='text.secondary'>{subtitle}</Typography>}
        </Box>
        <Box sx={{ bgcolor: color, borderRadius: '50%', width: { xs: 44, sm: 52 }, height: { xs: 44, sm: 52 }, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.9 }}>
          <Icon sx={{ fontSize: { xs: 22, sm: 26 }, color: 'white' }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ── Food listings panel ───────────────────────────────────────────────────────
const FoodListingsPanel = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const res = await adminService.getAdminReports({ type: 'listings', page_size: 50 });
    if (res.success) setListings(res.data.data || []);
    else setError(res.error || 'Failed to load listings.');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const TABS = [
    { value: 'all',       label: 'All' },
    { value: 'available', label: 'Available' },
    { value: 'reserved',  label: 'Reserved' },
    { value: 'expired',   label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const filtered = tab === 'all' ? listings : listings.filter(l => l.status === tab);
  const counts = listings.reduce((a, l) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Box display='flex' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={1} mb={2}>
        <Box display='flex' alignItems='center' gap={1}>
          <Restaurant color='primary' />
          <Typography variant='h6' fontWeight={700}>Food Listings</Typography>
          <Chip label={listings.length} size='small' color='primary' variant='outlined' />
        </Box>
        <Box display='flex' gap={1}>
          <Tooltip title='Refresh'><IconButton size='small' onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
          <Button size='small' variant='outlined' endIcon={<OpenInNew />} onClick={() => navigate('/admin/reports')}>
            Full Report
          </Button>
        </Box>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' scrollButtons='auto'>
          {TABS.map(t => (
            <Tab key={t.value} label={`${t.label}${t.value !== 'all' ? ` (${counts[t.value] || 0})` : ` (${listings.length})`}`} value={t.value} sx={{ fontSize: '0.8rem', minWidth: 'auto', px: 1.5 }} />
          ))}
        </Tabs>
      </Box>

      {loading ? (
        <Box display='flex' justifyContent='center' py={4}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign='center' py={4}>
          <Restaurant sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant='body2' color='text.secondary'>No {tab === 'all' ? '' : tab} listings found</Typography>
        </Box>
      ) : isMobile ? (
        // Mobile: cards
        <Box display='flex' flexDirection='column' gap={1.5}>
          {filtered.map((l, i) => (
            <Card key={i} variant='outlined' sx={{ border: '1px solid #f1f5f9' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display='flex' justifyContent='space-between' alignItems='flex-start' gap={1} mb={1}>
                  <Typography variant='subtitle2' fontWeight={700} noWrap>{l.food_type}</Typography>
                  <Chip label={l.status} color={STATUS_COLOR[l.status] || 'default'} size='small' sx={{ flexShrink: 0 }} />
                </Box>
                <Box display='flex' flexDirection='column' gap={0.5}>
                  <Box display='flex' justifyContent='space-between'>
                    <Typography variant='caption' color='text.secondary'>Quantity</Typography>
                    <Typography variant='caption' fontWeight={600}>{l.quantity} {l.unit}</Typography>
                  </Box>
                  <Box display='flex' justifyContent='space-between'>
                    <Typography variant='caption' color='text.secondary'>Freshness</Typography>
                    <Typography variant='caption' fontWeight={600} color={FRESHNESS_COLOR(l.freshness_score) + '.main'}>{Math.round(l.freshness_score || 0)}/100</Typography>
                  </Box>
                  <Box display='flex' justifyContent='space-between'>
                    <Typography variant='caption' color='text.secondary'>Created</Typography>
                    <Typography variant='caption'>{fmtDate(l.created_at)}</Typography>
                  </Box>
                  {l.pickup_address && (
                    <Typography variant='caption' color='text.secondary' noWrap>📍 {l.pickup_address}</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        // Desktop: table
        <TableContainer sx={{ borderRadius: 2, border: '1px solid #f1f5f9' }}>
          <Table size='small' stickyHeader>
            <TableHead>
              <TableRow>
                {['Food Type', 'Donor', 'Qty', 'Status', 'Freshness', 'Pickup Address', 'Created'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((l, i) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600} noWrap sx={{ maxWidth: 180 }}>{l.food_type}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' noWrap sx={{ maxWidth: 160 }}>{l['donor__email'] || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' noWrap>{l.quantity} {l.unit}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={l.status} color={STATUS_COLOR[l.status] || 'default'} size='small' />
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <Box display='flex' alignItems='center' gap={1}>
                      <LinearProgress variant='determinate' value={l.freshness_score || 0} color={FRESHNESS_COLOR(l.freshness_score || 0)} sx={{ height: 6, borderRadius: 99, width: 60, flexShrink: 0 }} />
                      <Typography variant='caption' fontWeight={600}>{Math.round(l.freshness_score || 0)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' noWrap sx={{ maxWidth: 200 }} title={l.pickup_address}>{l.pickup_address || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' noWrap>{fmtDate(l.created_at)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

// ── Matches & Certificate Panel ───────────────────────────────────────────────
const MatchCertificatesPanel = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [issuing, setIssuing] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const res = await adminService.getAdminReports({ type: 'matches', page_size: 100 });
    if (res.success) setMatches(res.data.data || []);
    else setError(res.error || 'Failed to load matches.');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleIssueCertificate = async (matchId, donorEmail) => {
    setIssuing(matchId);
    const res = await adminService.issueCertificate(matchId);
    if (res.success) {
      setSnackbar({ open: true, message: `Receipt sent to ${donorEmail}`, severity: 'success' });
      load();
    } else {
      setSnackbar({ open: true, message: res.error, severity: 'error' });
    }
    setIssuing(null);
  };

  const MATCH_STATUS_COLOR = {
    matched: 'warning', in_progress: 'info', completed: 'success', cancelled: 'error',
  };

  const TABS = [
    { value: 'all', label: 'All' },
    { value: 'matched', label: 'Matched' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const filtered = tab === 'all' ? matches : matches.filter((m) => m.status === tab);
  const counts = matches.reduce((a, m) => { a[m.status] = (a[m.status] || 0) + 1; return a; }, {});

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <CertificateIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Matches & Receipts</Typography>
          <Chip label={matches.length} size="small" color="primary" variant="outlined" />
        </Box>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={load} disabled={loading}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map((t) => (
            <Tab
              key={t.value}
              label={`${t.label} (${t.value === 'all' ? matches.length : counts[t.value] || 0})`}
              value={t.value}
              sx={{ fontSize: '0.8rem', minWidth: 'auto', px: 1.5 }}
            />
          ))}
        </Tabs>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Handshake sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">No {tab === 'all' ? '' : tab} matches found</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ borderRadius: 2, border: '1px solid #f1f5f9' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['ID', 'Food', 'Donor', 'Receiver', 'Qty', 'Status', 'Date', 'Certificate'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((m, i) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">#{m.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>
                      {m['listing__food_type'] || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{m['donor__email'] || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{m['receiver__email'] || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{m.matched_quantity}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={m.status} color={MATCH_STATUS_COLOR[m.status] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>{fmtDate(m.created_at)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant={m.status === 'completed' ? 'outlined' : 'contained'}
                      color="success"
                      startIcon={issuing === m.id ? <CircularProgress size={14} /> : <SendIcon />}
                      onClick={() => handleIssueCertificate(m.id, m['donor__email'])}
                      disabled={issuing === m.id || m.status === 'cancelled'}
                      sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                    >
                      {m.status === 'completed' ? 'Re-send Receipt' : 'Issue Receipt'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

// ── Main dashboard ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    setIsLoading(true); setError(null);
    const result = await adminService.getAdminMetrics();
    if (result.success) setMetrics(result.data);
    else setError(result.error);
    setIsLoading(false);
  };

  useEffect(() => { fetchMetrics(); }, []);

  const uc = metrics?.user_counts ?? {};
  const fl = metrics?.food_listings ?? {};
  const ma = metrics?.matches ?? {};
  const rt = metrics?.average_response_times ?? {};

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      <Box display='flex' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={2} mb={3}>
        <Typography variant='h4' component='h1' fontWeight={800} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Admin Dashboard
        </Typography>
        <Tooltip title='Refresh metrics'>
          <IconButton size='small' onClick={fetchMetrics} disabled={isLoading}>
            {isLoading ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {metrics?.system_alerts?.expiring_soon_listings > 0 && (
        <Alert severity='warning' icon={<Warning />} sx={{ mb: 3 }}>
          <strong>{metrics.system_alerts.expiring_soon_listings}</strong> food listing(s) expiring within 2 hours
        </Alert>
      )}
      {metrics?.pending_verifications > 0 && (
        <Alert severity='info' icon={<HourglassEmpty />} sx={{ mb: 3 }}>
          <strong>{metrics.pending_verifications}</strong> user(s) awaiting verification
        </Alert>
      )}

      {isLoading && !metrics ? (
        <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
      ) : metrics?.user_counts ? (
        <>
          {/* KPI row */}
          <Grid container spacing={{ xs: 1.5, sm: 2 }} mb={3}>
            {[
              { title: 'Total Users',          value: uc.total,                  icon: People,        color: 'primary.main' },
              { title: 'Active Listings',       value: fl.active,                 icon: Restaurant,    color: 'success.main', subtitle: `${fl.total} total` },
              { title: 'Total Matches',         value: ma.total,                  icon: Handshake,     color: 'secondary.main' },
              { title: 'Completed Deliveries',  value: ma.completed_deliveries,   icon: CheckCircle,   color: 'info.main' },
              { title: 'Pending Verifications', value: metrics.pending_verifications, icon: HourglassEmpty, color: 'warning.main' },
            ].map(m => (
              <Grid item xs={6} sm={4} md={2.4} key={m.title}>
                <MetricCard {...m} />
              </Grid>
            ))}
          </Grid>

          {/* User breakdown */}
          <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
            <Typography variant='h6' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <People color='primary' /> User Statistics
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {[
                { title: 'Donors',     value: uc.donor,     icon: Restaurant,    color: 'info.main' },
                { title: 'Receivers',  value: uc.receiver,  icon: People,        color: 'secondary.main' },
                { title: 'Volunteers', value: uc.volunteer, icon: Handshake,     color: 'success.main' },
                { title: 'Admins',     value: uc.admin,     icon: CheckCircle,   color: 'error.main' },
              ].map(m => (
                <Grid item xs={6} sm={3} key={m.title}>
                  <MetricCard {...m} />
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Response times */}
          <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
            <Typography variant='h6' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Schedule color='primary' /> Average Response Times
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {[
                { label: 'Volunteer Assignment', value: fmtTime(rt.volunteer_assignment_seconds) },
                { label: 'Delivery Completion',  value: fmtTime(rt.delivery_completion_seconds) },
              ].map(({ label, value }) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'background.default', borderRadius: 2 }}>
                    <Typography variant='body2' color='text.secondary'>{label}</Typography>
                    <Typography variant='h5' fontWeight={700} sx={{ mt: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </>
      ) : null}

      {/* Food listings panel */}
      <Box mb={3}>
        <FoodListingsPanel />
      </Box>

      {/* Matches & Certificates panel */}
      <Box mb={3}>
        <MatchCertificatesPanel />
      </Box>

      <Divider sx={{ my: { xs: 2, sm: 3 } }} />

      {/* User verifications */}
      <UserVerificationList />
    </Container>
  );
};

export default AdminDashboard;

