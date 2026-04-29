import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Grid, LinearProgress, Paper, TextField, Typography,
} from '@mui/material';
import {
  ArrowBack, LocalDining, LocationOn, NoMeals, Restaurant,
  Schedule, ShoppingCart, Spa, Star, Warning,
} from '@mui/icons-material';
import foodListingService from '../services/foodListingService';
import api from '../services/api';
import { formatDateTime, formatTimeRemaining, calculateDistance, formatDistance } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const PLACEHOLDER_IMG =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI2NCIgZmlsbD0iIzllOWU5ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfjaU8L3RleHQ+PC9zdmc+';

const FoodListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useLocation();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('normal');
  const [freshnessScore, setFreshnessScore] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [distance, setDistance] = useState(null);

  // Request modal state
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestQty, setRequestQty] = useState(1);
  const [pickupTime, setPickupTime] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const data = await foodListingService.getListing(id);
        setListing(data);
        setFreshnessScore(
          foodListingService.calculateFreshnessScore(data.preparation_time, data.expiry_time)
        );
        if (user?.profile?.latitude && user?.profile?.longitude && data.pickup_latitude && data.pickup_longitude) {
          setDistance(calculateDistance(
            user.profile.latitude, user.profile.longitude,
            data.pickup_latitude, data.pickup_longitude
          ));
        }
      } catch {
        setError('Failed to load listing details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id, user]);

  // Auto-open request modal if navigated with openRequest state
  useEffect(() => {
    if (state?.openRequest && listing) {
      setRequestOpen(true);
    }
  }, [state, listing]);
  useEffect(() => {
    if (!listing?.expiry_time) return;
    const update = () => {
      setTimeRemaining(formatTimeRemaining(listing.expiry_time));
      const hours = (new Date(listing.expiry_time) - new Date()) / 3_600_000;
      setUrgencyLevel(hours <= 1 ? 'critical' : hours <= 2 ? 'high' : hours <= 6 ? 'medium' : 'normal');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [listing?.expiry_time]);

  const handleRequestSubmit = async () => {
    setRequestError('');
    if (!requestQty || requestQty < 1) { setRequestError('Please enter a valid quantity.'); return; }
    if (requestQty > listing.available_quantity) {
      setRequestError(`Quantity cannot exceed available amount (${listing.available_quantity}).`);
      return;
    }
    if (!pickupTime) { setRequestError('Please select a pickup time.'); return; }
    try {
      setRequestLoading(true);
      await api.post('/food-requests/', {
        listing: listing.id,
        requested_quantity: requestQty,
        pickup_time_preference: pickupTime,
        special_instructions: specialInstructions || null,
      });
      setRequestSuccess(true);
      setRequestOpen(false);
    } catch (err) {
      setRequestError(err.response?.data?.message || err.response?.data?.detail || 'Failed to submit request.');
    } finally {
      setRequestLoading(false);
    }
  };

  const urgencyColor = { critical: 'error', high: 'warning', medium: 'info', normal: 'success' }[urgencyLevel];
  const freshnessColor = freshnessScore >= 80 ? 'success' : freshnessScore >= 60 ? 'info' : freshnessScore >= 40 ? 'warning' : 'error';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !listing) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Listing not found.'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button>
      </Container>
    );
  }

  const images = listing.images?.length ? listing.images : [PLACEHOLDER_IMG];
  const allergens = listing.allergen_info
    ? (Array.isArray(listing.allergen_info) ? listing.allergen_info : Object.keys(listing.allergen_info).filter(k => listing.allergen_info[k]))
    : [];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Back button */}
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back to Listings
      </Button>

      {requestSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRequestSuccess(false)}>
          Your food request has been submitted successfully!
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left: Image gallery */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              component="img"
              src={images[activeImage]}
              alt={listing.food_type}
              onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
              sx={{ width: '100%', height: { xs: 220, sm: 300, md: 360 }, objectFit: 'cover', display: 'block' }}
            />
            {images.length > 1 && (
              <Box display="flex" gap={1} p={1} flexWrap="wrap" sx={{ overflowX: 'auto' }}>
                {images.map((img, i) => (
                  <Box
                    key={i}
                    component="img"
                    src={img}
                    alt={`${listing.food_type} ${i + 1}`}
                    onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                    onClick={() => setActiveImage(i)}
                    sx={{
                      width: { xs: 52, sm: 64 }, height: { xs: 52, sm: 64 },
                      objectFit: 'cover', borderRadius: 1, cursor: 'pointer',
                      border: 2, borderColor: activeImage === i ? 'primary.main' : 'transparent',
                      opacity: activeImage === i ? 1 : 0.7,
                      transition: 'opacity 0.15s, border-color 0.15s',
                      flexShrink: 0,
                      '&:hover': { opacity: 1 },
                    }}
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right: Details */}
        <Grid item xs={12} md={6}>
          <Box>
            {/* Title + urgency */}
            <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1} mb={1}>
              <Typography
                variant="h4"
                component="h1"
                fontWeight={700}
                sx={{ fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2rem' }, wordBreak: 'break-word', minWidth: 0 }}
              >
                {listing.food_type}
              </Typography>
              {urgencyLevel !== 'normal' && (
                <Chip
                  icon={<Warning />}
                  label={urgencyLevel === 'critical' ? 'URGENT' : 'EXPIRES SOON'}
                  color={urgencyColor}
                  size="small"
                  sx={{ flexShrink: 0 }}
                />
              )}
            </Box>

            {listing.description && (
              <Typography variant="body1" color="text.secondary" mb={2}>{listing.description}</Typography>
            )}

            {/* Key info */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <Restaurant fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Quantity</Typography>
                      <Typography variant="body2" fontWeight={600}>{listing.quantity} {listing.unit || 'servings'}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <Schedule fontSize="small" color={urgencyColor} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Expires</Typography>
                      <Typography variant="body2" fontWeight={600} color={`${urgencyColor}.main`}>{timeRemaining}</Typography>
                    </Box>
                  </Box>
                </Grid>
                {distance !== null && (
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <LocationOn fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Distance</Typography>
                        <Typography variant="body2" fontWeight={600}>{formatDistance(distance)}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                <Grid item xs={distance !== null ? 6 : 12}>
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <LocationOn fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Pickup Location</Typography>
                      <Typography variant="body2" fontWeight={600}>{listing.pickup_address || 'See details'}</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Freshness score */}
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Star fontSize="small" color={freshnessColor} />
                  <Typography variant="body2" fontWeight={600}>Freshness Score</Typography>
                </Box>
                <Typography variant="body2" fontWeight={700} color={`${freshnessColor}.main`}>
                  {freshnessScore}/100
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={freshnessScore} color={freshnessColor} sx={{ height: 8, borderRadius: 4 }} />
            </Box>

            {/* Dietary attributes */}
            <Box mb={2}>
              <Typography variant="body2" fontWeight={600} mb={0.75}>Dietary Attributes</Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {listing.is_vegetarian && <Chip icon={<Spa />} label="Vegetarian" color="success" size="small" />}
                {listing.is_vegan && <Chip icon={<LocalDining />} label="Vegan" color="success" size="small" />}
                {listing.is_gluten_free && <Chip icon={<NoMeals />} label="Gluten-Free" color="info" size="small" />}
                {!listing.is_vegetarian && !listing.is_vegan && !listing.is_gluten_free && (
                  <Typography variant="body2" color="text.secondary">No special dietary attributes</Typography>
                )}
              </Box>
            </Box>

            {/* Allergens */}
            {allergens.length > 0 && (
              <Box mb={2}>
                <Typography variant="body2" fontWeight={600} mb={0.75} color="warning.main">
                  ⚠ Allergen Information
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {allergens.map((a) => (
                    <Chip key={a} label={a} color="warning" size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {/* Donor info */}
            <Divider sx={{ my: 2 }} />
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {listing.donor_name?.charAt(0).toUpperCase() ?? 'D'}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>{listing.donor_name || 'Anonymous Donor'}</Typography>
                {listing.donor_organization && (
                  <Typography variant="caption" color="text.secondary">{listing.donor_organization}</Typography>
                )}
                {listing.donor_rating != null && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Star fontSize="small" color="warning" sx={{ fontSize: '0.9rem' }} />
                    <Typography variant="caption">{Number(listing.donor_rating).toFixed(1)}</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Expiry date */}
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Expires: {formatDateTime(listing.expiry_time)} &nbsp;|&nbsp; Prepared: {formatDateTime(listing.preparation_time)}
            </Typography>

            {/* Request button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<ShoppingCart />}
              onClick={() => setRequestOpen(true)}
              disabled={listing.status !== 'available' || listing.available_quantity === 0}
            >
              {listing.status !== 'available' ? 'Not Available' : 'Request Food'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Request Modal */}
      <Dialog open={requestOpen} onClose={() => setRequestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Food</DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Available: {listing.available_quantity} {listing.unit || 'servings'}
          </Typography>
          {requestError && <Alert severity="error" sx={{ mb: 2 }}>{requestError}</Alert>}
          <TextField
            label="Quantity"
            type="number"
            fullWidth
            value={requestQty}
            onChange={(e) => setRequestQty(Number(e.target.value))}
            slotProps={{ htmlInput: { min: 1, max: listing.available_quantity } }}
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
          <Button onClick={() => setRequestOpen(false)} disabled={requestLoading}>Cancel</Button>
          <Button variant="contained" onClick={handleRequestSubmit} disabled={requestLoading}>
            {requestLoading ? <CircularProgress size={20} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FoodListingDetailPage;
