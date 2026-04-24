import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Container,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import ProfileView from '../components/profile/ProfileView';
import ProfileForm from '../components/profile/ProfileForm';
import profileService from '../services/profileService';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    
    const result = await profileService.getProfile();
    
    if (result.success) {
      setProfile(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    setError(null);
    setSuccess(null);

    // Prepare data for submission
    const profileData = {
      full_name: values.full_name,
      phone: values.phone || null,
      address: values.address || null,
      latitude: values.latitude || null,
      longitude: values.longitude || null,
    };

    // Add role-specific fields
    if (profile.role === 'receiver') {
      profileData.dietary_preferences = values.dietary_preferences;
      profileData.allergies = values.allergies;
    } else if (profile.role === 'donor') {
      profileData.organization_name = values.organization_name;
      profileData.food_types = values.food_types;
      profileData.operating_hours = values.operating_hours;
    } else if (profile.role === 'volunteer') {
      profileData.available_time_slots = values.available_time_slots;
      profileData.transportation_capacity = values.transportation_capacity || null;
    }

    const result = await profileService.updateProfile(profileData);

    if (result.success) {
      setProfile(result.data);
      setSuccess(result.message);
      setIsEditing(false);
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError(result.error);
      if (result.fieldErrors) {
        setErrors(result.fieldErrors);
      }
    }

    setSubmitting(false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
          My Profile
        </Typography>
        {!isEditing && profile && (
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={handleEdit}
            size="small"
          >
            Edit Profile
          </Button>
        )}
      </Box>

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Profile Content */}
      {!loading && profile && (
        <>
          {isEditing ? (
            <ProfileForm
              profile={profile}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          ) : (
            <ProfileView profile={profile} />
          )}
        </>
      )}

      {/* No Profile State */}
      {!loading && !profile && !error && (
        <Alert severity="info">
          No profile data available. Please try refreshing the page.
        </Alert>
      )}
    </Container>
  );
};

export default ProfilePage;