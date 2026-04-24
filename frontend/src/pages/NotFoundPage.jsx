import { Typography, Paper, Box, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowBack } from '@mui/icons-material';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)',
            borderRadius: 3,
          }}
        >
          <Typography variant="h1" component="h1" sx={{ fontSize: '4rem', mb: 2 }} color="error">
            404
          </Typography>
          <Typography variant="h4" component="h2" gutterBottom color="error">
            Page Not Found
          </Typography>
          <Typography variant="body1" gutterBottom color="text.secondary" sx={{ mb: 4 }}>
            The page you're looking for doesn't exist or has been moved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              startIcon={<Home />}
              onClick={() => navigate('/dashboard')}
              sx={{ minWidth: 140 }}
            >
              Go Home
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              sx={{ minWidth: 140 }}
            >
              Go Back
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFoundPage;