/**
 * DonorListingsPage — /donor/listings
 * Shows all of the donor's food listings with status, expiry, and management actions.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Card, CardActions, CardContent,
  Chip, CircularProgress, Collapse, Container, Divider,
  Grid, IconButton, LinearProgress, Tooltip, Typography,
} from '@mui/material';
import {
  Add, Cancel, Edit, ExpandLess, ExpandMore,
  Refresh, Restaurant, Schedule, Assignment, Visibility, CheckCircle,
} from '@mui/icons-material';
import donorService from '../services/donorService';
import { formatTimeRemaining } from '../utils/helpers';
import CancelListingDialog from '../components/donor/CancelListingDialog';
import ListingRequestsPanel from '../components/donor/ListingRequestsPanel';

// ── helpers ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  available:  { label: 'Available',  color: 'success' },
  pending:    { label: 'Pending Approval', color: 'warning' },
  reserved:   { label: 'Reserved',   color: 'warning' },
  completed:  { label: 'Completed',  color: 'info' },
  expired:    { label: 'Expired',    color: 'default' },
  cancelled:  { label: 'Cancelled',  color: 'error' },
};

const urgencyOf = (expiryTime) => {
  const ms = new Date(expiryTime) - new Date();
  if (ms <= 0) return 'expired';
  const h = ms / 3_600_000;
  return h < 2 ? 'urgent' : h < 24 ? 'warning' : 'normal';
};

const URGENCY_COLOR = { normal: 'text.secondary', warning: 'warning.main', urgent: 'error.main', expired: 'text.disabled' };

// ── Expiry countdown ──────────────────────────────────────────────────────────
const Countdown = ({ expiryTime }) => {
  const [text, setText] = useState('');
  const [urgency, setUrgency] = useState('normal');
  useEffect(() => {
    const tick = () => { setText(formatTimeRemaining(expiryTime)); setUrgency(urgencyOf(expiryTime)); };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [expiryTime]);
  return (
    <Box display="flex" alignItems="center" gap={0.5} sx={urgency === 'urgent' ? { animation: 'pulse 1.5s infinite' } : {}}>
      <Schedule sx={{ fontSize: 14, color: URGENCY_COLOR[urgency] }} />
      <Typography variant="caption" sx={{ color: URGENCY_COLOR[urgency], fontWeight: urgency !== 'normal' ? 700 : 400 }}>{text}</Typography>
    </Box>
  );
};

// ── Listing card ──────────────────────────────────────────────────────────────
const ListingCard = ({ listing, requests, onEdit, onCancel, onRequestUpdated }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[listing.status] ?? { label: listing.status, color: 'default' };
  const pending = requests.filter(r => r.status === 'pending');
  const hasMatch = listing.status === 'reserved' || listing.status === 'completed';
  const canEdit = !hasMatch && listing.status !== 'cancelled' && listing.status !== 'expired';
  const canCancel = listing.status !== 'cancelled' && listing.status !== 'completed' && listing.status !== 'expired';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 0, wordBreak: 'break-word' }}>
            {listing.food_type}
          </Typography>
          <Chip label={cfg.label} color={cfg.color} size="small" sx={{ flexShrink: 0 }} />
        </Box>

        {listing.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {listing.description}
          </Typography>
        )}

        {/* Meta */}
        <Box display="flex" flexDirection="column" gap={0.5} mb={1}>
          <Box display="flex" alignItems="center" gap={0.75}>
            <Restaurant sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {listing.available_quantity} / {listing.quantity} {listing.unit} available
            </Typography>
          </Box>
          <Countdown expiryTime={listing.expiry_time} />
        </Box>

        {/* Freshness bar */}
        {listing.freshness_score != null && (
          <Box mb={1}>
            <Box display="flex" justifyContent="space-between" mb={0.25}>
              <Typography variant="caption" color="text.secondary">Freshness</Typography>
              <Typography variant="caption" fontWeight={700}>{Math.round(listing.freshness_score)}/100</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={listing.freshness_score}
              color={listing.freshness_score >= 60 ? 'success' : listing.freshness_score >= 30 ? 'warning' : 'error'}
              sx={{ height: 5, borderRadius: 99 }}
            />
          </Box>
        )}

        {/* Stats row */}
        <Box display="flex" gap={2} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={0.5}>
            <Assignment sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{requests.length} requests</Typography>
          </Box>
          {pending.length > 0 && (
            <Chip label={`${pending.length} pending`} color="warning" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          )}
        </Box>

        {/* Pending requests expand */}
        {pending.length > 0 && (
          <Box mt={1}>
            <Button size="small" endIcon={expanded ? <ExpandLess /> : <ExpandMore />} onClick={() => setExpanded(v => !v)} sx={{ p: 0, fontSize: '0.75rem' }}>
              {expanded ? 'Hide requests' : 'View requests'}
            </Button>
            <Collapse in={expanded}>
              <Box mt={1} p={1.5} bgcolor="#f8fafc" borderRadius={2}>
                <ListingRequestsPanel requests={requests} onRequestUpdated={onRequestUpdated} />
              </Box>
            </Collapse>
          </Box>
        )}
      </CardContent>

      <Divider />
      <CardActions sx={{ px: 2, py: 1, gap: 1 }}>
        <Tooltip title={hasMatch ? 'Cannot edit after a match is created' : 'Edit listing'}>
          <span>
            <Button size="small" startIcon={<Edit />} onClick={() => onEdit(listing)} disabled={!canEdit}>Edit</Button>
          </span>
        </Tooltip>
        <Button size="small" color="error" startIcon={<Cancel />} onClick={() => onCancel(listing)} disabled={!canCancel}>Cancel</Button>
      </CardActions>
    </Card>
  );
};

// ── Summary bar ───────────────────────────────────────────────────────────────
const SummaryBar = ({ listings }) => {
  const counts = listings.reduce((a, l) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});
  return (
    <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
      {[
        { label: 'Active',    value: counts.available || 0, color: 'success.main' },
        { label: 'Reserved',  value: counts.reserved  || 0, color: 'warning.main' },
        { label: 'Completed', value: counts.completed || 0, color: 'info.main' },
        { label: 'Total',     value: listings.length,       color: 'text.primary' },
      ].map(s => (
        <Box key={s.label} textAlign="center" minWidth={52}>
          <Typography variant="h5" fontWeight={800} sx={{ color: s.color, lineHeight: 1 }}>{s.value}</Typography>
          <Typography variant="caption" color="text.secondary">{s.label}</Typography>
        </Box>
      ))}
    </Box>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const DonorListingsPage = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [lr, rr] = await Promise.all([donorService.getDonorListings(), donorService.getAllDonorRequests()]);
    if (lr.success) setListings(lr.data); else setError(lr.error);
    if (rr.success) setRequests(rr.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const requestsFor = id => requests.filter(r => r.listing === id || r.listing?.id === id);

  const handleCancelConfirm = async (reason) => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    const res = await donorService.cancelListing(cancelTarget.id, reason);
    setCancelLoading(false);
    setCancelTarget(null);
    if (res.success) load(); else setError(res.error);
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      {/* Page header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar sx={{ bgcolor: '#f0fdf4', color: 'primary.main', width: 44, height: 44 }}>
            <Restaurant />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>My Listings</Typography>
            <Typography variant="body2" color="text.secondary">Manage your food listings</Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh"><IconButton size="small" onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/donor/create-listing')}>New Listing</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : listings.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Restaurant sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>No listings yet</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>Create your first listing to start sharing food.</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/donor/create-listing')}>Create Listing</Button>
        </Box>
      ) : (
        <>
          <SummaryBar listings={listings} />
          <Grid container spacing={{ xs: 2, sm: 2.5 }}>
            {listings.map(l => (
              <Grid item xs={12} sm={6} lg={4} key={l.id}>
                <ListingCard
                  listing={l}
                  requests={requestsFor(l.id)}
                  onEdit={l => navigate(`/donor/edit-listing/${l.id}`)}
                  onCancel={setCancelTarget}
                  onRequestUpdated={load}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <CancelListingDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        listingName={cancelTarget?.food_type}
        loading={cancelLoading}
      />

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </Container>
  );
};

export default DonorListingsPage;
