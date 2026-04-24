import { Alert, Box, Container, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import FoodListingGrid from '../components/food/FoodListingGrid';
import { USER_ROLES } from '../utils/constants';

const FoodListingsPage = () => {
  const { user } = useAuth();

  if (user?.role !== USER_ROLES.RECEIVER) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          This page is only accessible to receivers. Please log in with a receiver account to browse food listings.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 } }}>
      <Box mb={{ xs: 2, sm: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          color="primary"
          fontWeight={700}
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' } }}
        >
          Browse Food Listings
        </Typography>
        <Typography variant="body1" color="text.secondary" mt={0.5}>
          Discover available food from donors near you. Filter by type, dietary needs, or distance.
        </Typography>
      </Box>

      <FoodListingGrid />
    </Container>
  );
};

export default FoodListingsPage;
