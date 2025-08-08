import React, { useState } from "react";
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import LogoutIcon from "@mui/icons-material/Logout";
import { useEffect } from "react";
import LogoutDialog from "../logoutDialog/LogoutDialog";
import {
  CloseOutlined,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import axios from "axios";

const Header = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const menuOpen = Boolean(anchorEl);

  const handlePasswordSubmit = async () => {
    if (!validatePassword()) {
      return;
    }

    setPasswordLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/auth/change-password",
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPasswordSuccess(true);
      setPasswordError("");

      setTimeout(() => {
        setPasswordDialogOpen(false);
      }, 2000);
    } catch (error) {
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setPasswordError(error.response.data.message);
      } else {
        setPasswordError("Failed to change password. Please try again.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };
  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
  };

  const validatePassword = () => {
    setPasswordError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return false;
    }

    // Check if new password is at least 8 characters
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return false;
    }
    const hasNumber = /\d/.test(newPassword);
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    if (!hasNumber || !hasLetter) {
      setPasswordError(
        "New password must contain at least one letter and one number"
      );
      return false;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return false;
    }

    return true;
  };

  const handlePasswordChange = () => {
    setPasswordDialogOpen(true);
    handleMenuClose();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLogoutOpen(false);
    navigate("/");
    handleMenuClose();
  };
  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.email) {
          setUserEmail(user.email);
        }
      }
    } catch (error) {
      console.error("Error retrieving user data:", error);
    }
  }, []);
  return (
    <>
      <Dialog
        open={passwordDialogOpen}
        onClose={handlePasswordDialogClose}
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxWidth: 400,
            width: "100%",
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            pb: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <VpnKeyIcon sx={{ color: "#4D99A3" }} />
          Change Password
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={handlePasswordDialogClose}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            color: "text.secondary",
          }}
        >
          <CloseOutlined />
        </IconButton>
        <DialogContent sx={{ pt: 1 }}>
          {passwordSuccess ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 2,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: "#4caf50",
                  mb: 2,
                  width: 60,
                  height: 60,
                }}
              >
                <CheckIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Password Changed!
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Your password has been successfully updated.
              </Typography>
            </Box>
          ) : (
            <>
              {passwordError && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    "& .MuiAlert-icon": {
                      color: "#f44336",
                    },
                  }}
                >
                  {passwordError}
                </Alert>
              )}
              <TextField
                margin="dense"
                label="Current Password"
                type={showCurrentPassword ? "text" : "password"}
                fullWidth
                variant="outlined"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle current password visibility"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        edge="end"
                      >
                        {showCurrentPassword ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="dense"
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                fullWidth
                variant="outlined"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Password must be at least 8 characters with letters and numbers"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle new password visibility"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="dense"
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                fullWidth
                variant="outlined"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}
        </DialogContent>
        {!passwordSuccess && (
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={handlePasswordDialogClose}
              sx={{
                borderRadius: 2,
                color: "text.secondary",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              variant="contained"
              color="error"
              disabled={passwordLoading}
              sx={{
                borderRadius: 2,
                px: 3,
                position: "relative",
              }}
            >
              {passwordLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <LogoutDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
      <AppBar
        position="fixed"
        elevation={2}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "#F3F3EE",
          color: "text.primary",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", height: 48 }}>
          {/* Logo */}
          <Typography
            variant="h6"
            noWrap
            sx={{
              display: "flex",
              alignItems: "center",
              fontWeight: 600,
              letterSpacing: "0.5px",
              fontSize: { xs: "1.1rem", sm: "1.4rem" },
            }}
          >
            <div
              className="logo-container"
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "0.6rem",
              }}
            >
              <img
                src="/images/Buzly.png"
                alt="Buzly Logo"
                className="buzly-logo"
                style={{
                  height: "1.5em",
                  marginRight: "0.1em",
                  verticalAlign: "middle",
                }}
              />
              <span style={{ fontWeight: 600 }}>uzzly</span>
            </div>
          </Typography>

          {/* Right Side */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
            }}
          >
            <Tooltip
              title="Account settings"
              arrow
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 600 }}
            >
              <Avatar
                onClick={handleMenuOpen}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "#E8E8E3",
                  color: "#13343B",
                  fontWeight: "bold",
                  cursor: "pointer",
                  border: "2px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  },
                }}
              >
                {userEmail?.charAt(0).toUpperCase()}
              </Avatar>
            </Tooltip>

            {/* Menu */}
            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              TransitionComponent={Fade}
              PaperProps={{
                elevation: 3,
                sx: {
                  borderRadius: 2,
                  minWidth: 250,
                  overflow: "visible",
                  mt: 1.5,
                  "&:before": {
                    content: '""',
                    display: "block",
                    position: "absolute",
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: "background.paper",
                    transform: "translateY(-50%) rotate(45deg)",
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <Box sx={{ px: 2, py: 1.5, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  User Profile
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <EmailIcon fontSize="small" sx={{ color: "#4D99A3" }} />
                  {userEmail}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handlePasswordChange} sx={{ py: 1.5 }}>
                <VpnKeyIcon sx={{ mr: 2, mb: 2, color: "#4D99A3" }} />
                <Typography variant="body2">Change Password</Typography>
              </MenuItem>
              <MenuItem onClick={() => setLogoutOpen(true)} sx={{ py: 1.5 }}>
                <LogoutIcon sx={{ mr: 2, mb: 2, color: "#4D99A3" }} />
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Header;
