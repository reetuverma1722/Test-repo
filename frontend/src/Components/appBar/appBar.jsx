import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  useTheme,
  Tooltip,
} from "@mui/material";
import { Logout, NotificationsOutlined } from "@mui/icons-material";
import LogoutDialog from "../logoutDialog/LogoutDialog";

const Appbar = () => {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const theme = useTheme();

  const handleLogout = () => {
    // Handle logout logic
    localStorage.removeItem("token");
    setLogoutOpen(false);
    // Redirect to login page would happen here
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={2}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'white',
          color: theme.palette.text.primary, // Change text color to dark
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", height: 48 }}>
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 600,
              letterSpacing: "0.5px",
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              color: theme.palette.text.primary // Ensure text is dark
            }}
          >
            Buzzly
          </Typography>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
            <Tooltip title="Notifications">
              <IconButton
                color="default"
                size="medium"
                sx={{ color: theme.palette.text.primary }}
              >
                <NotificationsOutlined />
              </IconButton>
            </Tooltip>
            
            <Avatar
              alt="User"
              src="/profile.jpg"
              sx={{
                width: 32,
                height: 32,
                border: `2px solid ${theme.palette.background.paper}`,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
              }}
            />
            
            <Tooltip title="Logout">
              <IconButton
                onClick={() => setLogoutOpen(true)}
                sx={{
                  color: theme.palette.text.primary,
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.1)',
                  }
                }}
              >
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      
      <LogoutDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
};

export default Appbar;
