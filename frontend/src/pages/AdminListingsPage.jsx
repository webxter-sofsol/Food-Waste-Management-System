import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, LinearProgress, Paper, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { CheckCircle, Cancel, OpenInNew, Refresh, Restaurant } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import adminService from '../services/adminService';

const STATUS_COLOR = {
  available: 'success', pending: 'warning', reserved: 'warning',
  completed: 'info', expired: 'default', cancelled: 'error',
};
const FRESHNESS_COLOR = (s) => s >= 60 ? 'success' : s >= 30 ? 'warning' : 'error';
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString() : '—';

const TABS = [
  { value: 'pending',   label: 'Pending Approval' },
  { value: 'all',       label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'reserved',  label: 'Reserved' },
  { value: 'expired',   label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ── Reject dialog ─────────────────────────────────────────────────────────────
const RejectDialog = ({ open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  const handleConfirm = () => { onConfirm(reason); setReason(''); };
  const handleClose = () => { setReason(''); onClose(); };
  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Reject Listing</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus fullWidth multiline rows={3}
          label='Reason for rejection (optional)'
          value={reason}
          onChange={e => setReason(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleConfirm} color='error' variant='contained' disabled={loading}>
          {loading ? 'Rejecting…' : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Pending listing card (mobile) ─────────────────────────────────────────────
const PendingCard = ({ listing, onApprove, onReject, actionLoading }) => (
  <Card variant='outlined'>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Box display='flex' justifyContent='space-between' alignItems='flex-start' gap={1} mb={0.5}>
        <Typography variant='subtitle2' fontWeight={700}>{listing.food_type}</Typography>
        <Chip label='Pending' color='warning' size='small' sx={{ flexShrink: 0 }} />
      </Box>
      <Typography variant='caption' color='text.secondary' display='block'>{listing.donor_email}</Typography>
      {listing.donor_name && listing.donor_name !== listing.donor_email && (
        <Typography variant='caption' color='text.secondary' display='block'>{listing.donor_name}</Typography>
      )}
      <Typography variant='caption' display='block' mt={0.5}>{listing.quantity} {listing.unit}</Typography>
      {listing.pickup_address && (
        <Typography variant='caption' color='text.secondary' display='block' noWrap>{listing.pickup_address}</Typography>
      )}
      <Typography variant='caption' color='text.secondary' display='block'>{fmtDate(listing.created_at)}</Typography>
      <Box display='flex' gap={1} mt={1.5}>
        <Button size='small' variant='contained' color='success' startIcon={<CheckCircle />}
          onClick={() => onApprove(listing.id)} disabled={actionLoading === listing.id}>
          Approve
        </Button>
        <Button size='small' variant='outlined' color='error' startIcon={<Cancel />}
          onClick={() => onReject(listing)} disabled={actionLoading === listing.id}>
          Reject
        </Button>
      </Box>
    </CardContent>
  </Card>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const AdminListingsPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [listings, setListings] = useState([]);
  const [pendingListings, setPendingListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending');

  // Action state
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [allRes, pendingRes] = await Promise.all([
      adminService.getAdminReports({ type: 'listings', page_size: 100 }),
      adminService.getPendingListings(),
    ]);
    if (allRes.success) setListings(allRes.data.data || []);
    else setError(allRes.error || 'Failed to load listings.');
    if (pendingRes.success) setPendingListings(pendingRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (listingId) => {
    setActionLoading(listingId); setActionError('');
    const res = await adminService.approveListing(listingId);
    setActionLoading(null);
    if (res.success) {
      load();
    } else {
      setActionError(res.error || 'Failed to approve listing.');
    }
  };

  const handleRejectOpen = (listing) => setRejectTarget(listing);

  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return;
    setRejectLoading(true); setActionError('');
    const res = await adminService.rejectListing(rejectTarget.id, reason);
    setRejectLoading(false);
    setRejectTarget(null);
    if (res.success) {
      load();
    } else {
      setActionError(res.error || 'Failed to reject listing.');
    }
  };

  // For the "all" tab and status tabs, merge pending into the full list so counts are accurate
  const allWithPending = [
    ...pendingListings.map(l => ({ ...l, status: 'pending' })),
    ...listings.filter(l => l.status !== 'pending'),
  ];

  const filtered = tab === 'pending'
    ? pendingListings
    : tab === 'all'
      ? allWithPending
      : allWithPending.filter(l => l.status === tab);

  const counts = allWithPending.reduce((a, l) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display='flex' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={2} mb={3}>
        <Box display='flex' alignItems='center' gap={1.5}>
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Restaurant color='primary' />
          </Box>
          <Box>
            <Typography variant='h5' fontWeight={800}>Food Listings</Typography>
            <Typography variant='body2' color='text.secondary'>Review and manage all food listings</Typography>
          </Box>
        </Box>
        <Box display='flex' gap={1}>
          <Tooltip title='Refresh'><IconButton size='small' onClick={load} disabled={loading}><Refresh /></IconButton></Tooltip>
          <Button size='small' variant='outlined' endIcon={<OpenInNew />} onClick={() => navigate('/admin/reports')}>
            Full Report
          </Button>
        </Box>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {actionError && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setActionError('')}>{actionError}</Alert>}

      {/* Summary chips */}
      <Box display='flex' gap={1.5} flexWrap='wrap' mb={3}>
        {[
          { label: 'Total',     value: allWithPending.length,    color: 'default' },
          { label: 'Pending',   value: counts.pending   || 0,    color: 'warning' },
          { label: 'Available', value: counts.available || 0,    color: 'success' },
          { label: 'Reserved',  value: counts.reserved  || 0,    color: 'warning' },
          { label: 'Expired',   value: counts.expired   || 0,    color: 'error' },
          { label: 'Cancelled', value: counts.cancelled || 0,    color: 'default' },
        ].map(s => (
          <Box key={s.label} sx={{ textAlign: 'center', px: 2, py: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid #f1f5f9', minWidth: 80 }}>
            <Typography variant='h5' fontWeight={800} color={s.color === 'default' ? 'text.primary' : s.color + '.main'}>{s.value}</Typography>
            <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' scrollButtons='auto'>
            {TABS.map(t => {
              const count = t.value === 'all' ? allWithPending.length : t.value === 'pending' ? (counts.pending || 0) : (counts[t.value] || 0);
              return (
                <Tab key={t.value}
                  label={
                    <Box display='flex' alignItems='center' gap={0.75}>
                      {t.label}
                      {t.value === 'pending' && count > 0 && (
                        <Chip label={count} color='warning' size='small' sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                      )}
                      {t.value !== 'pending' && `(${count})`}
                    </Box>
                  }
                  value={t.value}
                  sx={{ fontSize: '0.8rem', minWidth: 'auto', px: 1.5 }}
                />
              );
            })}
          </Tabs>
        </Box>

        {loading ? (
          <Box display='flex' justifyContent='center' py={6}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box textAlign='center' py={6}>
            <Restaurant sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant='body1' color='text.secondary'>
              {tab === 'pending' ? 'No listings awaiting approval' : `No ${tab === 'all' ? '' : tab} listings found`}
            </Typography>
          </Box>
        ) : tab === 'pending' ? (
          /* ── Pending approval view ── */
          isMobile ? (
            <Box p={2} display='flex' flexDirection='column' gap={1.5}>
              {filtered.map((l) => (
                <PendingCard key={l.id} listing={l} onApprove={handleApprove} onReject={handleRejectOpen} actionLoading={actionLoading} />
              ))}
            </Box>
          ) : (
            <TableContainer>
              <Table size='small' stickyHeader>
                <TableHead>
                  <TableRow>
                    {['#', 'Food Type', 'Donor', 'Qty', 'Pickup Address', 'Expiry', 'Submitted', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id} hover>
                      <TableCell><Typography variant='caption' color='text.secondary'>{l.id}</Typography></TableCell>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600} noWrap sx={{ maxWidth: 160 }}>{l.food_type}</Typography>
                        <Box display='flex' gap={0.5} mt={0.25} flexWrap='wrap'>
                          {l.is_vegetarian && <Chip label='Veg' color='success' size='small' sx={{ height: 16, fontSize: '0.6rem' }} />}
                          {l.is_vegan && <Chip label='Vegan' color='success' size='small' sx={{ height: 16, fontSize: '0.6rem' }} />}
                          {l.is_gluten_free && <Chip label='GF' color='info' size='small' sx={{ height: 16, fontSize: '0.6rem' }} />}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' noWrap sx={{ maxWidth: 160 }}>{l.donor_email}</Typography>
                        {l.donor_name && l.donor_name !== l.donor_email && (
                          <Typography variant='caption' color='text.secondary' noWrap display='block'>{l.donor_name}</Typography>
                        )}
                      </TableCell>
                      <TableCell><Typography variant='body2' noWrap>{l.quantity} {l.unit}</Typography></TableCell>
                      <TableCell><Typography variant='body2' noWrap sx={{ maxWidth: 180 }} title={l.pickup_address}>{l.pickup_address || '—'}</Typography></TableCell>
                      <TableCell><Typography variant='body2' noWrap>{fmtDate(l.expiry_time)}</Typography></TableCell>
                      <TableCell><Typography variant='body2' noWrap>{fmtDate(l.created_at)}</Typography></TableCell>
                      <TableCell>
                        <Box display='flex' gap={0.75}>
                          <Tooltip title='Approve'>
                            <span>
                              <IconButton size='small' color='success' onClick={() => handleApprove(l.id)} disabled={actionLoading === l.id}>
                                {actionLoading === l.id ? <CircularProgress size={16} /> : <CheckCircle fontSize='small' />}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title='Reject'>
                            <span>
                              <IconButton size='small' color='error' onClick={() => handleRejectOpen(l)} disabled={actionLoading === l.id}>
                                <Cancel fontSize='small' />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : (
          /* ── All / status-filtered view ── */
          isMobile ? (
            <Box p={2} display='flex' flexDirection='column' gap={1.5}>
              {filtered.map((l, i) => (
                <Card key={i} variant='outlined'>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box display='flex' justifyContent='space-between' alignItems='flex-start' gap={1} mb={1}>
                      <Typography variant='subtitle2' fontWeight={700} noWrap>{l.food_type}</Typography>
                      <Chip label={l.status} color={STATUS_COLOR[l.status] || 'default'} size='small' sx={{ flexShrink: 0 }} />
                    </Box>
                    <Typography variant='caption' color='text.secondary' display='block' mb={0.5}>{l['donor__email'] || l.donor_email || '—'}</Typography>
                    <Box display='flex' gap={2} flexWrap='wrap'>
                      <Typography variant='caption'>{l.quantity} {l.unit}</Typography>
                      <Typography variant='caption' color='text.secondary'>{fmtDate(l.created_at)}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <TableContainer>
              <Table size='small' stickyHeader>
                <TableHead>
                  <TableRow>
                    {['#', 'Food Type', 'Donor', 'Qty', 'Status', 'Freshness', 'Pickup Address', 'Created'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((l, i) => (
                    <TableRow key={i} hover>
                      <TableCell><Typography variant='caption' color='text.secondary'>{l.id}</Typography></TableCell>
                      <TableCell><Typography variant='body2' fontWeight={600} noWrap sx={{ maxWidth: 180 }}>{l.food_type}</Typography></TableCell>
                      <TableCell><Typography variant='body2' noWrap sx={{ maxWidth: 160 }}>{l['donor__email'] || l.donor_email || '—'}</Typography></TableCell>
                      <TableCell><Typography variant='body2' noWrap>{l.quantity} {l.unit}</Typography></TableCell>
                      <TableCell><Chip label={l.status} color={STATUS_COLOR[l.status] || 'default'} size='small' /></TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Box display='flex' alignItems='center' gap={1}>
                          <LinearProgress variant='determinate' value={l.freshness_score || 0} color={FRESHNESS_COLOR(l.freshness_score || 0)} sx={{ height: 6, borderRadius: 99, width: 60, flexShrink: 0 }} />
                          <Typography variant='caption' fontWeight={600}>{Math.round(l.freshness_score || 0)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant='body2' noWrap sx={{ maxWidth: 200 }} title={l.pickup_address}>{l.pickup_address || '—'}</Typography></TableCell>
                      <TableCell><Typography variant='body2' noWrap>{fmtDate(l.created_at)}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
      </Paper>

      <RejectDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        loading={rejectLoading}
      />
    </Container>
  );
};

export default AdminListingsPage;
