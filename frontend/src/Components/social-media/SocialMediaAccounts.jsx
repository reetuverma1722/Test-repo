import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Chip
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon
} from "@mui/icons-material";
import { 
  getAllAccounts, 
  getAccountsByPlatform, 
  addAccount, 
  updateAccount, 
  deleteAccount 
} from "../../services/socialMediaAccountsService";

const SocialMediaAccounts = () => {
  // State for accounts data
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for form
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAccount, setCurrentAccount] = useState({
    id: null,
    platform: "twitter",
    accountId: "",
    accountName: "",
    accessToken: "",
    refreshToken: "",
    tokenExpiresAt: null
  });
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  
  // State for notifications
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  // Fetch accounts on component mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch all accounts
  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await getAllAccounts(token);
      setAccounts(response.data || []);
    } catch (err) {
      setError("Failed to fetch accounts. Please try again later.");
      console.error("Error fetching accounts:", err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentAccount({
      ...currentAccount,
      [name]: value
    });
  };

  // Open form for adding new account
  const handleAddAccount = () => {
    setCurrentAccount({
      id: null,
      platform: "twitter",
      accountId: "",
      accountName: "",
      accessToken: "",
      refreshToken: "",
      tokenExpiresAt: null
    });
    setIsEditing(false);
    setFormOpen(true);
  };

  // Open form for editing account
  const handleEditAccount = (account) => {
    setCurrentAccount({
      id: account.id,
      platform: account.platform,
      accountId: account.accountId,
      accountName: account.accountName,
      accessToken: "",  // We don't show the actual token for security
      refreshToken: "", // We don't show the actual token for security
      tokenExpiresAt: account.tokenExpiresAt
    });
    setIsEditing(true);
    setFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (id) => {
    setAccountToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Submit form for add/edit
  const handleSubmit = async () => {
    if (!currentAccount.accountName.trim() || !currentAccount.accountId.trim()) {
      setNotification({
        open: true,
        message: "Account name and ID are required",
        severity: "error"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (isEditing) {
        await updateAccount(currentAccount.id, currentAccount, token);
      } else {
        await addAccount(currentAccount, token);
      }
      
      // Refresh the accounts list
      await fetchAccounts();
      
      setNotification({
        open: true,
        message: `Account ${isEditing ? "updated" : "added"} successfully`,
        severity: "success"
      });
      setFormOpen(false);
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to ${isEditing ? "update" : "add"} account. Please try again.`,
        severity: "error"
      });
      console.error(`Error ${isEditing ? "updating" : "adding"} account:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await deleteAccount(accountToDelete, token);
      
      // Refresh the accounts list
      await fetchAccounts();
      
      setNotification({
        open: true,
        message: "Account deleted successfully",
        severity: "success"
      });
    } catch (err) {
      setNotification({
        open: true,
        message: "Failed to delete account. Please try again.",
        severity: "error"
      });
      console.error("Error deleting account:", err);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return <TwitterIcon color="primary" />;
      case 'linkedin':
        return <LinkedInIcon color="primary" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header and Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Social Media Accounts</Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddAccount}
          >
            Add Account
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Accounts Table */}
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Platform</TableCell>
              <TableCell>Account Name</TableCell>
              <TableCell>Account ID</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No accounts found. Add a new account to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPlatformIcon(account.platform)}
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {account.platform}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>{account.accountId}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditAccount(account)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(account.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Account Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? "Edit Account" : "Add New Account"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="platform-label">Platform</InputLabel>
                <Select
                  labelId="platform-label"
                  name="platform"
                  value={currentAccount.platform}
                  onChange={handleInputChange}
                  label="Platform"
                >
                  <MenuItem value="twitter">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TwitterIcon fontSize="small" />
                      <Typography>Twitter</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="linkedin">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinkedInIcon fontSize="small" />
                      <Typography>LinkedIn</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="accountName"
                label="Account Name"
                value={currentAccount.accountName}
                onChange={handleInputChange}
                fullWidth
                required
                helperText="Display name for this account"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="accountId"
                label="Account ID"
                value={currentAccount.accountId}
                onChange={handleInputChange}
                fullWidth
                required
                helperText="Username or ID from the platform"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="accessToken"
                label="Access Token"
                value={currentAccount.accessToken}
                onChange={handleInputChange}
                fullWidth
                type="password"
                helperText={isEditing ? "Leave blank to keep current token" : "OAuth access token"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="refreshToken"
                label="Refresh Token"
                value={currentAccount.refreshToken}
                onChange={handleInputChange}
                fullWidth
                type="password"
                helperText={isEditing ? "Leave blank to keep current token" : "OAuth refresh token (if available)"}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : isEditing ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this account? This will also remove any keywords associated with this account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SocialMediaAccounts;