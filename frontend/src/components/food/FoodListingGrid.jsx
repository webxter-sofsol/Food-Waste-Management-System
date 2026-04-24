import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Pagination,
  Snackbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CompareArrows } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import ListingCard from './ListingCard';
import FilterPanel from './FilterPanel';
import SortControls from './SortControls';
import foodListingService from '../../services/foodListingService';
import searchPreferenceService from '../../services/searchPreferenceService';
import { useAuth } from '../../context/AuthContext';

const ITEMS_PER_PAGE = 20;

const FoodListingGrid = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('freshness_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [compareIds, setCompareIds] = useState([]);
  const [compareAlert, setCompareAlert] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  // Resolve user location
  useEffect(() => {
    if (user?.profile?.latitude && user?.profile?.longitude) {
      setUserLocation({ latitude: user.profile.latitude, longitude: user.profile.longitude });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => setUserLocation({ latitude: coords.latitude, longitude: coords.longitude }),
        (err) => console.warn('Geolocation unavailable:', err)
      );
    }
  }, [user]);

  // Load saved preferences once on mount
  useEffect(() => {
    (async () => {
      try {
        const prefs = await searchPreferenceService.getPreferences();
        setFilters(prefs.filters || {});
        setSortBy(prefs.sortBy || 'freshness_score');
        setSortOrder(prefs.sortOrder || 'desc');
      } catch {
        // silently ignore
      }
    })();
  }, []);

  // Fetch listings whenever deps change
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {
          ...filters,
          sort_by: sortBy,
          sort_order: sortOrder,
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
          ...(userLocation && {
            user_latitude: userLocation.latitude,
            user_longitude: userLocation.longitude,
          }),
        };
        const res = await foodListingService.getListings(params);
        setListings(res.results || res.data || []);
        const total = res.count || res.total || 0;
        setTotalCount(total);
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
      } catch {
        setError('Failed to load food listings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [filters, sortBy, sortOrder, currentPage, userLocation]);

  // Persist preferences
  useEffect(() => {
    searchPreferenceService.savePreferences({ filters, sortBy, sortOrder }).catch(() => {});
  }, [filters, sortBy, sortOrder]);

  const handleFilterChange = (f) => { setFilters(f); setCurrentPage(1); };
  const handleSortChange = (by, order) => { setSortBy(by); setSortOrder(order); setCurrentPage(1); };
  const handlePageChange = (_, page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompareToggle = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) { setCompareAlert('You can compare up to 4 listings at once.'); return prev; }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (compareIds.length < 2) { setCompareAlert('Select at least 2 listings to compare.'); return; }
    window.location.href = `/food-listings/compare?ids=${compareIds.join(',')}`;
  };

  if (loading && listings.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={360}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: compareIds.length > 0 ? { xs: 8, sm: 7 } : 0 }}>
      {/* Controls */}
      <Box mb={2}>
        <FilterPanel filters={filters} onFilterChange={handleFilterChange} loading={loading} />
        <Box mt={1.5}>
          <SortControls sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
        </Box>
      </Box>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Results meta */}
      <Box mb={1.5} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Loading…' : `${totalCount} listing${totalCount !== 1 ? 's' : ''} found`}
        </Typography>
        {totalPages > 1 && (
          <Typography variant="body2" color="text.secondary">
            Page {currentPage} of {totalPages}
          </Typography>
        )}
      </Box>

      {/* Grid */}
      {listings.length === 0 && !loading ? (
        <Box textAlign="center" py={10}>
          <Typography variant="h6" color="text.secondary" gutterBottom>No food listings found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters or check back later.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          {listings.map((listing) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={listing.id}>
              <ListingCard
                listing={listing}
                isSelected={compareIds.includes(listing.id)}
                onCompareToggle={handleCompareToggle}
                showCompareCheckbox
                userLocation={userLocation}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size={isMobile ? 'medium' : 'large'}
            siblingCount={isMobile ? 0 : 1}
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Inline loading overlay */}
      {loading && listings.length > 0 && (
        <Box
          position="fixed" top={0} left={0} right={0} bottom={0}
          bgcolor="rgba(255,255,255,0.65)"
          display="flex" alignItems="center" justifyContent="center"
          zIndex={1200}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Sticky comparison bar */}
      {compareIds.length > 0 && (
        <Box
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          zIndex={1100}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            px: { xs: 2, sm: 4 },
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 8,
          }}
        >
          <Typography variant="body2" fontWeight={500}>
            {compareIds.length} item{compareIds.length > 1 ? 's' : ''} selected
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<CompareArrows />}
              onClick={handleCompare}
              disabled={compareIds.length < 2}
            >
              {isMobile ? `Compare (${compareIds.length})` : `Compare ${compareIds.length} items`}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCompareIds([])}
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
            >
              Clear
            </Button>
          </Box>
        </Box>
      )}

      {/* Alert snackbar */}
      <Snackbar
        open={!!compareAlert}
        autoHideDuration={4000}
        onClose={() => setCompareAlert('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: compareIds.length > 0 ? 7 : 0 }}
      >
        <Alert onClose={() => setCompareAlert('')} severity="warning" variant="filled">
          {compareAlert}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FoodListingGrid;
