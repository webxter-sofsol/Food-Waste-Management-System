import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

/**
 * CancelListingDialog - Confirmation dialog for cancelling a food listing
 * Requires a cancellation reason before confirming.
 */
const CancelListingDialog = ({ open, onClose, onConfirm, listingName, loading = false }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Please provide a cancellation reason.');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          Cancel Food Listing
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Cancelling this listing will notify all receivers who have pending requests. This action
          cannot be undone.
        </Alert>

        {listingName && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Listing: <strong>{listingName}</strong>
          </Typography>
        )}

        <TextField
          label="Cancellation Reason *"
          multiline
          rows={3}
          fullWidth
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError('');
          }}
          error={!!error}
          helperText={error || 'Explain why you are cancelling this listing.'}
          placeholder="e.g., Food has already been distributed, event cancelled..."
          disabled={loading}
          inputProps={{ 'aria-label': 'Cancellation Reason' }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Keep Listing
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={loading || !reason.trim()}
        >
          {loading ? 'Cancelling...' : 'Cancel Listing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelListingDialog;
