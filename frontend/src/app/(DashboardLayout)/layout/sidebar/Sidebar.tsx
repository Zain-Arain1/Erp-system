import { useMediaQuery, Box, Drawer, useTheme } from "@mui/material";
import SidebarItems from "./SidebarItems";

import Logo from "../sidebar/Logo";

interface ItemType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const MSidebar = ({
  isMobileSidebarOpen,
  onSidebarClose,
  isSidebarOpen,
  toggleSidebar,
}: ItemType) => {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up("lg"));
  const sidebarWidth = isSidebarOpen ? "200px" : "80px";

  const scrollbarStyles = {
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.divider,
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: theme.palette.text.disabled,
    },
  };

  const drawerStyles = {
    width: sidebarWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
    ...(lgUp && {
      '& .MuiDrawer-paper': {
        width: sidebarWidth,
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        borderRight: 'none',
        boxShadow: theme.shadows[8],
      },
    }),
  };

  if (lgUp) {
    return (
      <Box
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Drawer
          variant="permanent"
          sx={drawerStyles}
          PaperProps={{
            sx: {
              ...scrollbarStyles,
              backgroundColor: theme.palette.background.default,
            },
          }}
        >
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
             py: 1,
            }}
          >
            
            <Box sx={{ px: isSidebarOpen ? 2 : 1.5, mb: 3 }}>
              <Logo isCollapsed={!isSidebarOpen} />
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <SidebarItems isSidebarOpen={isSidebarOpen} />
            </Box>
           
          </Box>
        </Drawer>
      </Box>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant="temporary"
      PaperProps={{
        sx: {
          width: '200px',
          boxShadow: theme.shadows[8],
          ...scrollbarStyles,
          backgroundColor: theme.palette.background.default,
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          py: 2,
        }}
      >
        <Box sx={{ px: 2, mb: 3 }}>
          <Logo />
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <SidebarItems isSidebarOpen={true} toggleMobileSidebar={onSidebarClose} />
        </Box>
      
      </Box>
    </Drawer>
  );
};

export default MSidebar;