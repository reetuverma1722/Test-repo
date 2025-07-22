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
  KeyboardArrowRight as ArrowIcon
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
          color="primary"
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
      
      <Box sx={{ overflow: "auto", py: 2 }}>
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
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    color: 'primary.main',
                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                    paddingLeft: '13px', // Compensate for the border
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                  '&:hover': {
                    backgroundColor: isActive
                      ? 'rgba(25, 118, 210, 0.12)'
                      : 'rgba(0, 0, 0, 0.04)',
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
                  color: theme.palette.primary.main,
                }
              }
            }}
            onClick={() => navigate('/keyword-management')}
          >
            <Typography
              variant="body2"
              color="primary"
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
