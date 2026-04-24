import { Box, Container, Typography, Link, Stack } from '@mui/material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          <Box>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              Food Share
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connecting food donors with those in need, reducing waste and fighting hunger.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              Quick Links
            </Typography>
            <Stack spacing={0.5}>
              <Link href="/about" color="text.secondary" underline="hover">
                About Us
              </Link>
              <Link href="/how-it-works" color="text.secondary" underline="hover">
                How It Works
              </Link>
              <Link href="/success-stories" color="text.secondary" underline="hover">
                Success Stories
              </Link>
              <Link href="/contact" color="text.secondary" underline="hover">
                Contact
              </Link>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              Legal
            </Typography>
            <Stack spacing={0.5}>
              <Link href="/privacy" color="text.secondary" underline="hover">
                Privacy Policy
              </Link>
              <Link href="/terms" color="text.secondary" underline="hover">
                Terms of Service
              </Link>
              <Link href="/food-safety" color="text.secondary" underline="hover">
                Food Safety Guidelines
              </Link>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            © {currentYear} Food Share. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
