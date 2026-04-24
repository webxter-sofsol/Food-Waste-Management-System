import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Checkbox,
  Chip,
  LinearProgress,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  LocalDining,
  LocationOn,
  NoMeals,
  Restaurant,
  Schedule,
  ShoppingCart,
  Spa,
  Star,
  Visibility,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { calculateDistance, formatDistance, formatTimeRemaining } from '../../utils/helpers';
import foodListingService from '../../services/foodListingService';

const PLACEHOLDER_IMG =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0OCIgZmlsbD0iIzllOWU5ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfjaU8L3RleHQ+PC9zdmc+';

const ListingCard = ({
  listing,
  isSelected = false,
  onCompareToggle,
  showCompareCheckbox = false,
  userLocation = null,
}) => {
  const theme = useTheme();
  const [freshnessScore, setFreshnessScore] = useState(0);
  const [distance, setDistance] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('normal');

  useEffect(() => {
    if (listing.preparation_time && listing.expiry_time) {
      setFreshnessScore(
        foodListingService.calculateFreshnessScore(listing.preparation_time, listing.expiry_time)
      );
    }
    if (userLocation && listing.pickup_latitude && listing.pickup_longitude) {
      setDistance(
        calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          listing.pickup_latitude,
          listing.pickup_longitude
        )
      );
    }
  }, [listing, userLocation]);

  useEffect(() => {
    const update = () => {
      if (!listing.expiry_time) return;
      setTimeRemaining(formatTimeRemaining(listing.expiry_time));
      const hours = (new Date(listing.expiry_time) - new Date()) / 3_600_000;
      setUrgencyLevel(hours <= 1 ? 'critical' : hours <= 2 ? 'high' : hours <= 6 ? 'medium' : 'normal');
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [listing.expiry_time]);

  const urgencyColor = { critical: 'error', high: 'warning', medium: 'info', normal: 'success' }[urgencyLevel];
  const freshnessColor = freshnessScore >= 80 ? 'success' : freshnessScore >= 60 ? 'info' : freshnessScore >= 40 ? 'warning' : 'error';

  const dietaryIcons = [
    listing.is_vegetarian && <Tooltip key="veg" title="Vegetarian"><Spa color="success" fontSize="small" /></Tooltip>,
    listing.is_vegan && <Tooltip key="vegan" title="Vegan"><LocalDining color="success" fontSize="small" /></Tooltip>,
    listing.is_gluten_free && <Tooltip key="gf" title="Gluten-Free"><NoMeals color="info" fontSize="small" /></Tooltip>,
  ].filter(Boolean);

  return (
    <Card
      elevation={isSelected ? 4 : 1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 2,
        border: 2,
        borderColor: isSelected ? 'primary.main' : 'transparent',
        outline: isSelected ? `2px solid ${theme.palette.primary.main}` : 'none',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 },
      }}
    >
      {/* Compare checkbox — top-left */}
      {showCompareCheckbox && (
        <Box
          position="absolute"
          top={8}
          left={8}
          zIndex={2}
          sx={{
            bgcolor: 'rgba(255,255,255,0.92)',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Checkbox
            size="small"
            checked={isSelected}
            onChange={() => onCompareToggle(listing.id)}
            slotProps={{ input: { 'aria-label': `Select ${listing.food_type} for comparison` } }}
          />
        </Box>
      )}

      {/* Urgency badge — top-right */}
      {urgencyLevel !== 'normal' && (
        <Box position="absolute" top={8} right={8} zIndex={2}>
          <Chip
            label={urgencyLevel === 'critical' ? 'URGENT' : 'EXPIRES SOON'}
            color={urgencyColor}
            size="small"
          />
        </Box>
      )}

      {/* Image */}
      <CardMedia
        component="img"
        image={listing.images?.[0] || PLACEHOLDER_IMG}
        alt={listing.food_type}
        sx={{ height: { xs: 160, sm: 180 }, objectFit: 'cover', bgcolor: 'grey.100' }}
        onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
      />

      {/* Content */}
      <CardContent sx={{ flexGrow: 1, pb: 1, px: { xs: 1.5, sm: 2 } }}>
        {/* Title row */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1} mb={0.5}>
          <Typography variant="h6" component="h3" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' }, fontWeight: 600, lineHeight: 1.3 }}>
            {listing.food_type}
          </Typography>
          {dietaryIcons.length > 0 && (
            <Box display="flex" gap={0.5} flexShrink={0} mt={0.25}>
              {dietaryIcons}
            </Box>
          )}
        </Box>

        {/* Description */}
        {listing.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1 }}
          >
            {listing.description}
          </Typography>
        )}

        {/* Meta rows */}
        <Box display="flex" flexDirection="column" gap={0.75} mt={1}>
          <Box display="flex" alignItems="center" gap={0.75}>
            <Restaurant fontSize="small" color="action" />
            <Typography variant="body2">{listing.quantity} {listing.unit || 'servings'}</Typography>
          </Box>

          {distance !== null && (
            <Box display="flex" alignItems="center" gap={0.75}>
              <LocationOn fontSize="small" color="action" />
              <Typography variant="body2">{formatDistance(distance)} away</Typography>
            </Box>
          )}

          <Box display="flex" alignItems="center" gap={0.75}>
            <Schedule fontSize="small" color={urgencyColor} />
            <Typography variant="body2" color={`${urgencyColor}.main`} fontWeight={urgencyLevel !== 'normal' ? 600 : 400}>
              {timeRemaining}
            </Typography>
          </Box>
        </Box>

        {/* Freshness bar */}
        <Box mt={1.5}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Star fontSize="small" color={freshnessColor} />
              <Typography variant="caption" color="text.secondary">Freshness</Typography>
            </Box>
            <Typography variant="caption" fontWeight={700} color={`${freshnessColor}.main`}>
              {freshnessScore}/100
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={freshnessScore} color={freshnessColor} sx={{ height: 5, borderRadius: 3 }} />
        </Box>

        {/* Donor */}
        <Box display="flex" alignItems="center" gap={1} mt={1.5}>
          <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: 'primary.light' }}>
            {listing.donor_name?.charAt(0).toUpperCase() ?? 'D'}
          </Avatar>
          <Typography variant="caption" color="text.secondary">
            {listing.donor_name || 'Anonymous Donor'}
          </Typography>
        </Box>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ px: { xs: 1.5, sm: 2 }, pb: 1.5, pt: 0, gap: 1 }}>
        <Button
          size="small"
          startIcon={<Visibility />}
          onClick={() => { window.location.href = `/food-listings/${listing.id}`; }}
          sx={{ flex: 1 }}
        >
          Details
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<ShoppingCart />}
          onClick={() => { window.location.href = `/food-listings/${listing.id}/request`; }}
          disabled={listing.status !== 'available'}
          sx={{ flex: 1 }}
        >
          Request
        </Button>
      </CardActions>
    </Card>
  );
};

export default ListingCard;
