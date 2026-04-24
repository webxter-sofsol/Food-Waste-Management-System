import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Alert, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import FoodListingForm from '../components/food/FoodListingForm';
import foodListingService from '../services/foodListingService';

const EditFoodListingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await foodListingService.getListing(id);
        setListing(data);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load listing.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <Box display='flex' justifyContent='center' alignItems='center' minHeight={300}><CircularProgress /></Box>;
  if (error || !listing) return (
    <Box p={3}>
      <Alert severity='error' sx={{ mb: 2 }}>{error || 'Listing not found.'}</Alert>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/donor/listings')}>Back to Listings</Button>
    </Box>
  );

  return <FoodListingForm listing={listing} />;
};

export default EditFoodListingPage;
