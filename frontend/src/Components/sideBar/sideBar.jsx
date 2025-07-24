import React from "react";
import {
  Toolbar,
  Drawer,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme,
  Divider,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  ImportExport as ExportIcon,
  PostAdd as PostManagerIcon,
  Settings as SettingsIcon,
  KeyboardArrowRight as ArrowIcon,
  TrendingUp as TrendingUpIcon
} from "@mui/icons-material";

const drawerWidth = 240;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Menu items configuration
  const menuItems = [
    {
      text: "Dashboard",
      path: "/dashboard",
      icon: <DashboardIcon fontSize="small" />
    },
    {
      text: "History",
      path: "/history",
      icon: <HistoryIcon fontSize="small" />
    },
    {
      text: "Export Tools",
      path: "/export-tools",
      icon: <ExportIcon fontSize="small" />
    },
    {
      text: "Post Manager",
      path: "/postmanager",
      icon: <PostManagerIcon fontSize="small" />
    },
    {
      text: "Social Media Settings",
      path: "/social-media-settings",
      icon: <SettingsIcon fontSize="small" />
    },
    {
      text: "Trending Analytics",
      path: "/trending-analytics",
      icon: <TrendingUpIcon fontSize="small" />
    },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundColor: '#ffffff',
          boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: '48px !important',
          backgroundColor: 'rgba(0, 0, 0, 0.01)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
        }}
      >
        <Typography
          variant="h6"
          color="#FF0000" // Changed from primary to red
          sx={{
            fontWeight: 600,
            letterSpacing: '0.5px',
            fontSize: '1.1rem',
            cursor: 'default'
          }}
        >
          Buzzly
        </Typography>
      </Toolbar>
      
      <Box sx={{
        overflow: "auto",
        overflowX: "hidden", // Prevent horizontal scrolling
        py: 2,
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <List component="nav" disablePadding>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <ListItem
                button
                key={item.text}
                onClick={() => navigate(item.path)}
                selected={isActive}
                sx={{
                  mb: 1,
                  mx: 1.5,
                  borderRadius: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  height: '44px',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 0, 0, 0.08)', // Light red background
                    color: '#FF0000', // Red text
                    borderLeft: `3px solid #FF0000`, // Red left border
                    paddingLeft: '13px', // Compensate for the border
                    '& .MuiListItemIcon-root': {
                      color: '#FF0000', // Red icon
                    },
                  },
                  '&:hover': {
                    backgroundColor: isActive
                      ? 'rgba(255, 0, 0, 0.12)' // Light red for active items
                      : 'rgba(0, 0, 0, 0.04)',  // Default hover for inactive items
                    transform: 'translateX(3px)',
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive ? 'inherit' : theme.palette.text.secondary
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: "0.9rem",
                    fontWeight: isActive ? 600 : 500
                  }}
                />
                {isActive && <ArrowIcon fontSize="small" />}
              </ListItem>
            );
          })}
        </List>
        
        <Divider sx={{ my: 2.5, mx: 1.5 }} />
        
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mb: 1.5,
              fontWeight: 600,
              letterSpacing: '0.5px',
              fontSize: '0.7rem'
            }}
          >
            QUICK LINKS
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              pl: 0.5,
              cursor: 'pointer',
              borderRadius: 1,
              py: 0.75,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '& .MuiTypography-root': {
                  color: '#FF0000', // Changed from theme.palette.primary.main to red
                }
              }
            }}
            onClick={() => navigate('/keyword-management')}
          >
            <Typography
              variant="body2"
              color="#FF0000" // Changed from primary to red
              sx={{
                fontWeight: 500,
                fontSize: '0.85rem',
              }}
            >
              Keyword Management
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;

