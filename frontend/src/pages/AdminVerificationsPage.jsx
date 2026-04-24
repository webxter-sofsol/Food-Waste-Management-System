import { Container, Typography, Box, Alert, Paper } from '@mui/material';
import { VerifiedUser, Info } from '@mui/icons-material';
import UserVerificationList from '../components/admin/UserVerificationList';

const AdminVerificationsPage = () => (
  <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
    <Box display='flex' alignItems='center' gap={1.5} mb={2}>
      <VerifiedUser color='primary' sx={{ fontSize: { xs: 28, sm: 32 } }} />
      <Box>
        <Typography variant='h4' component='h1' sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
          User Verifications
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Review and approve new user registrations
        </Typography>
      </Box>
    </Box>

    <Alert
      severity='info'
      icon={<Info />}
      sx={{ mb: 3, borderRadius: 2 }}
    >
      <strong>How it works:</strong> When a new user registers (donor, receiver, or volunteer), their account appears here as &quot;Pending&quot;. Approve or reject each account before they can log in. Food listings are published immediately by verified donors — to view all listings go to <strong>Food Listings</strong> in the sidebar.
    </Alert>

    <UserVerificationList />
  </Container>
);

export default AdminVerificationsPage;
