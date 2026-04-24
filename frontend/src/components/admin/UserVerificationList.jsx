import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { People, HourglassEmpty } from '@mui/icons-material';
import UserVerificationCard from './UserVerificationCard';
import adminService from '../../services/adminService';

/**
 * UserVerificationList Component
 * Displays list of pending user verifications with filtering
 */
const UserVerificationList = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState('all');
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch pending verifications
  const fetchPendingVerifications = async () => {
    setIsLoading(true);
    setError(null);

    const result = await adminService.getPendingVerifications();

    if (result.success) {
      // Handle both array and paginated response formats
      const users = Array.isArray(result.data) ? result.data : result.data.results || [];
      setPendingUsers(users);
      setFilteredUsers(users);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  // Filter users by role
  useEffect(() => {
    if (selectedRole === 'all') {
      setFilteredUsers(pendingUsers);
    } else {
      setFilteredUsers(pendingUsers.filter(user => user.role === selectedRole));
    }
  }, [selectedRole, pendingUsers]);

  // Handle user verification
  const handleVerify = async (userId) => {
    const result = await adminService.verifyUser(userId);

    if (result.success) {
      setSuccessMessage(result.message);
      // Remove verified user from list
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(result.error);
    }
  };

  // Handle user rejection
  const handleReject = async (userId, reason) => {
    const result = await adminService.rejectUser(userId, reason);

    if (result.success) {
      setSuccessMessage(result.message);
      // Remove rejected user from list
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(result.error);
    }
  };

  // Handle role tab change
  const handleRoleChange = (event, newValue) => {
    setSelectedRole(newValue);
  };

  // Get role counts
  const getRoleCounts = () => {
    const counts = {
      all: pendingUsers.length,
      donor: pendingUsers.filter(u => u.role === 'donor').length,
      receiver: pendingUsers.filter(u => u.role === 'receiver').length,
      volunteer: pendingUsers.filter(u => u.role === 'volunteer').length,
      admin: pendingUsers.filter(u => u.role === 'admin').length,
    };
    return counts;
  };

  const roleCounts = getRoleCounts();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <People sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h5" component="h2">
          Pending User Verifications
        </Typography>
      </Box>

      {/* Success message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Role filter tabs */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={selectedRole}
          onChange={handleRoleChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`All (${roleCounts.all})`} value="all" />
          <Tab label={`Donors (${roleCounts.donor})`} value="donor" />
          <Tab label={`Receivers (${roleCounts.receiver})`} value="receiver" />
          <Tab label={`Volunteers (${roleCounts.volunteer})`} value="volunteer" />
          <Tab label={`Admins (${roleCounts.admin})`} value="admin" />
        </Tabs>
      </Paper>

      {/* User cards */}
      {filteredUsers.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <HourglassEmpty sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No pending verifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedRole === 'all' 
              ? 'All users have been verified'
              : `No pending ${selectedRole} verifications`
            }
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          {filteredUsers.map((user) => (
            <Grid item xs={12} sm={6} md={4} key={user.id}>
              <UserVerificationCard
                user={user}
                onVerify={handleVerify}
                onReject={handleReject}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default UserVerificationList;
