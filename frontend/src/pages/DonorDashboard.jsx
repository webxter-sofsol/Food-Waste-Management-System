import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Restaurant as RestaurantIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  CardMembership as CertificateIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { formatTimeRemaining } from '../utils/helpers';
import donorService from '../services/donorService';
import CancelListingDialog from '../components/donor/CancelListingDialog';
import ListingRequestsPanel from '../components/donor/ListingRequestsPanel';

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'success' },
  pending: { label: 'Pending Approval', color: 'warning' },
  reserved: { label: 'Reserved', color: 'warning' },
  completed: { label: 'Completed', color: 'info' },
  expired: { label: 'Expired', color: 'default' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || { label: status, color: 'default' };

/**
 * Returns urgency level based on hours remaining until expiry.
 * > 24h → normal, 2-24h → warning, < 2h → urgent, expired → expired
 */
const getExpiryUrgency = (expiryTime) => {
  const diffMs = new Date(expiryTime) - new Date();
  if (diffMs <= 0) return 'expired';
  const hours = diffMs / 3_600_000;
  if (hours < 2) return 'urgent';
  if (hours < 24) return 'warning';
  return 'normal';
};

const URGENCY_COLORS = {
  normal: 'text.secondary',
  warning: 'warning.main',
  urgent: 'error.main',
  expired: 'text.disabled',
};

// ─── Expiry Countdown ──────────────────────────────────────────────────────────

const ExpiryCountdown = ({ expiryTime }) => {
  const [display, setDisplay] = useState('');
  const [urgency, setUrgency] = useState('normal');

  useEffect(() => {
    const update = () => {
      setDisplay(formatTimeRemaining(expiryTime));
      setUrgency(getExpiryUrgency(expiryTime));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [expiryTime]);

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={0.5}
      sx={urgency === 'urgent' ? { animation: 'pulse 1.5s infinite' } : {}}
    >
      <ScheduleIcon sx={{ fontSize: 16, color: URGENCY_COLORS[urgency] }} />
      <Typography variant="body2" sx={{ color: URGENCY_COLORS[urgency], fontWeight: urgency !== 'normal' ? 600 : 400 }}>
        {display}
      </Typography>
    </Box>
  );
};

// ─── Metrics Row ───────────────────────────────────────────────────────────────

const MetricsRow = ({ metrics }) => (
  <Box display="flex" gap={2} flexWrap="wrap" mt={1}>
    <Box display="flex" alignItems="center" gap={0.5}>
      <VisibilityIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
      <Typography variant="caption" color="text.secondary">
        {metrics.views} views
      </Typography>
    </Box>
    <Box display="flex" alignItems="center" gap={0.5}>
      <AssignmentIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
      <Typography variant="caption" color="text.secondary">
        {metrics.requests} requests
      </Typography>
    </Box>
    <Box display="flex" alignItems="center" gap={0.5}>
      <CheckCircleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
      <Typography variant="caption" color="text.secondary">
        {metrics.matches} matches
      </Typography>
    </Box>
  </Box>
);

// ─── Listing Card ──────────────────────────────────────────────────────────────

const DonorListingCard = ({
  listing,
  requests,
  onEdit,
  onCancel,
  onRequestUpdated,
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = getStatusConfig(listing.status);
  const metrics = donorService.getListingMetrics(listing, requests, []);
  const pendingCount = metrics.pendingRequests;
  const hasMatch = listing.status === 'reserved' || listing.status === 'completed';

  return (
    <Card elevation={2} sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header row */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1} gap={1}>
          <Typography variant="h6" component="h3" sx={{ fontSize: '1rem', fontWeight: 600, minWidth: 0, wordBreak: 'break-word' }}>
            {listing.food_type}
          </Typography>
          <Chip
            label={statusCfg.label}
            color={statusCfg.color}
            size="small"
            sx={{ flexShrink: 0 }}
            data-testid={`status-chip-${listing.id}`}
          />
        </Box>

        {/* Description */}
        {listing.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {listing.description}
          </Typography>
        )}

        {/* Quantity */}
        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
          <RestaurantIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">
            {listing.available_quantity} / {listing.quantity} {listing.unit} available
          </Typography>
        </Box>

        {/* Expiry countdown */}
        <ExpiryCountdown expiryTime={listing.expiry_time} />

        {/* Metrics */}
        <MetricsRow metrics={metrics} />

        {/* Pending requests badge */}
        {pendingCount > 0 && (
          <Box mt={1}>
            <Chip
              label={`${pendingCount} pending request${pendingCount > 1 ? 's' : ''}`}
              color="warning"
              size="small"
              variant="outlined"
              data-testid={`pending-requests-${listing.id}`}
            />
          </Box>
        )}

        {/* Requests panel toggle */}
        {requests.filter((r) => r.status === 'pending').length > 0 && (
          <Box mt={1}>
            <Button
              size="small"
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setExpanded((v) => !v)}
              sx={{ textTransform: 'none', p: 0 }}
            >
              {expanded ? 'Hide requests' : 'View requests'}
            </Button>
            <Collapse in={expanded}>
              <Box mt={1} p={1} bgcolor="grey.50" borderRadius={1}>
                <ListingRequestsPanel
                  requests={requests}
                  onRequestUpdated={onRequestUpdated}
                />
              </Box>
            </Collapse>
          </Box>
        )}
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 2, py: 1, gap: 1 }}>
        <Tooltip title={hasMatch ? 'Cannot edit after a match is created' : 'Edit listing'}>
          <span>
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onEdit(listing)}
              disabled={hasMatch || listing.status === 'cancelled' || listing.status === 'expired'}
              data-testid={`edit-btn-${listing.id}`}
            >
              Edit
            </Button>
          </span>
        </Tooltip>
        <Button
          size="small"
          color="error"
          startIcon={<CancelIcon />}
          onClick={() => onCancel(listing)}
          disabled={listing.status === 'cancelled' || listing.status === 'completed' || listing.status === 'expired'}
          data-testid={`cancel-btn-${listing.id}`}
        >
          Cancel
        </Button>
      </CardActions>
    </Card>
  );
};

// ─── Summary Stats ─────────────────────────────────────────────────────────────

const SummaryStats = ({ listings }) => {
  const counts = listings.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    },
    {}
  );

  const stats = [
    { label: 'Active', value: counts.available || 0, color: 'success.main' },
    { label: 'Reserved', value: counts.reserved || 0, color: 'warning.main' },
    { label: 'Completed', value: counts.completed || 0, color: 'info.main' },
    { label: 'Total', value: listings.length, color: 'text.primary' },
  ];

  return (
    <Box display="flex" gap={{ xs: 2, sm: 3 }} flexWrap="wrap" mb={3}>
      {stats.map((s) => (
        <Box key={s.label} textAlign="center" minWidth={56}>
          <Typography variant="h4" fontWeight={700} sx={{ color: s.color, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
            {s.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {s.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

// ─── Certificates Panel ────────────────────────────────────────────────────────

const CertificatesPanel = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await donorService.getDonorCertificates();
    if (result.success) setCertificates(result.data);
    else setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);

  const handleDownload = async (cert) => {
    setDownloading(cert.match_id);
    const result = await donorService.downloadCertificate(cert.match_id);
    if (result.success) {
      const url = URL.createObjectURL(result.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FoodShare_Certificate_${cert.match_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setError(result.error);
    }
    setDownloading(null);
  };

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, mt: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <CertificateIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            My Donation Certificates
          </Typography>
          {certificates.length > 0 && (
            <Chip label={certificates.length} size="small" color="primary" variant="outlined" />
          )}
        </Box>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={fetchCertificates} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : certificates.length === 0 ? (
        <Box textAlign="center" py={4}>
          <CertificateIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No certificates yet. Certificates are issued when you approve a receiver's request.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ borderRadius: 1, border: '1px solid #f1f5f9' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'Food Donated', 'Quantity', 'Received By', 'Date', 'Certificate'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {certificates.map((cert) => (
                <TableRow key={cert.match_id} hover>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      FS-{String(cert.match_id).padStart(6, '0')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{cert.food_type}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{cert.quantity} {cert.unit}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{cert.receiver_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {cert.completed_at ? new Date(cert.completed_at).toLocaleDateString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={downloading === cert.match_id ? <CircularProgress size={14} /> : <DownloadIcon />}
                      onClick={() => handleDownload(cert)}
                      disabled={downloading === cert.match_id}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      Download PDF
                    </Button>
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

// ─── Main Component ────────────────────────────────────────────────────────────

const DonorDashboard = () => {  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [listingsResult, requestsResult] = await Promise.all([
      donorService.getDonorListings(),
      donorService.getAllDonorRequests(),
    ]);

    if (listingsResult.success) {
      setListings(listingsResult.data);
    } else {
      setError(listingsResult.error);
    }

    if (requestsResult.success) {
      setRequests(requestsResult.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (listing) => {
    navigate(`/donor/edit-listing/${listing.id}`);
  };

  const handleCancelOpen = (listing) => {
    setCancelTarget(listing);
  };

  const handleCancelConfirm = async (reason) => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    const result = await donorService.cancelListing(cancelTarget.id, reason);
    setCancelLoading(false);
    if (result.success) {
      setCancelTarget(null);
      fetchData();
    } else {
      setError(result.error);
      setCancelTarget(null);
    }
  };

  const getRequestsForListing = (listingId) =>
    requests.filter((r) => r.listing === listingId || r.listing?.id === listingId);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress data-testid="loading-spinner" />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
          <Avatar sx={{ bgcolor: 'primary.main', width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, flexShrink: 0 }}>
            <RestaurantIcon />
          </Avatar>
          <Box minWidth={0}>
            <Typography
              variant="h4"
              component="h1"
              color="primary"
              fontWeight={700}
              sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' }, wordBreak: 'break-word' }}
            >
              Donor Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your food listings and requests
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1} flexShrink={0}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/donor/create-listing')}
            size="small"
          >
            New Listing
          </Button>
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Summary stats */}
      {listings.length > 0 && <SummaryStats listings={listings} />}

      {/* Empty state */}
      {listings.length === 0 && !error && (
        <Box textAlign="center" py={8}>
          <RestaurantIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No food listings yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create your first listing to start sharing food with the community.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/donor/create-listing')}
          >
            Create Listing
          </Button>
        </Box>
      )}

      {/* Listings grid */}
      {listings.length > 0 && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          {listings.map((listing) => (
            <Grid item xs={12} sm={6} md={4} key={listing.id}>
              <DonorListingCard
                listing={listing}
                requests={getRequestsForListing(listing.id)}
                onEdit={handleEdit}
                onCancel={handleCancelOpen}
                onRequestUpdated={fetchData}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Certificates */}
      <CertificatesPanel />

      {/* Cancel dialog */}
      <CancelListingDialog        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        listingName={cancelTarget?.food_type}
        loading={cancelLoading}
      />

      {/* Pulse animation for urgent expiry */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Container>
  );
};

export default DonorDashboard;
