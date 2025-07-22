
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
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
  InputAdornment,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from "@mui/icons-material";
import { getKeywords, addKeyword, updateKeyword, deleteKeyword, getFilteredKeywords } from "../../services/keywordService";

const TwitterKeywords = () => {
  // State for keywords data
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for form
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState({
    id: null,
    text: "",
    minLikes: 0,
    minRetweets: 0,
    minFollowers: 0
  });
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keywordToDelete, setKeywordToDelete] = useState(null);
  
  // State for filtering
  const [filters, setFilters] = useState({
    text: "",
    minLikes: "",
    minRetweets: "",
    minFollowers: ""
  });
  
  // State for notifications
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  // We'll no longer use mock data as we have real API endpoints

  // Fetch keywords on component mount
  useEffect(() => {
    fetchKeywords();
  }, []);

  // Fetch all keywords
  const fetchKeywords = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await getKeywords(token);
      setKeywords(response.data || []);
    } catch (err) {
      setError("Failed to fetch keywords. Please try again later.");
      console.error("Error fetching keywords:", err);
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await getFilteredKeywords(filters, token);
      setKeywords(response.data || []);
    } catch (err) {
      setError("Failed to apply filters. Please try again later.");
      console.error("Error applying filters:", err);
    } finally {
      setLoading(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      text: "",
      minLikes: "",
      minRetweets: "",
      minFollowers: ""
    });
    fetchKeywords();
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentKeyword({
      ...currentKeyword,
      [name]: name === "text" ? value : Number(value)
    });
  };

  // Handle filter input changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  // Open form for adding new keyword
  const handleAddKeyword = () => {
    setCurrentKeyword({
      id: null,
      text: "",
      minLikes: 0,
      minRetweets: 0,
      minFollowers: 0
    });
    setIsEditing(false);
    setFormOpen(true);
  };

  // Open form for editing keyword
  const handleEditKeyword = (keyword) => {
    setCurrentKeyword({
      id: keyword.id,
      text: keyword.text,
      minLikes: keyword.minLikes,
      minRetweets: keyword.minRetweets,
      minFollowers: keyword.minFollowers
    });
    setIsEditing(true);
    setFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (id) => {
    setKeywordToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Submit form for add/edit
  const handleSubmit = async () => {
    if (!currentKeyword.text.trim()) {
      setNotification({
        open: true,
        message: "Keyword text is required",
        severity: "error"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (isEditing) {
        await updateKeyword(currentKeyword.id, currentKeyword, token);
      } else {
        await addKeyword(currentKeyword, token);
      }
      
      // Refresh the keywords list
      await fetchKeywords();
      
      setNotification({
        open: true,
        message: `Keyword ${isEditing ? "updated" : "added"} successfully`,
        severity: "success"
      });
      setFormOpen(false);
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to ${isEditing ? "update" : "add"} keyword. Please try again.`,
        severity: "error"
      });
      console.error(`Error ${isEditing ? "updating" : "adding"} keyword:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await deleteKeyword(keywordToDelete, token);
      
      // Refresh the keywords list
      await fetchKeywords();
      
      setNotification({
        open: true,
        message: "Keyword deleted successfully",
        severity: "success"
      });
    } catch (err) {
      setNotification({
        open: true,
        message: "Failed to delete keyword. Please try again.",
        severity: "error"
      });
      console.error("Error deleting keyword:", err);
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

  return (
    <Box>
      {/* Header and Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Twitter Keywords Management</Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddKeyword}
          >
            Add Keyword
          </Button>
        </Box>
      </Box>

      {/* Inline Filters */}
      <Paper sx={{ p: 0.5, mb: 3 }}>
        <Grid container spacing={0.5} alignItems="center">
          <Grid item xs={12} sm={0.7}>
            <Typography variant="caption">Filters:</Typography>
          </Grid>
          <Grid item xs={12} sm={2.1}>
            <TextField
              name="text"
              label="Keyword"
              value={filters.text}
              onChange={handleFilterChange}
              fullWidth
              size="small"
              margin="dense"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                style: { fontSize: '0.8rem' }
              }}
              InputLabelProps={{
                style: { fontSize: '0.8rem' }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={1.8}>
            <TextField
              name="minLikes"
              label="Min Likes"
              type="number"
              value={filters.minLikes}
              onChange={handleFilterChange}
              fullWidth
              size="small"
              margin="dense"
              InputProps={{
                inputProps: { min: 0 },
                style: { fontSize: '0.8rem' }
              }}
              InputLabelProps={{
                style: { fontSize: '0.8rem' }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={1.8}>
            <TextField
              name="minRetweets"
              label="Min RT"
              type="number"
              value={filters.minRetweets}
              onChange={handleFilterChange}
              fullWidth
              size="small"
              margin="dense"
              InputProps={{
                inputProps: { min: 0 },
                style: { fontSize: '0.8rem' }
              }}
              InputLabelProps={{
                style: { fontSize: '0.8rem' }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={1.8}>
            <TextField
              name="minFollowers"
              label="Min Followers"
              type="number"
              value={filters.minFollowers}
              onChange={handleFilterChange}
              fullWidth
              size="small"
              margin="dense"
              InputProps={{
                inputProps: { min: 0 },
                style: { fontSize: '0.8rem' }
              }}
              InputLabelProps={{
                style: { fontSize: '0.8rem' }
              }}
            />
          </Grid>
          <Grid item xs={6} sm={0.9}>
            <Tooltip title="Clear filters">
              <IconButton
                onClick={clearFilters}
                size="small"
                sx={{
                  width: '28px',
                  height: '28px',
                  ml: 0.5
                }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item xs={6} sm={0.9}>
            <Button
              onClick={applyFilters}
              variant="contained"
              disabled={loading}
              startIcon={<FilterIcon sx={{ fontSize: '0.8rem' }} />}
              size="small"
              sx={{
                minWidth: '28px',
                height: '28px',
                fontSize: '0.7rem',
                py: 0,
                px: 1
              }}
            >
              Apply
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Keywords Table */}
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Keyword</TableCell>
              <TableCell align="right">Min Likes</TableCell>
              <TableCell align="right">Min Retweets</TableCell>
              <TableCell align="right">Min Followers</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : keywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No keywords found. Add a new keyword to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              keywords.map((keyword) => (
                <TableRow key={keyword.id}>
                  <TableCell>{keyword.text}</TableCell>
                  <TableCell align="right">{keyword.minLikes}</TableCell>
                  <TableCell align="right">{keyword.minRetweets}</TableCell>
                  <TableCell align="right">{keyword.minFollowers}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditKeyword(keyword)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(keyword.id)}
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

      {/* Add/Edit Keyword Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? "Edit Keyword" : "Add New Keyword"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="text"
                label="Keyword Text"
                value={currentKeyword.text}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="minLikes"
                label="Minimum Likes"
                type="number"
                value={currentKeyword.minLikes}
                onChange={handleInputChange}
                fullWidth
                InputProps={{
                  inputProps: { min: 0 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="minRetweets"
                label="Minimum Retweets"
                type="number"
                value={currentKeyword.minRetweets}
                onChange={handleInputChange}
                fullWidth
                InputProps={{
                  inputProps: { min: 0 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="minFollowers"
                label="Minimum Followers"
                type="number"
                value={currentKeyword.minFollowers}
                onChange={handleInputChange}
                fullWidth
                InputProps={{
                  inputProps: { min: 0 }
                }}
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
            Are you sure you want to delete this keyword? This action will soft delete the keyword.
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

      {/* Filter Dialog removed - filters are now inline */}

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

export default TwitterKeywords;