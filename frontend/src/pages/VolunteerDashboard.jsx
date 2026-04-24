import { Typography, Paper, Container } from '@mui/material';

const VolunteerDashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4,
          background: 'linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%)',
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom color="primary">
          Volunteer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to your volunteer dashboard! Here you'll be able to view available delivery assignments, 
          manage your schedule, and track your volunteer activities. This interface will be fully implemented in task 4.3.
        </Typography>
      </Paper>
    </Container>
  );
};

export default VolunteerDashboard;