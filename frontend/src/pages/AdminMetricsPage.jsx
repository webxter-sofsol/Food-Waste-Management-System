import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Assessment,
  CheckCircle,
  Handshake,
  HourglassEmpty,
  People,
  Refresh,
  Restaurant,
  Schedule,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import adminService from '../services/adminService';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (seconds) => {
  if (!seconds) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ── sub-components ────────────────────────────────────────────────────────────

const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'primary.main', trend }) => (
  <Card elevation={2} sx={{ height: '100%' }}>
    <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
        <Box minWidth={0}>
          <Typography variant="body2" color="text.secondary" noWrap gutterBottom>
            {title}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }, lineHeight: 1.2 }}
          >
            {value ?? '—'}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend != null && (
            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
              <TrendingUp fontSize="small" color={trend >= 0 ? 'success' : 'error'} sx={{ fontSize: '0.9rem' }} />
              <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'}>
                {trend >= 0 ? '+' : ''}{trend}%
              </Typography>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: color,
            borderRadius: '50%',
            width: { xs: 44, sm: 52 },
            height: { xs: 44, sm: 52 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: 0.9,
          }}
        >
          <Icon sx={{ fontSize: { xs: 22, sm: 26 }, color: 'white' }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const SectionHeader = ({ icon: Icon, title }) => (
  <Box display="flex" alignItems="center" gap={1} mb={2}>
    <Icon color="primary" />
    <Typography variant="h6" fontWeight={600}>
      {title}
    </Typography>
  </Box>
);

const RoleBar = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Box mb={1.5}>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">{value} ({pct}%)</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
};

// ── main page ─────────────────────────────────────────────────────────────────

const AdminMetricsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await adminService.getAdminMetrics();
    if (result.success) {
      setMetrics(result.data);
      setLastRefreshed(new Date());
    } else {
      setError(result.error || 'Failed to load metrics.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const uc = metrics?.user_counts ?? {};
  const fl = metrics?.food_listings ?? {};
  const ma = metrics?.matches ?? {};
  const rt = metrics?.average_response_times ?? {};

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Assessment color="primary" sx={{ fontSize: { xs: 28, sm: 32 } }} />
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
              System Metrics
            </Typography>
            {lastRefreshed && (
              <Typography variant="caption" color="text.secondary">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        </Box>
        <Tooltip title="Refresh metrics">
          <span>
            <IconButton onClick={fetchMetrics} disabled={loading} size="small">
              {loading ? <CircularProgress size={20} /> : <Refresh />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {loading && !metrics && (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      )}

      {metrics && (
        <>
          {/* System alerts */}
          {metrics.system_alerts?.expiring_soon_listings > 0 && (
            <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
              <strong>{metrics.system_alerts.expiring_soon_listings}</strong> food listing(s) expiring within 2 hours
            </Alert>
          )}
          {metrics.pending_verifications > 0 && (
            <Alert severity="info" icon={<HourglassEmpty />} sx={{ mb: 3 }}>
              <strong>{metrics.pending_verifications}</strong> user(s) awaiting verification
            </Alert>
          )}

          {/* Top-level KPIs */}
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }} mb={3}>
            {[
              { title: 'Total Users', value: uc.total, icon: People, color: 'primary.main' },
              { title: 'Active Listings', value: fl.active, subtitle: `${fl.total} total`, icon: Restaurant, color: 'success.main' },
              { title: 'Total Matches', value: ma.total, icon: Handshake, color: 'secondary.main' },
              { title: 'Completed Deliveries', value: ma.completed_deliveries, icon: CheckCircle, color: 'info.main' },
            ].map((m) => (
              <Grid item xs={6} sm={6} md={3} key={m.title}>
                <MetricCard {...m} />
              </Grid>
            ))}
          </Grid>

          {/* User breakdown */}
          <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
            <SectionHeader icon={People} title="User Breakdown" />
            <Grid container spacing={{ xs: 1.5, sm: 2 }} mb={2}>
              {[
                { title: 'Donors', value: uc.donor, icon: Restaurant, color: 'info.main' },
                { title: 'Receivers', value: uc.receiver, icon: People, color: 'secondary.main' },
                { title: 'Volunteers', value: uc.volunteer, icon: Handshake, color: 'success.main' },
                { title: 'Admins', value: uc.admin, icon: CheckCircle, color: 'error.main' },
              ].map((m) => (
                <Grid item xs={6} sm={3} key={m.title}>
                  <MetricCard {...m} />
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>Distribution</Typography>
            {[
              { label: 'Donors', value: uc.donor, color: 'info' },
              { label: 'Receivers', value: uc.receiver, color: 'secondary' },
              { label: 'Volunteers', value: uc.volunteer, color: 'success' },
              { label: 'Admins', value: uc.admin, color: 'error' },
            ].map((r) => (
              <RoleBar key={r.label} {...r} total={uc.total || 1} />
            ))}
          </Paper>

          {/* Food listings & matches */}
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }} mb={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, height: '100%' }}>
                <SectionHeader icon={Restaurant} title="Food Listings" />
                <Grid container spacing={1.5}>
                  {[
                    { title: 'Total Listings', value: fl.total, icon: Restaurant, color: 'primary.main' },
                    { title: 'Active Now', value: fl.active, icon: CheckCircle, color: 'success.main' },
                  ].map((m) => (
                    <Grid item xs={6} key={m.title}>
                      <MetricCard {...m} />
                    </Grid>
                  ))}
                </Grid>
                {fl.total > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">Active</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {fl.active} / {fl.total} ({Math.round((fl.active / fl.total) * 100)}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.round((fl.active / fl.total) * 100)}
                        color="success"
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, height: '100%' }}>
                <SectionHeader icon={Handshake} title="Matches & Deliveries" />
                <Grid container spacing={1.5}>
                  {[
                    { title: 'Total Matches', value: ma.total, icon: Handshake, color: 'secondary.main' },
                    { title: 'Completed', value: ma.completed_deliveries, icon: CheckCircle, color: 'success.main' },
                  ].map((m) => (
                    <Grid item xs={6} key={m.title}>
                      <MetricCard {...m} />
                    </Grid>
                  ))}
                </Grid>
                {ma.total > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">Completion Rate</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {ma.completed_deliveries} / {ma.total} ({Math.round((ma.completed_deliveries / ma.total) * 100)}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.round((ma.completed_deliveries / ma.total) * 100)}
                        color="success"
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Response times */}
          <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, mb: 3 }}>
            <SectionHeader icon={Schedule} title="Average Response Times" />
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {[
                {
                  label: 'Volunteer Assignment',
                  value: fmtTime(rt.volunteer_assignment_seconds),
                  desc: 'Time from match creation to volunteer assignment',
                },
                {
                  label: 'Delivery Completion',
                  value: fmtTime(rt.delivery_completion_seconds),
                  desc: 'Time from match creation to delivery completion',
                },
              ].map(({ label, value, desc }) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'background.default', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                      {value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{desc}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Pending verifications */}
          <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <SectionHeader icon={HourglassEmpty} title="Pending Actions" />
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Pending Verifications"
                  value={metrics.pending_verifications}
                  icon={HourglassEmpty}
                  color="warning.main"
                  subtitle="Users awaiting admin approval"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Expiring Soon"
                  value={metrics.system_alerts?.expiring_soon_listings ?? 0}
                  icon={Warning}
                  color="error.main"
                  subtitle="Listings expiring within 2 hours"
                />
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default AdminMetricsPage;
