import { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const SIDEBAR_WIDTH = 240;
// AppBar height: 64px on desktop, 56px on mobile (MUI default)
const HEADER_HEIGHT = { xs: '56px', sm: '64px' };

const MainLayout = ({ children, showSidebar = true }) => {
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hasSidebar = isAuthenticated && showSidebar;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',        // fill viewport exactly — no scroll on the root
        width: '100%',
        overflowX: 'hidden',
        backgroundColor: 'background.default',
      }}
    >
      {/* Sticky header */}
      <Header onMenuClick={() => setSidebarOpen((v) => !v)} />

      {/* Body row — fills remaining height */}
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          minWidth: 0,
          // subtract header so the row never overflows the viewport
          height: { xs: `calc(100vh - 56px)`, sm: `calc(100vh - 64px)` },
          overflow: 'hidden',
        }}
      >
        {/* Fixed sidebar (desktop) / temporary drawer (mobile) */}
        {hasSidebar && (
          isMobile ? (
            <Sidebar
              variant="temporary"
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          ) : (
            // Wrapper that pins the sidebar to the left and makes it scroll independently
            <Box
              sx={{
                width: SIDEBAR_WIDTH,
                flexShrink: 0,
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Sidebar variant="permanent" />
            </Box>
          )
        )}

        {/* Scrollable main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            height: '100%',
            overflowY: 'auto',   // only this area scrolls
            overflowX: 'hidden',
            backgroundColor: 'background.default',
          }}
        >
          {children}
        </Box>
      </Box>
      {/* Footer intentionally omitted for authenticated dashboard layout */}
    </Box>
  );
};

export default MainLayout;
