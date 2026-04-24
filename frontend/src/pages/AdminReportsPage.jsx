import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Assessment,
  Download,
  FilterList,
  Refresh,
  People,
  Restaurant,
  Handshake,
} from '@mui/icons-material';
import adminService from '../services/adminService';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (val) => {
  if (val == null) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  // ISO date string
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(val).toLocaleString();
  }
  return String(val);
};

const REPORT_TYPES = [
  { value: 'users',    label: 'Users',    icon: <People fontSize="small" /> },
  { value: 'listings', label: 'Food Listings', icon: <Restaurant fontSize="small" /> },
  { value: 'matches',  label: 'Matches',  icon: <Handshake fontSize="small" /> },
];

const ROLE_OPTIONS = ['', 'donor', 'receiver', 'volunteer', 'admin'];

const COLUMNS = {
  users: ['id', 'email', 'username', 'role', 'verification_status', 'is_active', 'date_joined'],
  listings: ['id', 'food_type', 'quantity', 'unit', 'status', 'freshness_score', 'pickup_address', 'created_at'],
  matches: ['id', 'listing__food_type', 'donor__email', 'receiver__email', 'matched_quantity', 'status', 'created_at', 'completed_at'],
};

const COLUMN_LABELS = {
  id: 'ID',
  email: 'Email',
  username: 'Username',
  role: 'Role',
  verification_status: 'Status',
  is_active: 'Active',
  date_joined: 'Joined',
  food_type: 'Food Type',
  quantity: 'Qty',
  unit: 'Unit',
  status: 'Status',
  freshness_score: 'Freshness',
  pickup_address: 'Pickup Address',
  created_at: 'Created',
  completed_at: 'Completed',
  matched_quantity: 'Qty',
  'listing__food_type': 'Food',
  'donor__email': 'Donor',
  'receiver__email': 'Receiver',
};

const statusColor = (val) => {
  if (val === 'approved' || val === 'completed' || val === 'available') return 'success';
  if (val === 'pending' || val === 'matched' || val === 'in_progress') return 'warning';
  if (val === 'rejected' || val === 'cancelled' || val === 'expired') return 'error';
  return 'default';
};

const STATUS_FIELDS = ['status', 'verification_status'];

// ── component ─────────────────────────────────────────────────────────────────

const AdminReportsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [reportType, setReportType] = useState('users');
  const [filters, setFilters] = useState({ start_date: '', end_date: '', role: '', location: '' });
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchReport = async (p = 1) => {
    setLoading(true);
    setError('');
    const result = await adminService.getAdminReports({
      type: reportType,
      page: p,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
    });
    if (result.success) {
      setData(result.data.data || []);
      setTotalCount(result.data.count || 0);
      setPage(p);
      setHasLoaded(true);
    } else {
      setError(result.error || 'Failed to load report.');
    }
    setLoading(false);
  };

  const handleExport = async () => {
    setExportLoading(true);
    const result = await adminService.exportReport({
      format: 'csv',
      type: reportType,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
    });
    if (result.success && result.data instanceof Blob) {
      const url = URL.createObjectURL(result.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setError(result.error || 'Export failed.');
    }
    setExportLoading(false);
  };

  const columns = COLUMNS[reportType] || [];
  const totalPages = Math.ceil(totalCount / 20);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Assessment color="primary" sx={{ fontSize: { xs: 28, sm: 32 } }} />
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
            Reports
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={() => fetchReport(page)} disabled={loading || !hasLoaded} size="small">
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={exportLoading ? <CircularProgress size={16} /> : <Download />}
            onClick={handleExport}
            disabled={exportLoading || !hasLoaded || data.length === 0}
            size="small"
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Report type selector */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={3}>
        {REPORT_TYPES.map((rt) => (
          <Chip
            key={rt.value}
            icon={rt.icon}
            label={rt.label}
            onClick={() => { setReportType(rt.value); setData([]); setHasLoaded(false); }}
            color={reportType === rt.value ? 'primary' : 'default'}
            variant={reportType === rt.value ? 'filled' : 'outlined'}
            sx={{ fontWeight: reportType === rt.value ? 700 : 400 }}
          />
        ))}
      </Box>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FilterList fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={600}>Filters</Typography>
        </Box>
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              size="small"
              value={filters.start_date}
              onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              size="small"
              value={filters.end_date}
              onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          {reportType === 'users' && (
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={filters.role}
                  label="Role"
                  onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <MenuItem key={r} value={r}>{r === '' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          {reportType === 'listings' && (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Location"
                fullWidth
                size="small"
                placeholder="e.g. Chicago"
                value={filters.location}
                onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => fetchReport(1)}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
              sx={{ height: 40 }}
            >
              {loading ? 'Loading…' : 'Run Report'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Results */}
      {!hasLoaded && !loading && (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Assessment sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">Select filters and click Run Report</Typography>
          <Typography variant="body2" color="text.secondary">Results will appear here</Typography>
        </Paper>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {hasLoaded && !loading && data.length === 0 && (
        <Alert severity="info">No records found for the selected filters.</Alert>
      )}

      {hasLoaded && !loading && data.length > 0 && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="body2" color="text.secondary">
              {totalCount} record{totalCount !== 1 ? 's' : ''} found
            </Typography>
            {totalPages > 1 && (
              <Typography variant="body2" color="text.secondary">
                Page {page} of {totalPages}
              </Typography>
            )}
          </Box>

          {isMobile ? (
            // Mobile: card layout
            <Box display="flex" flexDirection="column" gap={1.5}>
              {data.map((row, i) => (
                <Card key={i} elevation={1}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {columns.map((col) => (
                      <Box key={col} display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5} gap={1}>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, minWidth: 90 }}>
                          {COLUMN_LABELS[col] || col}
                        </Typography>
                        {STATUS_FIELDS.includes(col) ? (
                          <Chip label={fmt(row[col])} color={statusColor(row[col])} size="small" />
                        ) : (
                          <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
                            {fmt(row[col])}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            // Desktop: table layout
            <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'grey.50' }}>
                        {COLUMN_LABELS[col] || col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i} hover>
                      {columns.map((col) => (
                        <TableCell key={col} sx={{ maxWidth: 220 }}>
                          {STATUS_FIELDS.includes(col) ? (
                            <Chip label={fmt(row[col])} color={statusColor(row[col])} size="small" />
                          ) : (
                            <Typography variant="body2" noWrap title={fmt(row[col])}>
                              {fmt(row[col])}
                            </Typography>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => fetchReport(p)}
                color="primary"
                size={isMobile ? 'small' : 'medium'}
                siblingCount={isMobile ? 0 : 1}
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default AdminReportsPage;
