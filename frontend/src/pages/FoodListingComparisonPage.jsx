import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, Paper, TextField, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  ArrowBack, LocalDining, NoMeals, ShoppingCart, Spa, Star, Warning,
} from '@mui/icons-material';
import foodListingService from '../services/foodListingService';
import api from '../services/api';
import { formatTimeRemaining, formatDistance, calculateDistance } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const PLACEHOLDER_IMG =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0OCIgZmlsbD0iIzllOWU5ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfjaU8L3RleHQ+PC9zdmc+';

// Returns true if the value differs from at least one other listing's value for this field
const isDifferent = (listings, field) => {
  const vals = listings.map((l) => {
    const v = l[field];
    return v === null || v === undefined ? '' : String(v);
  });
  return new Set(vals).size > 1;
};

const DIFF_BG = 'rgba(255, 152, 0, 0.12)';

const FoodListingComparisonPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 4);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemainings, setTimeRemainings] = useState({});
  const [distances, setDistances] = useState({});

  // Request modal
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestQty, setRequestQty] = useState(1);
  const [pickupTime, setPickupTime] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  useEffect(() => {
    if (ids.length < 2) { setLoading(false); return; }
    const fetchAll = async () => {
      try {
        setLoading(true);
        const results = await Promise.all(ids.map((id) => foodListingService.getListing(id)));
        setListings(results);
        // Compute distances
        if (user?.profile?.latitude && user?.profile?.longitude) {
          const d = {};
          results.forEach((l) => {
            if (l.pickup_latitude && l.pickup_longitude) {
              d[l.id] = calculateDistance(
                user.profile.latitude, user.profile.longitude,
                l.pickup_latitude, l.pickup_longitude
              );
            }
          });
          setDistances(d);
        }
      } catch {
        setError('Failed to load one or more listings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // Live countdown for all listings
  useEffect(() => {
    if (!listings.length) return;
    const update = () => {
      const tr = {};
      listings.forEach((l) => { tr[l.id] = formatTimeRemaining(l.expiry_time); });
      setTimeRemainings(tr);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [listings]);

  const openRequest = (listing) => {
    setRequestTarget(listing);
    setRequestQty(1);
    setPickupTime('');
    setSpecialInstructions('');
    setRequestError('');
  };

  const handleRequestSubmit = async () => {
    setRequestError('');
    if (!requestQty || requestQty < 1) { setRequestError('Please enter a valid quantity.'); return; }
    if (requestQty > requestTarget.available_quantity) {
      setRequestError(`Quantity cannot exceed available amount (${requestTarget.available_quantity}).`);
      return;
    }
    if (!pickupTime) { setRequestError('Please select a pickup time.'); return; }
    try {
      setRequestLoading(true);
      await api.post('/food-requests/', {
        listing: requestTarget.id,
        requested_quantity: requestQty,
        pickup_time_preference: pickupTime,
        special_instructions: specialInstructions || null,
      });
      setRequestSuccess(`Request for "${requestTarget.food_type}" submitted successfully!`);
      setRequestTarget(null);
    } catch (err) {
      setRequestError(err.response?.data?.message || err.response?.data?.detail || 'Failed to submit request.');
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (ids.length < 2) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Please select at least 2 listings to compare. Go back to the browse page and check the compare boxes.
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Back to Listings</Button>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button>
      </Container>
    );
  }

  // Field definitions for comparison rows
  const fields = [
    { label: 'Food Type', key: 'food_type', render: (l) => l.food_type },
    { label: 'Quantity', key: 'quantity', render: (l) => `${l.quantity} ${l.unit || 'servings'}` },
    {
      label: 'Expires In', key: 'expiry_time',
      render: (l) => {
        const hours = (new Date(l.expiry_time) - new Date()) / 3_600_000;
        const color = hours <= 1 ? 'error.main' : hours <= 2 ? 'warning.main' : hours <= 6 ? 'info.main' : 'success.main';
        return <Typography variant="body2" color={color} fontWeight={600}>{timeRemainings[l.id] || '—'}</Typography>;
      },
    },
    {
      label: 'Distance', key: '_distance',
      render: (l) => distances[l.id] != null ? formatDistance(distances[l.id]) : '—',
      diffKey: null, // computed, skip diff highlight
    },
    {
      label: 'Freshness Score', key: 'freshness_score',
      render: (l) => {
        const score = foodListingService.calculateFreshnessScore(l.preparation_time, l.expiry_time);
        const color = score >= 80 ? 'success' : score >= 60 ? 'info' : score >= 40 ? 'warning' : 'error';
        return (
          <Box>
            <Box display="flex" justifyContent="space-between" mb={0.25}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Star fontSize="small" color={color} sx={{ fontSize: '0.9rem' }} />
              </Box>
              <Typography variant="caption" fontWeight={700} color={`${color}.main`}>{score}/100</Typography>
            </Box>
            <LinearProgress variant="determinate" value={score} color={color} sx={{ height: 6, borderRadius: 3 }} />
          </Box>
        );
      },
    },
    {
      label: 'Vegetarian', key: 'is_vegetarian',
      render: (l) => l.is_vegetarian
        ? <Chip icon={<Spa />} label="Yes" color="success" size="small" />
        : <Typography variant="body2" color="text.secondary">No</Typography>,
    },
    {
      label: 'Vegan', key: 'is_vegan',
      render: (l) => l.is_vegan
        ? <Chip icon={<LocalDining />} label="Yes" color="success" size="small" />
        : <Typography variant="body2" color="text.secondary">No</Typography>,
    },
    {
      label: 'Gluten-Free', key: 'is_gluten_free',
      render: (l) => l.is_gluten_free
        ? <Chip icon={<NoMeals />} label="Yes" color="info" size="small" />
        : <Typography variant="body2" color="text.secondary">No</Typography>,
    },
    {
      label: 'Allergens', key: 'allergen_info',
      render: (l) => {
        const allergens = l.allergen_info
          ? (Array.isArray(l.allergen_info) ? l.allergen_info : Object.keys(l.allergen_info).filter(k => l.allergen_info[k]))
          : [];
        return allergens.length
          ? <Box display="flex" gap={0.5} flexWrap="wrap">{allergens.map(a => <Chip key={a} label={a} color="warning" size="small" variant="outlined" />)}</Box>
          : <Typography variant="body2" color="text.secondary">None</Typography>;
      },
    },
    { label: 'Pickup Location', key: 'pickup_address', render: (l) => l.pickup_address || '—' },
    { label: 'Donor', key: 'donor_name', render: (l) => l.donor_name || 'Anonymous' },
  ];

  // Mobile: stack listings vertically
  if (isMobile) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back</Button>
        <Typography variant="h5" fontWeight={700} mb={2}>Comparing {listings.length} Listings</Typography>
        {requestSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRequestSuccess('')}>{requestSuccess}</Alert>}
        {listings.map((listing) => {
          const hours = (new Date(listing.expiry_time) - new Date()) / 3_600_000;
          const urgencyColor = hours <= 1 ? 'error' : hours <= 2 ? 'warning' : hours <= 6 ? 'info' : 'success';
          const score = foodListingService.calculateFreshnessScore(listing.preparation_time, listing.expiry_time);
          const freshnessColor = score >= 80 ? 'success' : score >= 60 ? 'info' : score >= 40 ? 'warning' : 'error';
          const allergens = listing.allergen_info
            ? (Array.isArray(listing.allergen_info) ? listing.allergen_info : Object.keys(listing.allergen_info).filter(k => listing.allergen_info[k]))
            : [];
          return (
            <Paper key={listing.id} elevation={2} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
              <Box
                component="img"
                src={listing.images?.[0] || PLACEHOLDER_IMG}
                alt={listing.food_type}
                onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
              />
              <Box p={2}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="h6" fontWeight={700}>{listing.food_type}</Typography>
                  {hours <= 6 && <Chip icon={<Warning />} label={hours <= 1 ? 'URGENT' : 'SOON'} color={urgencyColor} size="small" />}
                </Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {listing.quantity} {listing.unit || 'servings'} &nbsp;|&nbsp; {timeRemainings[listing.id] || '—'}
                  {distances[listing.id] != null && ` | ${formatDistance(distances[listing.id])}`}
                </Typography>
                <Box mb={1}>
                  <Box display="flex" justifyContent="space-between" mb={0.25}>
                    <Box display="flex" alignItems="center" gap={0.5}><Star fontSize="small" color={freshnessColor} sx={{ fontSize: '0.9rem' }} /></Box>
                    <Typography variant="caption" fontWeight={700} color={`${freshnessColor}.main`}>{score}/100</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={score} color={freshnessColor} sx={{ height: 6, borderRadius: 3 }} />
                </Box>
                <Box display="flex" gap={0.75} flexWrap="wrap" mb={1}>
                  {listing.is_vegetarian && <Chip icon={<Spa />} label="Vegetarian" color="success" size="small" />}
                  {listing.is_vegan && <Chip icon={<LocalDining />} label="Vegan" color="success" size="small" />}
                  {listing.is_gluten_free && <Chip icon={<NoMeals />} label="Gluten-Free" color="info" size="small" />}
                </Box>
                {allergens.length > 0 && (
                  <Box mb={1}>
                    <Typography variant="caption" color="warning.main" fontWeight={600}>⚠ Allergens: </Typography>
                    {allergens.map(a => <Chip key={a} label={a} color="warning" size="small" variant="outlined" sx={{ mr: 0.5 }} />)}
                  </Box>
                )}
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<ShoppingCart />}
                  onClick={() => openRequest(listing)}
                  disabled={listing.status !== 'available'}
                  sx={{ mt: 1 }}
                >
                  Request Food
                </Button>
              </Box>
            </Paper>
          );
        })}
        <RequestModal
          open={!!requestTarget}
          listing={requestTarget}
          qty={requestQty}
          setQty={setRequestQty}
          pickupTime={pickupTime}
          setPickupTime={setPickupTime}
          specialInstructions={specialInstructions}
          setSpecialInstructions={setSpecialInstructions}
          error={requestError}
          loading={requestLoading}
          onClose={() => setRequestTarget(null)}
          onSubmit={handleRequestSubmit}
        />
      </Container>
    );
  }

  // Desktop: side-by-side table
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back to Listings</Button>
      <Typography variant="h5" fontWeight={700} mb={3}>Compare Food Listings</Typography>
      {requestSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRequestSuccess('')}>{requestSuccess}</Alert>}

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 600, display: 'grid', gridTemplateColumns: `180px repeat(${listings.length}, 1fr)`, gap: 0 }}>
          {/* Header row: images */}
          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }} />
          {listings.map((listing) => (
            <Box key={listing.id} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', borderLeft: 1 }}>
              <Box
                component="img"
                src={listing.images?.[0] || PLACEHOLDER_IMG}
                alt={listing.food_type}
                onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                sx={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 1, display: 'block' }}
              />
            </Box>
          ))}

          {/* Data rows */}
          {fields.map((field, fi) => {
            const diffKey = field.diffKey !== undefined ? field.diffKey : field.key;
            const hasDiff = diffKey && isDifferent(listings, diffKey);
            const rowBg = fi % 2 === 0 ? 'background.paper' : 'grey.50';
            return [
              // Label cell
              <Box
                key={`label-${field.key}`}
                sx={{ p: 1.5, bgcolor: rowBg, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}
              >
                <Typography variant="body2" fontWeight={600} color="text.secondary">{field.label}</Typography>
              </Box>,
              // Value cells
              ...listings.map((listing) => (
                <Box
                  key={`${field.key}-${listing.id}`}
                  sx={{
                    p: 1.5,
                    bgcolor: hasDiff ? DIFF_BG : rowBg,
                    borderBottom: 1,
                    borderLeft: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {typeof field.render(listing) === 'string'
                    ? <Typography variant="body2">{field.render(listing)}</Typography>
                    : field.render(listing)}
                </Box>
              )),
            ];
          })}

          {/* Request button row */}
          <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderTop: 2, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary">Action</Typography>
          </Box>
          {listings.map((listing) => (
            <Box key={`action-${listing.id}`} sx={{ p: 1.5, bgcolor: 'grey.50', borderTop: 2, borderLeft: 1, borderColor: 'divider' }}>
              <Button
                variant="contained"
                fullWidth
                size="small"
                startIcon={<ShoppingCart />}
                onClick={() => openRequest(listing)}
                disabled={listing.status !== 'available'}
              >
                Request
              </Button>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Diff legend */}
      <Box display="flex" alignItems="center" gap={1} mt={2}>
        <Box sx={{ width: 16, height: 16, bgcolor: DIFF_BG, border: '1px solid', borderColor: 'warning.light', borderRadius: 0.5 }} />
        <Typography variant="caption" color="text.secondary">Highlighted rows indicate differences between listings</Typography>
      </Box>

      <RequestModal
        open={!!requestTarget}
        listing={requestTarget}
        qty={requestQty}
        setQty={setRequestQty}
        pickupTime={pickupTime}
        setPickupTime={setPickupTime}
        specialInstructions={specialInstructions}
        setSpecialInstructions={setSpecialInstructions}
        error={requestError}
        loading={requestLoading}
        onClose={() => setRequestTarget(null)}
        onSubmit={handleRequestSubmit}
      />
    </Container>
  );
};

// Shared request modal component
const RequestModal = ({ open, listing, qty, setQty, pickupTime, setPickupTime, specialInstructions, setSpecialInstructions, error, loading, onClose, onSubmit }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Request Food{listing ? ` — ${listing.food_type}` : ''}</DialogTitle>
    <DialogContent dividers sx={{ overflowY: 'auto' }}>
      {listing && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Available: {listing.available_quantity} {listing.unit || 'servings'}
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField
        label="Quantity"
        type="number"
        fullWidth
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        slotProps={{ htmlInput: { min: 1, max: listing?.available_quantity } }}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Preferred Pickup Time"
        type="datetime-local"
        fullWidth
        value={pickupTime}
        onChange={(e) => setPickupTime(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Special Instructions (optional)"
        multiline
        rows={3}
        fullWidth
        value={specialInstructions}
        onChange={(e) => setSpecialInstructions(e.target.value)}
        placeholder="Any dietary needs, allergies, or pickup notes..."
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>Cancel</Button>
      <Button variant="contained" onClick={onSubmit} disabled={loading}>
        {loading ? <CircularProgress size={20} /> : 'Submit Request'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default FoodListingComparisonPage;
