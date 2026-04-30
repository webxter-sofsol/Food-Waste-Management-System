/**
 * AdminUsersPage — /admin/users
 * Full user management: search, filter, view all profile details.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip,
  CircularProgress, Collapse, Container, Dialog, DialogContent,
  DialogTitle, Divider, FormControl, Grid, IconButton, InputAdornment,
  InputLabel, MenuItem, Pagination, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Business, CalendarToday, Category, Close, Description,
  Email, ExpandLess, ExpandMore, OpenInNew, People,
  Person, Phone, Refresh, Search, Shield, Home,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import adminService from '../services/adminService';

// ── helpers ───────────────────────────────────────────────────────────────────
const ROLE_COLOR   = { donor: 'primary', receiver: 'secondary', volunteer: 'success', admin: 'error' };
const STATUS_COLOR = { approved: 'success', pending: 'warning', rejected: 'error' };
const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—';
const ago = (iso) => iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : '—';

const ROLE_EMOJI = { donor: '🍽️', receiver: '🤲', volunteer: '🚚', admin: '⚙️' };

// ── Detail dialog ─────────────────────────────────────────────────────────────
const UserDetailDialog = ({ user, open, onClose }) => {
  if (!user) return null;

  const InfoRow = ({ icon, label, value, chip }) => (
    <Box display="flex" alignItems="flex-start" gap={1.5} py={0.75}>
      <Box sx={{ color: 'text.secondary', mt: 0.2, flexShrink: 0 }}>{icon}</Box>
      <Box minWidth={0} flexGrow={1}>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        {chip ? chip : (
          <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-word' }}>
            {value || '—'}
          </Typography>
        )}
      </Box>
    </Box>
  );

  const Section = ({ title, children }) => (
    <Box mb={2}>
      <Typography variant="caption" fontWeight={700} color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: '#f0fdf4', color: 'primary.main', width: 44, height: 44, fontWeight: 700 }}>
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>{user.full_name || user.username}</Typography>
              <Typography variant="caption" color="text.secondary">{user.email}</Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
        </Box>
        <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
          <Chip
            label={`${ROLE_EMOJI[user.role] || ''} ${user.role}`}
            color={ROLE_COLOR[user.role] || 'default'}
            size="small"
          />
          <Chip
            label={user.verification_status}
            color={STATUS_COLOR[user.verification_status] || 'default'}
            size="small"
          />
          {!user.is_active && <Chip label="Inactive" color="error" size="small" variant="outlined" />}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Section title="Account">
          <InfoRow icon={<Email fontSize="small" />} label="Email" value={user.email} />
          <InfoRow icon={<Person fontSize="small" />} label="Username" value={user.username} />
          <InfoRow icon={<CalendarToday fontSize="small" />} label="Joined" value={`${fmt(user.date_joined)} (${ago(user.date_joined)})`} />
          <InfoRow icon={<CalendarToday fontSize="small" />} label="Last Login" value={user.last_login ? `${fmt(user.last_login)} (${ago(user.last_login)})` : 'Never'} />
        </Section>

        <Divider sx={{ my: 1.5 }} />

        <Section title="Profile">
          <InfoRow icon={<Person fontSize="small" />} label="Full Name" value={user.full_name} />
          <InfoRow icon={<Phone fontSize="small" />} label="Phone" value={user.phone} />
          <InfoRow icon={<Home fontSize="small" />} label="Address" value={user.address} />
          {user.organization_name && (
            <InfoRow icon={<Business fontSize="small" />} label="Organisation" value={user.organization_name} />
          )}
        </Section>

        {/* Receiver-specific */}
        {user.role === 'receiver' && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Section title="Receiver Details">
              {user.receiver_type && (
                <InfoRow
                  icon={<Category fontSize="small" />}
                  label="Organisation Type"
                  chip={
                    <Chip
                      label={user.receiver_type.charAt(0).toUpperCase() + user.receiver_type.slice(1)}
                      color={user.receiver_type === 'individual' ? 'default' : 'info'}
                      size="small"
                    />
                  }
                />
              )}
              {user.verification_document ? (
                <InfoRow
                  icon={<Description fontSize="small" />}
                  label="Verification Document"
                  chip={
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNew fontSize="small" />}
                      href={user.verification_document}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textTransform: 'none', fontSize: '0.75rem', mt: 0.25 }}
                    >
                      View Document
                    </Button>
                  }
                />
              ) : user.receiver_type && user.receiver_type !== 'individual' ? (
                <InfoRow
                  icon={<Description fontSize="small" />}
                  label="Verification Document"
                  chip={<Chip label="Not uploaded" color="warning" size="small" variant="outlined" />}
                />
              ) : null}
              {user.dietary_preferences?.length > 0 && (
                <InfoRow icon={<Person fontSize="small" />} label="Dietary Preferences"
                  value={user.dietary_preferences.join(', ')} />
              )}
              {user.allergies?.length > 0 && (
                <InfoRow icon={<Shield fontSize="small" />} label="Allergies"
                  value={user.allergies.join(', ')} />
              )}
            </Section>
          </>
        )}

        {/* Donor-specific */}
        {user.role === 'donor' && user.food_types?.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Section title="Donor Details">
              <InfoRow icon={<Business fontSize="small" />} label="Food Types"
                value={user.food_types.join(', ')} />
            </Section>
          </>
        )}

        {/* Volunteer-specific */}
        {user.role === 'volunteer' && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Section title="Volunteer Details">
              {user.transportation_capacity && (
                <InfoRow icon={<Business fontSize="small" />} label="Transport Capacity"
                  value={`${user.transportation_capacity} kg`} />
              )}
              <InfoRow icon={<Person fontSize="small" />} label="Average Rating"
                value={user.average_rating ? `${Number(user.average_rating).toFixed(1)} / 5` : 'No ratings yet'} />
            </Section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Mobile user card ──────────────────────────────────────────────────────────
const UserCard = ({ user, onViewDetail }) => (
  <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => onViewDetail(user)}>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={0.75}>
        <Box minWidth={0}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {user.full_name || user.username}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {user.email}
          </Typography>
        </Box>
        <Box display="flex" flexDirection="column" gap={0.5} alignItems="flex-end" flexShrink={0}>
          <Chip label={`${ROLE_EMOJI[user.role] || ''} ${user.role}`} color={ROLE_COLOR[user.role] || 'default'} size="small" />
          <Chip label={user.verification_status} color={STATUS_COLOR[user.verification_status] || 'default'} size="small" />
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Joined {ago(user.date_joined)}
      </Typography>
    </CardContent>
  </Card>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const AdminUsersPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError('');
    const params = { page: p, page_size: PAGE_SIZE };
    if (search.trim()) params.search = search.trim();
    if (roleFilter) params.role = roleFilter;
    if (statusFilter) params.verification_status = statusFilter;

    const res = await adminService.getAllUsers(params);
    if (res.success) {
      setUsers(res.data.results || []);
      setCount(res.data.count || 0);
      setPage(p);
    } else {
      setError(res.error || 'Failed to load users.');
    }
    setLoading(false);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <People sx={{ color: '#7c3aed' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>All Users</Typography>
            <Typography variant="body2" color="text.secondary">
              {count} user{count !== 1 ? 's' : ''} total
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => load(page)} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <TextField
              fullWidth size="small"
              placeholder="Search by name, email, username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                <MenuItem value="">All Roles</MenuItem>
                {['donor', 'receiver', 'volunteer', 'admin'].map(r => (
                  <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All Statuses</MenuItem>
                {['pending', 'approved', 'rejected'].map(s => (
                  <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={1} md={1}>
            <Button variant="contained" fullWidth onClick={() => load(1)} disabled={loading} sx={{ height: 40 }}>
              {loading ? <CircularProgress size={18} color="inherit" /> : 'Search'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : users.length === 0 ? (
        <Box textAlign="center" py={8}>
          <People sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No users found</Typography>
        </Box>
      ) : isMobile ? (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {users.map(u => (
            <UserCard key={u.id} user={u} onViewDetail={setSelectedUser} />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['#', 'Name', 'Email', 'Role', 'Status', 'Type / Org', 'Phone', 'Joined', 'Last Login', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedUser(u)}>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{u.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: '#f0fdf4', color: 'primary.main' }}>
                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>
                        {u.full_name || u.username}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{u.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`${ROLE_EMOJI[u.role] || ''} ${u.role}`} color={ROLE_COLOR[u.role] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={u.verification_status} color={STATUS_COLOR[u.verification_status] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                      {u.receiver_type
                        ? u.receiver_type.charAt(0).toUpperCase() + u.receiver_type.slice(1)
                        : u.organization_name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>{u.phone || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>{ago(u.date_joined)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap color="text.secondary">
                      {u.last_login ? ago(u.last_login) : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View full details">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
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
            onChange={(_, p) => load(p)}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            showFirstButton showLastButton
          />
        </Box>
      )}

      <UserDetailDialog
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </Container>
  );
};

export default AdminUsersPage;
