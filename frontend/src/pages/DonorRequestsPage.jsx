/**
 * DonorRequestsPage — /donor/requests
 * Shows all food requests across the donor's listings with approve/reject actions.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip,
  CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, IconButton,
  Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Assignment, CheckCircle, Cancel, Refresh, Schedule,
} from '@mui/icons-material';
import donorService from '../services/donorService';
import { formatTimeRemaining } from '../utils/helpers';

// ── helpers ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:   { label: 'Pending',   color: 'warning' },
  approved:  { label: 'Approved',  color: 'success' },
  rejected:  { label: 'Rejected',  color: 'error' },
  cancelled: { label: 'Cancelled', color: 'default' },
};

const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—';

// ── Request card ──────────────────────────────────────────────────────────────
const RequestCard = ({ req, onApprove, onReject }) => {
  const cfg = STATUS_CFG[req.status] ?? { label: req.status, color: 'default' };
  const isPending = req.status === 'pending';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1.5}>
          <Box minWidth={0}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>{req.listing_food_type || `Listing #${req.listing}`}</Typography>
            <Typography variant="caption" color="text.secondary">from {req.receiver_name || 'Receiver'}</Typography>
          </Box>
          <Chip label={cfg.label} color={cfg.color} size="small" sx={{ flexShrink: 0 }} />
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Details */}
        <Box display="flex" flexDirection="column" gap={0.75}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Quantity</Typography>
            <Typography variant="caption" fontWeight={600}>{req.requested_quantity} servings</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Pickup preference</Typography>
            <Typography variant="caption" fontWeight={600}>{fmt(req.pickup_time_preference)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Requested</Typography>
            <Typography variant="caption" fontWeight={600}>{fmt(req.created_at)}</Typography>
          </Box>
          {req.special_instructions && (
            <Box mt={0.5} p={1} bgcolor="#f8fafc" borderRadius={1}>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                "{req.special_instructions}"
              </Typography>
            </Box>
          )}
          {req.rejection_reason && (
            <Box mt={0.5} p={1} bgcolor="#fef2f2" borderRadius={1}>
              <Typography variant="caption" color="error.main">Reason: {req.rejection_reason}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>

      {isPending && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 1 }}>
            <Button
              size="small" variant="contained" color="success" fullWidth
              startIcon={<CheckCircle />} onClick={() => onApprove(req)}
            >
              Approve
            </Button>
            <Button
              size="small" variant="outlined" color="error" fullWidth
              startIcon={<Cancel />} onClick={() => onReject(req)}
            >
              Reject
            </Button>
          </Box>
        </>
      )}
    </Card>
  );
};

// ── Reject dialog ─────────────────────────────────────────────────────────────
const RejectDialog = ({ open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  const handleConfirm = () => { onConfirm(reason); setReason(''); };
  const handleClose = () => { onClose(); setReason(''); };
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reject Request</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus fullWidth multiline rows={3}
          label="Reason (optional)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Let the receiver know why you're rejecting this request…"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleConfirm} disabled={loading}>
          {loading ? <CircularProgress size={18} /> : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const DonorRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('all');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const res = await donorService.getAllDonorRequests();
    if (res.success) setRequests(res.data); else setError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab);

  const counts = requests.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  const handleApprove = async (req) => {
    setActionLoading(true);
    const res = await donorService.approveRequest(req.id);
    setActionLoading(false);
    if (res.success) { setSuccess('Request approved and match created!'); load(); }
    else setError(res.error);
  };

  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return;
    setActionLoading(true);
    const res = await donorService.rejectRequest(rejectTarget.id, reason);
    setActionLoading(false);
    setRejectTarget(null);
    if (res.success) { setSuccess('Request rejected.'); load(); }
    else setError(res.error);
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar sx={{ bgcolor: '#fff7ed', color: 'warning.main', width: 44, height: 44 }}>
            <Assignment />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>Requests</Typography>
            <Typography variant="body2" color="text.secondary">Food requests from receivers</Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh"><IconButton size="small" onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={`All (${requests.length})`} value="all" />
          <Tab label={`Pending (${counts.pending || 0})`} value="pending" />
          <Tab label={`Approved (${counts.approved || 0})`} value="approved" />
          <Tab label={`Rejected (${counts.rejected || 0})`} value="rejected" />
        </Tabs>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Assignment sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No {tab === 'all' ? '' : tab} requests</Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {filtered.map(req => (
            <Grid item xs={12} sm={6} lg={4} key={req.id}>
              <RequestCard req={req} onApprove={handleApprove} onReject={setRejectTarget} />
            </Grid>
          ))}
        </Grid>
      )}

      <RejectDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        loading={actionLoading}
      />
    </Container>
  );
};

export default DonorRequestsPage;
