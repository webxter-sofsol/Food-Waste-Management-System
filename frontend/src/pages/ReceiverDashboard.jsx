import { Typography, Paper, Container } from '@mui/material';

const ReceiverDashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4,
          background: 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)',
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom color="primary">
          Receiver Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to your receiver dashboard! Here you'll be able to browse available food listings, 
          make requests, and track your food pickups. This interface will be fully implemented in task 3.3.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ReceiverDashboard;