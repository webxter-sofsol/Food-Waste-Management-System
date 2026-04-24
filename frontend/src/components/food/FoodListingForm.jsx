import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress,
  Container, Divider, FormControl, FormControlLabel, FormGroup,
  Grid, IconButton, InputLabel, LinearProgress,
  MenuItem, Select, Snackbar, TextField, Typography,
} from '@mui/material';
import {
  ArrowBack, CheckCircle, CloudUpload, Delete, GpsFixed,
  Restaurant, Schedule, Spa, NoMeals, LocalDining,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addHours, isAfter } from 'date-fns';
import foodListingService from '../../services/foodListingService';

const schema = Yup.object({
  food_type: Yup.string().required('Required').min(2, 'At least 2 characters'),
  description: Yup.string().required('Required').min(10, 'At least 10 characters').max(500),
  quantity: Yup.number().required('Required').positive('Must be positive').integer('Whole number'),
  unit: Yup.string().required('Required').oneOf(['servings', 'kg', 'liters']),
  preparation_time: Yup.date().required('Required').max(new Date(), 'Cannot be in the future'),
  expiry_time: Yup.date()
    .required('Required')
    .min(new Date(), 'Must be in the future')
    .test('after-prep', 'Must be after preparation time', function (v) {
      return !this.parent.preparation_time || !v || isAfter(v, this.parent.preparation_time);
    }),
  pickup_address: Yup.string().required('Required').min(10, 'Provide a complete address'),
  pickup_latitude: Yup.number().required('Required').min(-90).max(90),
  pickup_longitude: Yup.number().required('Required').min(-180).max(180),
});

const Section = ({ emoji, title, children }) => (
  <Card sx={{ mb: 3, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
    <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Box display='flex' alignItems='center' gap={1.25} mb={2.5}>
        <Box sx={{ fontSize: '1.25rem' }}>{emoji}</Box>
        <Typography variant='subtitle1' fontWeight={700}>{title}</Typography>
      </Box>
      {children}
    </CardContent>
  </Card>
);

const FreshnessBar = ({ score }) => {
  const color = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error';
  const label = score >= 70 ? 'Very Fresh' : score >= 40 ? 'Moderately Fresh' : 'Low Freshness';
  return (
    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
        <Box display='flex' alignItems='center' gap={0.75}>
          <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant='body2' fontWeight={600}>Freshness Score</Typography>
        </Box>
        <Chip label={label} color={color} size='small' />
      </Box>
      <LinearProgress variant='determinate' value={score} color={color} sx={{ height: 8, borderRadius: 99, mb: 0.75 }} />
      <Box display='flex' justifyContent='space-between'>
        <Typography variant='caption' color='text.secondary'>0 — Expired</Typography>
        <Typography variant='caption' fontWeight={700} color={color + '.main'}>{Math.round(score)}/100</Typography>
        <Typography variant='caption' color='text.secondary'>100 — Very Fresh</Typography>
      </Box>
    </Box>
  );
};

const PreviewCard = ({ values, freshnessScore, imagePreviewUrls }) => {
  const hasContent = values.food_type || values.description || values.quantity;
  if (!hasContent) return (
    <Box sx={{ p: 4, textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: 3 }}>
      <Restaurant sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
      <Typography variant='body2' color='text.secondary'>Your listing preview will appear here</Typography>
    </Box>
  );
  const fc = freshnessScore >= 70 ? 'success' : freshnessScore >= 40 ? 'warning' : 'error';
  return (
    <Card sx={{ border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {imagePreviewUrls.length > 0 ? (
        <Box component='img' src={imagePreviewUrls[0]} alt='preview' sx={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
      ) : (
        <Box sx={{ height: 100, bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ fontSize: '2.5rem' }}>🍽️</Box>
        </Box>
      )}
      <CardContent sx={{ p: 2 }}>
        <Typography variant='subtitle2' fontWeight={700} gutterBottom noWrap>{values.food_type || 'Food Type'}</Typography>
        {values.description && (
          <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {values.description}
          </Typography>
        )}
        <Box display='flex' gap={0.75} flexWrap='wrap' my={1}>
          {values.quantity && <Chip label={values.quantity + ' ' + values.unit} size='small' variant='outlined' />}
          {values.is_vegetarian && <Chip label='🌿 Vegetarian' color='success' size='small' />}
          {values.is_vegan && <Chip label='🌱 Vegan' color='success' size='small' />}
          {values.is_gluten_free && <Chip label='🚫 Gluten-Free' color='info' size='small' />}
        </Box>
        <Box>
          <Box display='flex' justifyContent='space-between' mb={0.5}>
            <Typography variant='caption' color='text.secondary'>Freshness</Typography>
            <Typography variant='caption' fontWeight={700} color={fc + '.main'}>{Math.round(freshnessScore)}/100</Typography>
          </Box>
          <LinearProgress variant='determinate' value={freshnessScore} color={fc} sx={{ height: 5, borderRadius: 99 }} />
        </Box>
        {values.pickup_address && (
          <Typography variant='caption' color='text.secondary' noWrap sx={{ display: 'block', mt: 1 }}>📍 {values.pickup_address}</Typography>
        )}
      </CardContent>
    </Card>
  );
};

const ALLERGENS = [
  { key: 'contains_nuts', label: 'Nuts' },
  { key: 'contains_dairy', label: 'Dairy' },
  { key: 'contains_eggs', label: 'Eggs' },
  { key: 'contains_soy', label: 'Soy' },
  { key: 'contains_shellfish', label: 'Shellfish' },
];

const FoodListingForm = ({ listing = null }) => {
  const isEdit = !!listing;
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [freshnessScore, setFreshnessScore] = useState(75);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const parseAllergens = (raw) => {
    if (!raw) return { contains_nuts: false, contains_dairy: false, contains_eggs: false, contains_soy: false, contains_shellfish: false, other_allergens: '' };
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { contains_nuts: false, contains_dairy: false, contains_eggs: false, contains_soy: false, contains_shellfish: false, other_allergens: '' }; }
  };

  const initialValues = listing ? {
    food_type: listing.food_type || '',
    description: listing.description || '',
    quantity: listing.quantity || '',
    unit: listing.unit || 'servings',
    preparation_time: listing.preparation_time ? new Date(listing.preparation_time) : new Date(),
    expiry_time: listing.expiry_time ? new Date(listing.expiry_time) : addHours(new Date(), 6),
    pickup_address: listing.pickup_address || '',
    pickup_latitude: listing.pickup_latitude || '',
    pickup_longitude: listing.pickup_longitude || '',
    is_vegetarian: listing.is_vegetarian || false,
    is_vegan: listing.is_vegan || false,
    is_gluten_free: listing.is_gluten_free || false,
    allergen_info: parseAllergens(listing.allergen_info),
  } : {
    food_type: '', description: '', quantity: '', unit: 'servings',
    preparation_time: new Date(), expiry_time: addHours(new Date(), 6),
    pickup_address: '', pickup_latitude: '', pickup_longitude: '',
    is_vegetarian: false, is_vegan: false, is_gluten_free: false,
    allergen_info: { contains_nuts: false, contains_dairy: false, contains_eggs: false, contains_soy: false, contains_shellfish: false, other_allergens: '' },
  };

  const updateFreshness = useCallback((prep, exp) => {
    setFreshnessScore(foodListingService.calculateFreshnessScore(prep, exp));
  }, []);

  const handleImageUpload = useCallback((files) => {
    const arr = Array.from(files);
    if (images.length + arr.length > 5) { alert('Maximum 5 images'); return; }
    const valid = arr.filter(f => {
      if (!f.type.startsWith('image/')) { alert(f.name + ' is not an image'); return false; }
      if (f.size > 5 * 1024 * 1024) { alert(f.name + ' exceeds 5 MB'); return false; }
      return true;
    });
    if (!valid.length) return;
    setImages(p => [...p, ...valid]);
    setImagePreviewUrls(p => [...p, ...valid.map(f => URL.createObjectURL(f))]);
  }, [images.length]);

  const removeImage = useCallback((i) => {
    URL.revokeObjectURL(imagePreviewUrls[i]);
    setImages(p => p.filter((_, idx) => idx !== i));
    setImagePreviewUrls(p => p.filter((_, idx) => idx !== i));
  }, [imagePreviewUrls]);

  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files);
  }, [handleImageUpload]);

  const getLocation = useCallback((setFieldValue) => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setFieldValue('pickup_latitude', coords.latitude); setFieldValue('pickup_longitude', coords.longitude); },
      () => alert('Unable to get location.')
    );
  }, []);

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    setSubmitError('');
    try {
      const data = {
        ...values,
        preparation_time: format(values.preparation_time, "yyyy-MM-dd'T'HH:mm:ss"),
        expiry_time: format(values.expiry_time, "yyyy-MM-dd'T'HH:mm:ss"),
        allergen_info: JSON.stringify(values.allergen_info),
      };
      if (isEdit) {
        await foodListingService.updateListing(listing.id, data);
      } else {
        await foodListingService.createListing(data, images);
      }
      setSubmitSuccess(true);
      setTimeout(() => navigate('/donor/listings'), 2000);
    } catch (err) {
      if (err.response?.data) {
        Object.entries(err.response.data).forEach(([k, v]) => setFieldError(k, Array.isArray(v) ? v[0] : v));
      } else {
        setSubmitError('Failed to create listing. Please try again.');
      }
    } finally { setSubmitting(false); }
  };

  useEffect(() => () => imagePreviewUrls.forEach(u => URL.revokeObjectURL(u)), []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100%' }}>
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e2e8f0', px: { xs: 2, sm: 4 }, py: 2.5 }}>
          <Box display='flex' alignItems='center' gap={2}>
            <IconButton size='small' onClick={() => navigate('/donor/dashboard')} sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <ArrowBack fontSize='small' />
            </IconButton>
            <Box>
              <Typography variant='h5' fontWeight={800}>{isEdit ? 'Edit Listing' : 'Create Food Listing'}</Typography>
              <Typography variant='body2' color='text.secondary'>{isEdit ? 'Update your food listing details' : 'Share your surplus food with those in need'}</Typography>
            </Box>
          </Box>
        </Box>

        <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
          <Formik initialValues={initialValues} validationSchema={schema} onSubmit={handleSubmit}>
            {({ values, errors, touched, setFieldValue, isSubmitting }) => {
              useEffect(() => { updateFreshness(values.preparation_time, values.expiry_time); }, [values.preparation_time, values.expiry_time]);
              return (
                <Form>
                  <Grid container spacing={3}>
                    <Grid item xs={12} lg={8}>

                      <Section emoji='🍽️' title='Basic Information'>
                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={6}>
                            <Field name='food_type'>{({ field, meta }) => (
                              <TextField {...field} label='Food Type *' fullWidth placeholder='e.g. Vegetable Curry, Sandwiches'
                                error={meta.touched && !!meta.error} helperText={meta.touched && meta.error} />
                            )}</Field>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Field name='quantity'>{({ field, meta }) => (
                              <TextField {...field} label='Quantity *' type='number' fullWidth
                                error={meta.touched && !!meta.error} helperText={meta.touched && meta.error} />
                            )}</Field>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Field name='unit'>{({ field, meta }) => (
                              <FormControl fullWidth error={meta.touched && !!meta.error}>
                                <InputLabel>Unit *</InputLabel>
                                <Select {...field} label='Unit *'>
                                  <MenuItem value='servings'>🍽 Servings</MenuItem>
                                  <MenuItem value='kg'>⚖️ Kilograms</MenuItem>
                                  <MenuItem value='liters'>🥤 Liters</MenuItem>
                                </Select>
                              </FormControl>
                            )}</Field>
                          </Grid>
                          <Grid item xs={12}>
                            <Field name='description'>{({ field, meta }) => (
                              <TextField {...field} label='Description *' multiline rows={3} fullWidth
                                placeholder='Describe the food, ingredients, preparation method…'
                                error={meta.touched && !!meta.error}
                                helperText={(meta.touched && meta.error) || (field.value.length + '/500')} />
                            )}</Field>
                          </Grid>
                        </Grid>
                      </Section>

                      <Section emoji='⏰' title='Time Information'>
                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={6}>
                            <DateTimePicker label='Preparation Time *' value={values.preparation_time}
                              onChange={v => setFieldValue('preparation_time', v)} maxDateTime={new Date()}
                              slotProps={{ textField: { fullWidth: true, error: touched.preparation_time && !!errors.preparation_time, helperText: touched.preparation_time && errors.preparation_time } }} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DateTimePicker label='Expiry Time *' value={values.expiry_time}
                              onChange={v => setFieldValue('expiry_time', v)} minDateTime={new Date()}
                              slotProps={{ textField: { fullWidth: true, error: touched.expiry_time && !!errors.expiry_time, helperText: touched.expiry_time && errors.expiry_time } }} />
                          </Grid>
                          <Grid item xs={12}><FreshnessBar score={freshnessScore} /></Grid>
                        </Grid>
                      </Section>

                      <Section emoji='📍' title='Pickup Location'>
                        <Grid container spacing={2.5}>
                          <Grid item xs={12}>
                            <Field name='pickup_address'>{({ field, meta }) => (
                              <TextField {...field} label='Pickup Address *' fullWidth
                                placeholder='Full address where food can be collected'
                                error={meta.touched && !!meta.error} helperText={meta.touched && meta.error} />
                            )}</Field>
                          </Grid>
                          <Grid item xs={12} sm={5}>
                            <Field name='pickup_latitude'>{({ field, meta }) => (
                              <TextField {...field} label='Latitude *' type='number' fullWidth
                                slotProps={{ htmlInput: { step: 'any' } }}
                                error={meta.touched && !!meta.error} helperText={meta.touched && meta.error} />
                            )}</Field>
                          </Grid>
                          <Grid item xs={12} sm={5}>
                            <Field name='pickup_longitude'>{({ field, meta }) => (
                              <TextField {...field} label='Longitude *' type='number' fullWidth
                                slotProps={{ htmlInput: { step: 'any' } }}
                                error={meta.touched && !!meta.error} helperText={meta.touched && meta.error} />
                            )}</Field>
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <Button variant='outlined' fullWidth onClick={() => getLocation(setFieldValue)}
                              startIcon={<GpsFixed />} sx={{ height: 40 }}>Locate</Button>
                          </Grid>
                        </Grid>
                      </Section>

                      <Section emoji='🥗' title='Dietary Info'>
                        <Typography variant='body2' color='text.secondary' mb={2}>Help receivers find food that suits their needs.</Typography>
                        <Typography variant='caption' fontWeight={600} color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, display: 'block' }}>Dietary Attributes</Typography>
                        <Box display='flex' gap={1} flexWrap='wrap' mb={2.5}>
                          {[
                            { key: 'is_vegetarian', label: '🌿 Vegetarian', color: 'success' },
                            { key: 'is_vegan', label: '🌱 Vegan', color: 'success' },
                            { key: 'is_gluten_free', label: '🚫 Gluten-Free', color: 'info' },
                          ].map(({ key, label, color }) => (
                            <Chip key={key} label={label}
                              onClick={() => setFieldValue(key, !values[key])}
                              color={values[key] ? color : 'default'}
                              variant={values[key] ? 'filled' : 'outlined'}
                              sx={{ cursor: 'pointer', fontWeight: values[key] ? 700 : 400 }} />
                          ))}
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant='caption' fontWeight={600} color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, display: 'block' }}>Contains Allergens</Typography>
                        <Box display='flex' gap={1} flexWrap='wrap' mb={2}>
                          {ALLERGENS.map(({ key, label }) => (
                            <Chip key={key} label={'⚠️ ' + label}
                              onClick={() => setFieldValue('allergen_info.' + key, !values.allergen_info[key])}
                              color={values.allergen_info[key] ? 'warning' : 'default'}
                              variant={values.allergen_info[key] ? 'filled' : 'outlined'}
                              sx={{ cursor: 'pointer', fontWeight: values.allergen_info[key] ? 700 : 400 }} />
                          ))}
                        </Box>
                        <TextField label='Other allergens (optional)' value={values.allergen_info.other_allergens}
                          onChange={e => setFieldValue('allergen_info.other_allergens', e.target.value)}
                          fullWidth placeholder='e.g. Sesame, Mustard' />
                      </Section>

                      <Section emoji='📸' title='Photos (Optional — up to 5)'>
                        <Box onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                          onClick={() => document.getElementById('img-upload').click()}
                          sx={{ border: '2px dashed', borderColor: dragActive ? 'primary.main' : '#e2e8f0', borderRadius: 3, p: 4, textAlign: 'center', cursor: 'pointer', bgcolor: dragActive ? '#f0fdf4' : '#f8fafc', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', bgcolor: '#f0fdf4' } }}>
                          <CloudUpload sx={{ fontSize: 36, color: dragActive ? 'primary.main' : 'text.disabled', mb: 1 }} />
                          <Typography variant='body2' fontWeight={600} gutterBottom>{dragActive ? 'Drop here' : 'Drag and drop or click to upload'}</Typography>
                          <Typography variant='caption' color='text.secondary'>JPG, PNG — max 5 MB each — {images.length}/5 uploaded</Typography>
                          <input id='img-upload' type='file' multiple accept='image/*' style={{ display: 'none' }} onChange={e => handleImageUpload(e.target.files)} />
                        </Box>
                        {imagePreviewUrls.length > 0 && (
                          <Grid container spacing={1.5} sx={{ mt: 2 }}>
                            {imagePreviewUrls.map((url, i) => (
                              <Grid item xs={6} sm={4} md={3} key={i}>
                                <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                  <Box component='img' src={url} alt={'img' + i} sx={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                                  {i === 0 && <Box sx={{ position: 'absolute', top: 6, left: 6, bgcolor: 'primary.main', color: 'white', borderRadius: 1, px: 0.75, py: 0.25 }}><Typography sx={{ fontSize: '0.6rem', fontWeight: 700 }}>COVER</Typography></Box>}
                                  <IconButton size='small' onClick={() => removeImage(i)}
                                    sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.55)', color: 'white', width: 24, height: 24, '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                                    <Delete sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Section>

                      {submitError && <Alert severity='error' sx={{ mb: 3 }} onClose={() => setSubmitError('')}>{submitError}</Alert>}

                      <Box display='flex' gap={2} justifyContent='flex-end' pb={4}>
                        <Button variant='outlined' onClick={() => navigate('/donor/dashboard')} disabled={isSubmitting}>Cancel</Button>
                        <Button type='submit' variant='contained' size='large' disabled={isSubmitting}
                          startIcon={isSubmitting ? <CircularProgress size={18} color='inherit' /> : <CheckCircle />} sx={{ px: 4 }}>
                          {isSubmitting ? (isEdit ? 'Saving…' : 'Publishing…') : (isEdit ? 'Save Changes' : 'Publish Listing')}
                        </Button>
                      </Box>
                    </Grid>

                    <Grid item xs={12} lg={4}>
                      <Box sx={{ position: { lg: 'sticky' }, top: { lg: 24 } }}>
                        <Card sx={{ mb: 2, border: '1px solid #f1f5f9' }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Typography variant='subtitle2' fontWeight={700} mb={2}>Live Preview</Typography>
                            <PreviewCard values={values} freshnessScore={freshnessScore} imagePreviewUrls={imagePreviewUrls} />
                          </CardContent>
                        </Card>
                        <Card sx={{ border: '1px solid #bbf7d0', bgcolor: '#f0fdf4' }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Typography variant='subtitle2' fontWeight={700} mb={1.5}>💡 Tips</Typography>
                            {['Use a clear, descriptive food name', 'Photos get 3x more requests', 'Set accurate expiry time for a better freshness score', 'Mark dietary attributes so receivers can filter', 'Provide a precise pickup address'].map((tip, i) => (
                              <Box key={i} display='flex' gap={1} mb={1}>
                                <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1 }}>
                                  <Typography sx={{ color: 'white', fontSize: '0.6rem', fontWeight: 800 }}>{i + 1}</Typography>
                                </Box>
                                <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.5 }}>{tip}</Typography>
                              </Box>
                            ))}
                          </CardContent>
                        </Card>
                      </Box>
                    </Grid>
                  </Grid>
                </Form>
              );
            }}
          </Formik>
        </Container>
      </Box>
      <Snackbar open={submitSuccess} autoHideDuration={4000} onClose={() => setSubmitSuccess(false)}>
        <Alert severity='success' onClose={() => setSubmitSuccess(false)}>{isEdit ? 'Listing updated!' : 'Listing published!'} Redirecting…</Alert>
      </Snackbar>
    </LocalizationProvider>
  );
};

export default FoodListingForm;

