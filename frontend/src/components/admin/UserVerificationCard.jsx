import { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Email,
  Phone,
  Business,
  Person,
  CalendarToday,
  Description,
  OpenInNew,
  Category,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

/**
 * UserVerificationCard Component
 * Displays a pending user with approve/reject actions
 */
const UserVerificationCard = ({ user, onVerify, onReject }) => {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleApprove = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      await onVerify(user.id);
    } catch (err) {
      setError(err.message || 'Failed to approve user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = () => {
    setRejectDialogOpen(true);
    setError(null);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await onReject(user.id, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
    } catch (err) {
      setError(err.message || 'Failed to reject user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectCancel = () => {
    setRejectDialogOpen(false);
    setRejectReason('');
    setError(null);
  };

  const getRoleColor = (role) => {
    const colors = {
      donor: 'primary',
      receiver: 'secondary',
      volunteer: 'success',
      admin: 'error',
    };
    return colors[role] || 'default';
  };

  return (
    <>
      <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Header with role chip */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, wordBreak: 'break-word', minWidth: 0 }}>
              {user.full_name || user.username}
            </Typography>
            <Chip
              label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              color={getRoleColor(user.role)}
              size="small"
              sx={{ flexShrink: 0 }}
            />
          </Box>

          {/* User details */}
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Email fontSize="small" color="action" sx={{ flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                  {user.email}
                </Typography>
              </Box>
            </Grid>

            {user.phone && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {user.phone}
                  </Typography>
                </Box>
              </Grid>
            )}

            {user.organization_name && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {user.organization_name}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Registered {user.date_joined ? formatDistanceToNow(new Date(user.date_joined), { addSuffix: true }) : 'Unknown'}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Username: {user.username}
                </Typography>
              </Box>
            </Grid>

            {/* Receiver type */}
            {user.role === 'receiver' && user.receiver_type && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Category fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Type:&nbsp;
                    <Chip
                      label={user.receiver_type.charAt(0).toUpperCase() + user.receiver_type.slice(1)}
                      size="small"
                      color={user.receiver_type === 'individual' ? 'default' : 'info'}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Verification document */}
            {user.verification_document && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description fontSize="small" color="primary" />
                  <Tooltip title="Open verification document">
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNew fontSize="small" />}
                      href={user.verification_document}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}
                    >
                      View Document
                    </Button>
                  </Tooltip>
                </Box>
              </Grid>
            )}

            {/* Flag if doc required but missing */}
            {user.role === 'receiver' &&
              user.receiver_type &&
              user.receiver_type !== 'individual' &&
              !user.verification_document && (
              <Grid item xs={12}>
                <Chip
                  label="⚠ No verification document uploaded"
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              </Grid>
            )}
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Cancel />}
            onClick={handleRejectClick}
            disabled={isProcessing}
            size="small"
          >
            Reject
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={handleApprove}
            disabled={isProcessing}
            size="small"
          >
            Approve
          </Button>
        </CardActions>
      </Card>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={handleRejectCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject User Registration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting {user.full_name || user.username}'s registration.
            This will be sent to the user via email.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Incomplete information, Invalid credentials, etc."
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            disabled={isProcessing}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserVerificationCard;
