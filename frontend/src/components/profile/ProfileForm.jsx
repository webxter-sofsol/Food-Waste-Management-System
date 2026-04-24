import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Paper,
  Chip,
  InputAdornment,
  IconButton,
  Alert,
  Divider,
} from '@mui/material';
import {
  Save,
  Cancel,
  Add,
  Delete,
  MyLocation,
} from '@mui/icons-material';

/**
 * ProfileForm Component
 * Form for editing user profile with role-specific fields
 */
const ProfileForm = ({ profile, onSubmit, onCancel }) => {
  const [locationLoading, setLocationLoading] = useState(false);

  // Validation schema
  const validationSchema = Yup.object({
    full_name: Yup.string().required('Full name is required'),
    phone: Yup.string().matches(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
      'Invalid phone number'
    ),
    address: Yup.string(),
    latitude: Yup.number().min(-90).max(90),
    longitude: Yup.number().min(-180).max(180),
    organization_name:
      profile.role === 'donor'
        ? Yup.string().required('Organization name is required')
        : Yup.string(),
    transportation_capacity:
      profile.role === 'volunteer'
        ? Yup.number().min(1, 'Must be at least 1')
        : Yup.number(),
  });

  // Initial values
  const initialValues = {
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    address: profile.address || '',
    latitude: profile.latitude || '',
    longitude: profile.longitude || '',
    // Receiver fields
    dietary_preferences: profile.dietary_preferences || [],
    allergies: profile.allergies || [],
    // Donor fields
    organization_name: profile.organization_name || '',
    food_types: profile.food_types || [],
    operating_hours: profile.operating_hours || {},
    // Volunteer fields
    available_time_slots: profile.available_time_slots || [],
    transportation_capacity: profile.transportation_capacity || '',
  };

  // Get current location
  const getCurrentLocation = (setFieldValue) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFieldValue('latitude', position.coords.latitude);
        setFieldValue('longitude', position.coords.longitude);
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location');
        setLocationLoading(false);
      }
    );
  };

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
        Edit Profile
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, setFieldValue, isSubmitting }) => (
          <Form>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  as={TextField}
                  fullWidth
                  name="full_name"
                  label="Full Name"
                  required
                  error={touched.full_name && Boolean(errors.full_name)}
                  helperText={touched.full_name && errors.full_name}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  as={TextField}
                  fullWidth
                  name="phone"
                  label="Phone Number"
                  error={touched.phone && Boolean(errors.phone)}
                  helperText={touched.phone && errors.phone}
                />
              </Grid>

              {/* Location Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Location
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Field
                  as={TextField}
                  fullWidth
                  name="address"
                  label="Address"
                  multiline
                  rows={2}
                  error={touched.address && Boolean(errors.address)}
                  helperText={touched.address && errors.address}
                />
              </Grid>

              <Grid item xs={12} sm={5}>
                <Field
                  as={TextField}
                  fullWidth
                  name="latitude"
                  label="Latitude"
                  type="number"
                  slotProps={{ htmlInput: { step: 'any' } }}
                  error={touched.latitude && Boolean(errors.latitude)}
                  helperText={touched.latitude && errors.latitude}
                />
              </Grid>

              <Grid item xs={12} sm={5}>
                <Field
                  as={TextField}
                  fullWidth
                  name="longitude"
                  label="Longitude"
                  type="number"
                  slotProps={{ htmlInput: { step: 'any' } }}
                  error={touched.longitude && Boolean(errors.longitude)}
                  helperText={touched.longitude && errors.longitude}
                />
              </Grid>

              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => getCurrentLocation(setFieldValue)}
                  disabled={locationLoading}
                  startIcon={<MyLocation />}
                  sx={{ height: '56px' }}
                >
                  {locationLoading ? 'Getting...' : 'Get'}
                </Button>
              </Grid>

              {/* Receiver-specific fields */}
              {profile.role === 'receiver' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Dietary Information
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <ChipArrayField
                      label="Dietary Preferences"
                      values={values.dietary_preferences}
                      onChange={(newValues) =>
                        setFieldValue('dietary_preferences', newValues)
                      }
                      placeholder="e.g., Vegetarian, Vegan, Halal"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <ChipArrayField
                      label="Allergies"
                      values={values.allergies}
                      onChange={(newValues) =>
                        setFieldValue('allergies', newValues)
                      }
                      placeholder="e.g., Peanuts, Dairy, Gluten"
                      color="error"
                    />
                  </Grid>
                </>
              )}

              {/* Donor-specific fields */}
              {profile.role === 'donor' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Organization Information
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      fullWidth
                      name="organization_name"
                      label="Organization Name"
                      required
                      error={
                        touched.organization_name &&
                        Boolean(errors.organization_name)
                      }
                      helperText={
                        touched.organization_name && errors.organization_name
                      }
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <ChipArrayField
                      label="Food Types"
                      values={values.food_types}
                      onChange={(newValues) =>
                        setFieldValue('food_types', newValues)
                      }
                      placeholder="e.g., Indian, Chinese, Italian"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Operating Hours (JSON format)"
                      value={JSON.stringify(values.operating_hours, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setFieldValue('operating_hours', parsed);
                        } catch (err) {
                          // Invalid JSON, don't update
                        }
                      }}
                      multiline
                      rows={4}
                      helperText='Example: {"monday": "9:00-17:00", "tuesday": "9:00-17:00"}'
                    />
                  </Grid>
                </>
              )}

              {/* Volunteer-specific fields */}
              {profile.role === 'volunteer' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Volunteer Information
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <ChipArrayField
                      label="Available Time Slots"
                      values={values.available_time_slots}
                      onChange={(newValues) =>
                        setFieldValue('available_time_slots', newValues)
                      }
                      placeholder="e.g., Weekday Mornings, Weekend Afternoons"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      fullWidth
                      name="transportation_capacity"
                      label="Transportation Capacity (servings)"
                      type="number"
                      slotProps={{ htmlInput: { min: 1 } }}
                      error={
                        touched.transportation_capacity &&
                        Boolean(errors.transportation_capacity)
                      }
                      helperText={
                        touched.transportation_capacity &&
                        errors.transportation_capacity
                      }
                    />
                  </Grid>
                </>
              )}

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'stretch', sm: 'flex-end' }, flexDirection: { xs: 'column-reverse', sm: 'row' }, mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    startIcon={<Cancel />}
                    disabled={isSubmitting}
                    fullWidth={false}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    </Paper>
  );
};

/**
 * ChipArrayField Component
 * Reusable component for managing array of strings as chips
 */
const ChipArrayField = ({ label, values, onChange, placeholder, color = 'default' }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      onChange([...values, inputValue.trim()]);
      setInputValue('');
    }
  };

  const handleDelete = (valueToDelete) => {
    onChange(values.filter((value) => value !== valueToDelete));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          fullWidth
          size="small"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
        />
        <IconButton onClick={handleAdd} color="primary" disabled={!inputValue.trim()}>
          <Add />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {values.map((value, index) => (
          <Chip
            key={index}
            label={value}
            onDelete={() => handleDelete(value)}
            deleteIcon={<Delete />}
            color={color}
            size="small"
          />
        ))}
      </Box>
    </Box>
  );
};

export default ProfileForm;
