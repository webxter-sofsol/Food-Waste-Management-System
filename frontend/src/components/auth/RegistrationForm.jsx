import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

// Validation schema
const registrationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  role: Yup.string()
    .oneOf(['donor', 'receiver', 'volunteer'], 'Please select a valid role')
    .required('Role is required'),
  fullName: Yup.string()
    .min(2, 'Full name must be at least 2 characters')
    .required('Full name is required'),
  phone: Yup.string()
    .matches(/^\+?[\d\s-()]+$/, 'Invalid phone number format')
    .required('Phone number is required'),
  address: Yup.string()
    .min(10, 'Address must be at least 10 characters')
    .required('Address is required'),
});

const RegistrationForm = ({ onSuccess }) => {
  const { register, isLoading, error, clearError } = useAuth();

  const initialValues = {
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    fullName: '',
    phone: '',
    address: '',
  };

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    clearError();
    
    try {
      // Map frontend field names to what the backend expects
      const registrationData = {
        email: values.email,
        username: values.email, // use email as username
        password: values.password,
        password_confirm: values.confirmPassword,
        role: values.role,
        full_name: values.fullName, // passed to profile creation
      };
      const result = await register(registrationData);
      
      if (result.success) {
        onSuccess && onSuccess();
      } else {
        // Handle field-specific errors
        if (result.error && typeof result.error === 'object') {
          Object.keys(result.error).forEach(field => {
            setFieldError(field, result.error[field][0]);
          });
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'donor':
        return 'Restaurants, hotels, banquet halls donating surplus food';
      case 'receiver':
        return 'Individuals, orphanages, shelters, NGOs receiving food';
      case 'volunteer':
        return 'Volunteers coordinating food pickup and delivery';
      default:
        return '';
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Formik
        initialValues={initialValues}
        validationSchema={registrationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
          <Form>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Full Name */}
                <TextField
                  name="fullName"
                  label="Full Name"
                  value={values.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.fullName && Boolean(errors.fullName)}
                  helperText={touched.fullName && errors.fullName}
                  fullWidth
                  required
                />

                {/* Email */}
                <TextField
                  name="email"
                  label="Email Address"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  fullWidth
                  required
                />

                {/* Phone */}
                <TextField
                  name="phone"
                  label="Phone Number"
                  value={values.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.phone && Boolean(errors.phone)}
                  helperText={touched.phone && errors.phone}
                  fullWidth
                  required
                />

                {/* Address */}
                <TextField
                  name="address"
                  label="Address"
                  multiline
                  rows={2}
                  value={values.address}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.address && Boolean(errors.address)}
                  helperText={touched.address && errors.address}
                  fullWidth
                  required
                />

                {/* Role Selection */}
                <FormControl 
                  fullWidth 
                  error={touched.role && Boolean(errors.role)}
                  required
                >
                  <InputLabel>Role</InputLabel>
                  <Select
                    name="role"
                    value={values.role}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    label="Role"
                  >
                    <MenuItem value="donor">Donor</MenuItem>
                    <MenuItem value="receiver">Receiver</MenuItem>
                    <MenuItem value="volunteer">Volunteer</MenuItem>
                  </Select>
                  {touched.role && errors.role && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.role}
                    </Typography>
                  )}
                  {values.role && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                      {getRoleDescription(values.role)}
                    </Typography>
                  )}
                </FormControl>

                {/* Password */}
                <TextField
                  name="password"
                  label="Password"
                  type="password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  fullWidth
                  required
                />

                {/* Confirm Password */}
                <TextField
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                  helperText={touched.confirmPassword && errors.confirmPassword}
                  fullWidth
                  required
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting || isLoading}
                  sx={{ mt: 2, py: 1.5 }}
                  fullWidth
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Box>
            </Form>
          )}
        </Formik>
    </Box>
  );
};

export default RegistrationForm;