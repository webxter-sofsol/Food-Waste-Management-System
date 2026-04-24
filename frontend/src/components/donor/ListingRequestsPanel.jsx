import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Avatar,
  TextField,
  Collapse,
} from '@mui/material';
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { formatDateTime } from '../../utils/helpers';
import { approveRequest, rejectRequest } from '../../services/donorService';

/**
 * ListingRequestsPanel - Shows pending food requests for a listing
 * Allows donor to approve or reject each request.
 */
const ListingRequestsPanel = ({ requests = [], onRequestUpdated, loading = false }) => {
  const [processingId, setProcessingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const handleApprove = async (requestId) => {
    setProcessingId(requestId);
    setActionError('');
    const result = await approveRequest(requestId);
    setProcessingId(null);
    if (result.success) {
      onRequestUpdated?.();
    } else {
      setActionError(result.error);
    }
  };

  const handleRejectOpen = (requestId) => {
    setRejectingId(requestId);
    setRejectReason('');
    setActionError('');
  };

  const handleRejectConfirm = async (requestId) => {
    if (!rejectReason.trim()) return;
    setProcessingId(requestId);
    setActionError('');
    const result = await rejectRequest(requestId, rejectReason.trim());
    setProcessingId(null);
    if (result.success) {
      setRejectingId(null);
      setRejectReason('');
      onRequestUpdated?.();
    } else {
      setActionError(result.error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1, fontStyle: 'italic' }}>
        No pending requests for this listing.
      </Typography>
    );
  }

  return (
    <Box>
      {actionError && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}

      {pendingRequests.map((request, index) => (
        <Box key={request.id}>
          {index > 0 && <Divider sx={{ my: 1 }} />}

          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Box flex={1}>
              {/* Receiver info */}
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'secondary.light' }}>
                  <PersonIcon sx={{ fontSize: 14 }} />
                </Avatar>
                <Typography variant="body2" fontWeight={600}>
                  {request.receiver_name || 'Receiver'}
                </Typography>
                <Chip label="Pending" color="warning" size="small" variant="outlined" />
              </Box>

              {/* Request details */}
              <Typography variant="body2" color="text.secondary">
                Quantity: <strong>{request.requested_quantity} {request.listing_unit || 'servings'}</strong>
              </Typography>

              {request.pickup_time_preference && (
                <Box display="flex" alignItems="center" gap={0.5} mt={0.25}>
                  <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Pickup: {formatDateTime(request.pickup_time_preference)}
                  </Typography>
                </Box>
              )}

              {request.special_instructions && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  Note: {request.special_instructions}
                </Typography>
              )}
            </Box>

            {/* Action buttons */}
            <Box display="flex" gap={0.5} flexShrink={0}>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleApprove(request.id)}
                disabled={processingId === request.id}
                aria-label={`Approve request from ${request.receiver_name}`}
              >
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => handleRejectOpen(request.id)}
                disabled={processingId === request.id}
                aria-label={`Reject request from ${request.receiver_name}`}
              >
                Reject
              </Button>
            </Box>
          </Box>

          {/* Reject reason input */}
          <Collapse in={rejectingId === request.id}>
            <Box mt={1} display="flex" gap={1} alignItems="flex-start">
              <TextField
                size="small"
                label="Rejection reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                fullWidth
                placeholder="e.g., Quantity no longer available"
                disabled={processingId === request.id}
              />
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => handleRejectConfirm(request.id)}
                disabled={!rejectReason.trim() || processingId === request.id}
              >
                Confirm
              </Button>
              <Button
                size="small"
                onClick={() => setRejectingId(null)}
                disabled={processingId === request.id}
              >
                Cancel
              </Button>
            </Box>
          </Collapse>
        </Box>
      ))}
    </Box>
  );
};

export default ListingRequestsPanel;
