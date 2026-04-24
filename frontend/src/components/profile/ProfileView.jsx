import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Rating,
  Divider,
} from '@mui/material';
import {
  Email,
  Phone,
  LocationOn,
  Restaurant,
  LocalShipping,
  Star,
} from '@mui/icons-material';

/**
 * ProfileView Component
 * Displays user profile information with role-specific fields
 */
const ProfileView = ({ profile }) => {
  if (!profile) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No profile data available
        </Typography>
      </Paper>
    );
  }

  const { role } = profile;

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Basic Information */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Profile Information
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Email sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{profile.email}</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Role
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={role.charAt(0).toUpperCase() + role.slice(1)}
                  color="primary"
                  size="small"
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Full Name
              </Typography>
              <Typography variant="body1">
                {profile.full_name || 'Not provided'}
              </Typography>
            </Box>
          </Grid>

          {profile.phone && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{profile.phone}</Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {profile.address && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <LocationOn sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1">{profile.address}</Typography>
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Rating Information */}
      {profile.total_ratings > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ratings
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Rating
              value={profile.average_rating}
              precision={0.1}
              readOnly
              icon={<Star fontSize="inherit" />}
            />
            <Typography variant="body1">
              {profile.average_rating.toFixed(1)} ({profile.total_ratings}{' '}
              {profile.total_ratings === 1 ? 'rating' : 'ratings'})
            </Typography>
          </Box>
        </Box>
      )}

      {/* Receiver-specific fields */}
      {role === 'receiver' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Dietary Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {profile.dietary_preferences &&
            profile.dietary_preferences.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Dietary Preferences
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {profile.dietary_preferences.map((pref, index) => (
                    <Chip key={index} label={pref} size="small" />
                  ))}
                </Box>
              </Box>
            )}

          {profile.allergies && profile.allergies.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Allergies
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {profile.allergies.map((allergy, index) => (
                  <Chip
                    key={index}
                    label={allergy}
                    size="small"
                    color="error"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Donor-specific fields */}
      {role === 'donor' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Restaurant sx={{ mr: 1 }} />
            Organization Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {profile.organization_name && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Organization Name
              </Typography>
              <Typography variant="body1">
                {profile.organization_name}
              </Typography>
            </Box>
          )}

          {profile.food_types && profile.food_types.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Food Types
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {profile.food_types.map((type, index) => (
                  <Chip key={index} label={type} size="small" color="primary" />
                ))}
              </Box>
            </Box>
          )}

          {profile.operating_hours && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Operating Hours
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {JSON.stringify(profile.operating_hours, null, 2)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Volunteer-specific fields */}
      {role === 'volunteer' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <LocalShipping sx={{ mr: 1 }} />
            Volunteer Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {profile.available_time_slots &&
            profile.available_time_slots.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Available Time Slots
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {profile.available_time_slots.map((slot, index) => (
                    <Chip key={index} label={slot} size="small" />
                  ))}
                </Box>
              </Box>
            )}

          {profile.transportation_capacity && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Transportation Capacity
              </Typography>
              <Typography variant="body1">
                {profile.transportation_capacity} servings
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Verification Status */}
      {profile.verification_status && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Verification Status
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={
                profile.verification_status.charAt(0).toUpperCase() +
                profile.verification_status.slice(1)
              }
              color={
                profile.verification_status === 'approved'
                  ? 'success'
                  : profile.verification_status === 'rejected'
                  ? 'error'
                  : 'warning'
              }
              size="small"
            />
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ProfileView;
