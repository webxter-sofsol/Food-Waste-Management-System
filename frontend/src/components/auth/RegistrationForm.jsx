import { useState, useRef } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl,
  FormHelperText, IconButton, InputLabel, MenuItem, Select,
  TextField, Tooltip, Typography,
} from '@mui/material';
import {
  CloudUpload, Delete, Info, UploadFile,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

// ── Receiver type config ───────────────────────────────────────────────────────
const RECEIVER_TYPES = [
  { value: 'individual', label: 'Individual', emoji: '👤', requiresDoc: false, description: 'Personal use — no document needed' },
  { value: 'ngo',        label: 'NGO',        emoji: '🏢', requiresDoc: true,  description: 'Non-governmental organisation' },
  { value: 'shelter',    label: 'Shelter',    emoji: '🏠', requiresDoc: true,  description: 'Homeless or women\'s shelter' },
  { value: 'orphanage',  label: 'Orphanage',  emoji: '🧒', requiresDoc: true,  description: 'Children\'s home or orphanage' },
];

const ACCEPTED_DOC_TYPES = '.pdf,.jpg,.jpeg,.png';
const MAX_DOC_SIZE_MB = 5;

// ── Validation schema ──────────────────────────────────────────────────────────
const buildSchema = (role, receiverType) =>
  Yup.object().shape({
    email: Yup.string().email('Invalid email format').required('Email is required'),
    password: Yup.string()
      .min(8, 'At least 8 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Must contain uppercase, lowercase, number, and special character'
      )
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Please confirm your password'),
    role: Yup.string()
      .oneOf(['donor', 'receiver', 'volunteer'], 'Please select a valid role')
      .required('Role is required'),
    fullName: Yup.string().min(2, 'At least 2 characters').required('Full name is required'),
    phone: Yup.string()
      .matches(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
      .required('Phone number is required'),
    address: Yup.string().min(10, 'At least 10 characters').required('Address is required'),
    ...(role === 'receiver' && {
      receiver_type: Yup.string()
        .oneOf(['individual', 'ngo', 'shelter', 'orphanage'])
        .required('Please select your organisation type'),
    }),
  });

// ── Role descriptions ──────────────────────────────────────────────────────────
const ROLE_DESCRIPTIONS = {
  donor:     'Restaurants, hotels, banquet halls donating surplus food',
  receiver:  'Individuals, orphanages, shelters, NGOs receiving food',
  volunteer: 'Volunteers coordinating food pickup and delivery',
};

// ── Document upload widget ─────────────────────────────────────────────────────
const DocumentUpload = ({ file, onFileChange, onFileRemove, error }) => {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      alert(`File must be under ${MAX_DOC_SIZE_MB} MB`);
      return;
    }
    onFileChange(f);
  };

  return (
    <Box>
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          border: `2px dashed ${error ? '#ef4444' : '#e2e8f0'}`,
          borderRadius: 2,
          p: 2.5,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: file ? '#f0fdf4' : '#f8fafc',
          transition: 'all 0.2s',
          '&:hover': { borderColor: 'primary.main', bgcolor: '#f0fdf4' },
        }}
      >
        {file ? (
          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
            <UploadFile color="success" />
            <Typography variant="body2" fontWeight={600} color="success.main" noWrap sx={{ maxWidth: 220 }}>
              {file.name}
            </Typography>
            <IconButton
              size="small"
              color="error"
              onClick={(e) => { e.stopPropagation(); onFileRemove(); }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <>
            <CloudUpload sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
            <Typography variant="body2" fontWeight={600}>Click to upload verification document</Typography>
            <Typography variant="caption" color="text.secondary">
              PDF, JPG, PNG — max {MAX_DOC_SIZE_MB} MB
            </Typography>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_DOC_TYPES}
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </Box>
      {error && (
        <FormHelperText error sx={{ ml: 1.5 }}>{error}</FormHelperText>
      )}
    </Box>
  );
};

// ── Main form ──────────────────────────────────────────────────────────────────
const RegistrationForm = ({ onSuccess }) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [verificationDoc, setVerificationDoc] = useState(null);
  const [docError, setDocError] = useState('');

  const initialValues = {
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    fullName: '',
    phone: '',
    address: '',
    receiver_type: '',
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    clearError();
    setDocError('');

    // Validate document requirement
    const selectedType = RECEIVER_TYPES.find(t => t.value === values.receiver_type);
    if (values.role === 'receiver' && selectedType?.requiresDoc && !verificationDoc) {
      setDocError('Verification document is required for this organisation type');
      setSubmitting(false);
      return;
    }

    const registrationData = {
      email: values.email,
      username: values.email,
      password: values.password,
      password_confirm: values.confirmPassword,
      role: values.role,
      full_name: values.fullName,
      ...(values.role === 'receiver' && { receiver_type: values.receiver_type || 'individual' }),
    };

    const result = await register(registrationData, verificationDoc);

    setSubmitting(false);
    if (result.success) {
      onSuccess && onSuccess();
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Formik
        initialValues={initialValues}
        validationSchema={buildSchema}
        validate={(values) => {
          try {
            buildSchema(values.role, values.receiver_type).validateSync(values, { abortEarly: false });
          } catch (err) {
            return err.inner.reduce((acc, e) => ({ ...acc, [e.path]: e.message }), {});
          }
          return {};
        }}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => {
          const selectedReceiverType = RECEIVER_TYPES.find(t => t.value === values.receiver_type);
          const needsDoc = values.role === 'receiver' && selectedReceiverType?.requiresDoc;

          return (
            <Form>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Full Name */}
                <TextField
                  name="fullName" label="Full Name" value={values.fullName}
                  onChange={handleChange} onBlur={handleBlur} fullWidth required
                  error={touched.fullName && Boolean(errors.fullName)}
                  helperText={touched.fullName && errors.fullName}
                />

                {/* Email */}
                <TextField
                  name="email" label="Email Address" type="email" value={values.email}
                  onChange={handleChange} onBlur={handleBlur} fullWidth required
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                />

                {/* Phone */}
                <TextField
                  name="phone" label="Phone Number" value={values.phone}
                  onChange={handleChange} onBlur={handleBlur} fullWidth required
                  error={touched.phone && Boolean(errors.phone)}
                  helperText={touched.phone && errors.phone}
                />

                {/* Address */}
                <TextField
                  name="address" label="Address" multiline rows={2} value={values.address}
                  onChange={handleChange} onBlur={handleBlur} fullWidth required
                  error={touched.address && Boolean(errors.address)}
                  helperText={touched.address && errors.address}
                />

                {/* Role */}
                <FormControl fullWidth required error={touched.role && Boolean(errors.role)}>
                  <InputLabel>Role</InputLabel>
                  <Select name="role" value={values.role} onChange={handleChange} onBlur={handleBlur} label="Role">
                    <MenuItem value="donor">🍽️ Donor</MenuItem>
                    <MenuItem value="receiver">🤲 Receiver</MenuItem>
                    <MenuItem value="volunteer">🚚 Volunteer</MenuItem>
                  </Select>
                  {touched.role && errors.role && <FormHelperText>{errors.role}</FormHelperText>}
                  {values.role && (
                    <FormHelperText sx={{ color: 'text.secondary' }}>
                      {ROLE_DESCRIPTIONS[values.role]}
                    </FormHelperText>
                  )}
                </FormControl>

                {/* ── Receiver-only: organisation type ── */}
                {values.role === 'receiver' && (
                  <Box
                    sx={{
                      p: 2, borderRadius: 2,
                      border: '1px solid #e2e8f0',
                      bgcolor: '#f8fafc',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.75} mb={1.5}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Organisation Type
                      </Typography>
                      <Tooltip title="Select the type that best describes you. NGOs, Shelters, and Orphanages must upload a verification document so the admin can confirm your identity.">
                        <Info sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                      </Tooltip>
                    </Box>

                    {/* Type selector chips */}
                    <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                      {RECEIVER_TYPES.map((t) => (
                        <Chip
                          key={t.value}
                          label={`${t.emoji} ${t.label}`}
                          onClick={() => handleChange({ target: { name: 'receiver_type', value: t.value } })}
                          color={values.receiver_type === t.value ? 'primary' : 'default'}
                          variant={values.receiver_type === t.value ? 'filled' : 'outlined'}
                          sx={{ cursor: 'pointer', fontWeight: values.receiver_type === t.value ? 700 : 400 }}
                        />
                      ))}
                    </Box>

                    {touched.receiver_type && errors.receiver_type && (
                      <FormHelperText error sx={{ mb: 1 }}>{errors.receiver_type}</FormHelperText>
                    )}

                    {/* Description of selected type */}
                    {selectedReceiverType && (
                      <Typography variant="caption" color="text.secondary" display="block" mb={needsDoc ? 1.5 : 0}>
                        {selectedReceiverType.description}
                      </Typography>
                    )}

                    {/* Document upload — only for non-individual types */}
                    {needsDoc && (
                      <Box>
                        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                          <Typography variant="body2" fontWeight={600}>
                            Verification Document
                          </Typography>
                          <Typography variant="caption" color="error.main">*</Typography>
                          <Typography variant="caption" color="text.secondary">
                            — e.g. registration certificate, NGO licence
                          </Typography>
                        </Box>
                        <DocumentUpload
                          file={verificationDoc}
                          onFileChange={(f) => { setVerificationDoc(f); setDocError(''); }}
                          onFileRemove={() => setVerificationDoc(null)}
                          error={docError}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {/* Password */}
                <TextField
                  name="password" label="Password" type="password" value={values.password}
                  onChange={handleChange} onBlur={handleBlur} fullWidth required
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                />

                {/* Confirm Password */}
                <TextField
                  name="confirmPassword" label="Confirm Password" type="password" value={values.confirmPassword}
                  onChange={handleChange} onBlur={handleBlur} fullWidth required
                  error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                  helperText={touched.confirmPassword && errors.confirmPassword}
                />

                {/* Submit */}
                <Button
                  type="submit" variant="contained" size="large" fullWidth
                  disabled={isSubmitting || isLoading}
                  sx={{ mt: 1, py: 1.5 }}
                >
                  {isSubmitting || isLoading ? (
                    <><CircularProgress size={20} sx={{ mr: 1 }} />Creating Account…</>
                  ) : 'Create Account'}
                </Button>
              </Box>
            </Form>
          );
        }}
      </Formik>
    </Box>
  );
};

export default RegistrationForm;
