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
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  AccountCircle as AccountCircleIcon,
  SmartToy as SmartToyIcon,
} from "@mui/icons-material";
import {
  getKeywords,
  addKeyword,
  updateKeyword,
  deleteKeyword,
  getFilteredKeywords,
} from "../../services/keywordService";
import { getAccountsByPlatform } from "../../services/socialMediaAccountsService";
import axios from "axios";

const TwitterKeywords = () => {
  // State for keywords data
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for Twitter accounts
  const [twitterAccounts, setTwitterAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
 
  const [selectedKeywordPrompt, setSelectedKeywordPrompt] = useState(null);

  // State for prompt management
  const [promptManagementOpen, setPromptManagementOpen] = useState(false);
  const [keywordForPrompt, setKeywordForPrompt] = useState(null);
  const [availableModels, setAvailableModels] = useState([
    { id: "meta-llama/llama-3-8b-instruct", name: "Llama 3 8B Instruct", selected: true },
    { id: "meta-llama/llama-3-70b-instruct", name: "Llama 3 70B Instruct", selected: false },
    { id: "claude-3-opus", name: "Claude 3 Opus", selected: false },
    { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", selected: false },
    { id: "gpt-4o", name: "GPT-4o", selected: false }
  ]);
  const [selectedModel, setSelectedModel] = useState("meta-llama/llama-3-8b-instruct");
  
  const [availablePrompts, setAvailablePrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState("default");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isCustomPrompt, setIsCustomPrompt] = useState(false);
// Remove debug console log
  // State for form
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState({
    id: null,
    text: "",
    minLikes: 0,
    minRetweets: 0,
    minFollowers: 0,
    accountId: null,
    promptId: null,
  });

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keywordToDelete, setKeywordToDelete] = useState(null);

  // State for filtering
  const [filters, setFilters] = useState({
    text: "",
    minLikes: "",
    minRetweets: "",
    minFollowers: "",
    accountId: "",
  });

  // State for notifications
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // We'll no longer use mock data as we have real API endpoints

  // Fetch keywords on component mount
  useEffect(() => {
    fetchKeywords();
    fetchTwitterAccounts();
    fetchPrompts();
  }, []);
  
  // Fetch associated prompts for a keyword
  const fetchKeywordPrompts = async (keywordId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/keywords/${keywordId}/prompts`);
      if (response.data.success && response.data.data.length > 0) {
        // Get all prompts associated with this keyword
        const prompts = response.data.data;
        console.log(`Found ${prompts.length} prompts for keyword ID ${keywordId}:`, prompts);
        
        // Get the first associated prompt as the default selection
        const promptId = prompts[0].id;
        setSelectedKeywordPrompt(promptId);
        
        // Update the current keyword with the prompt ID
        setCurrentKeyword(prev => ({
          ...prev,
          promptId: promptId,
          prompts: prompts // Store all prompts
        }));
        
        return promptId;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching prompts for keyword ID ${keywordId}:`, error);
      if (error.response && error.response.status === 404) {
        console.log(`Keyword with ID ${keywordId} not found or has been deleted`);
      }
      return null;
    }
  };
  
  // Fetch prompts from the database
  const fetchPrompts = async () => {
    try {
      // Define standard templates that should always be available
      const standardTemplates = [
        {
          id: "default",
          name: "Default",
          content: `Reply smartly to this tweet:\n"${'{tweetContent}'}".\nMake it personal, friendly, and relevant. Be professional and do not use emojis and crisp and small contents`,
          model: "meta-llama/llama-3-8b-instruct"
        },
        {
          id: "professional",
          name: "Professional",
          content: `Craft a professional response to this tweet:\n"${'{tweetContent}'}".\nUse formal language, be concise, and maintain a business-appropriate tone.also do not add any other explanation other then reply just give reply content and limit should be 220 characters`,
          model: "meta-llama/llama-3-8b-instruct"
        },
        {
          id: "engaging",
          name: "Engaging",
          content: `Create an engaging reply to this tweet:\n"${'{tweetContent}'}".\nAsk a thoughtful question to encourage further conversation while being relevant to the original content.also do not add any other explanation other then reply just give reply content and limit should be 220 characters`,
          model: "meta-llama/llama-3-8b-instruct"
        },
        {
          id: "supportive",
          name: "Supportive",
          content: `Write a supportive response to this tweet:\n"${'{tweetContent}'}".\nShow empathy, offer encouragement, and be positive while keeping it brief and genuine.also do not add any other explanation other then reply just give reply content and limit should be 220 characters`,
          model: "meta-llama/llama-3-8b-instruct"
        }
      ];
      
      const response = await axios.get("http://localhost:5000/api/prompts");
      if (response.data.success && response.data.data) {
        // Map the prompts from the database to the format we need
        const dbPrompts = response.data.data.map(prompt => ({
          id: prompt.id.toString(),
          name: prompt.name,
          content: prompt.content,
          model: prompt.model || "meta-llama/llama-3-8b-instruct"
        }));
        
        // Merge database prompts with standard templates
        // For each standard template, check if it exists in dbPrompts
        // If it exists, use the database version, otherwise use the standard version
        const mergedPrompts = [...dbPrompts];
        
        standardTemplates.forEach(standardTemplate => {
          const existingPrompt = dbPrompts.find(p => p.name === standardTemplate.name);
          if (!existingPrompt) {
            mergedPrompts.push(standardTemplate);
          }
        });
        
        setAvailablePrompts(mergedPrompts);
        
        // Find the default prompt
        const defaultPrompt = mergedPrompts.find(p => p.name === "Default");
        if (defaultPrompt) {
          setSelectedPrompt(defaultPrompt.id);
          setSelectedModel(defaultPrompt.model);
        }
        
        // Check if there's a saved custom prompt in localStorage
        const savedCustomPrompt = localStorage.getItem("customPrompt");
        
        if (savedCustomPrompt) {
          setIsCustomPrompt(true);
          setCustomPrompt(savedCustomPrompt);
        }
        
        // Find any model marked as selected in the availableModels array
        const selectedModelObj = availableModels.find(model => model.selected);
        if (selectedModelObj) {
          setSelectedModel(selectedModelObj.id);
        }
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
      // If we can't fetch prompts from the database, use the standard templates
      setAvailablePrompts([
        {
          id: "default",
          name: "Default",
          content: `Reply smartly to this tweet:\n"${'{tweetContent}'}".\nMake it personal, friendly, and relevant. Be professional and do not use emojis and crisp and small contents. also do not add any other explanation other then reply just give reply content and limit should be 220 characters`,
          model: "meta-llama/llama-3-8b-instruct"
        },
        {
          id: "professional",
          name: "Professional",
          content: `Craft a professional response to this tweet:\n"${'{tweetContent}'}".\nUse formal language, be concise, and maintain a business-appropriate tone.also do not add any other explanation other then reply just give reply content and limit should be 220 characters`,
          model: "meta-llama/llama-3-8b-instruct"
        },
        {
          id: "engaging",
          name: "Engaging",
          content: `Create an engaging reply to this tweet:\n"${'{tweetContent}'}".\nAsk a thoughtful question to encourage further conversation while being relevant to the original content.also do not add any other explanation other then reply just give reply content and limit should be 220 characters`,
          model: "meta-llama/llama-3-8b-instruct"
        },
        {
          id: "supportive",
          name: "Supportive",
          content: `Write a supportive response to this tweet:\n"${'{tweetContent}'}".\nShow empathy, offer encouragement, and be positive while keeping it brief and genuine.also do not add any other explanation other then reply just give reply content and limit should be 220 characters`,
          model: "meta-llama/llama-3-8b-instruct"
        }
      ]);
    }
  };
  
  // Fetch keywords when selected account changes
  useEffect(() => {
    fetchKeywords();
  }, [selectedAccount]);

  // Fetch Twitter accounts
  const fetchTwitterAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const token = localStorage.getItem("token");
      const response = await getAccountsByPlatform("twitter", token);
      setTwitterAccounts(response.data || []);
    } catch (err) {
      console.error("Error fetching Twitter accounts:", err);
      setTwitterAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Fetch all keywords
  const fetchKeywords = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await getKeywords(selectedAccount, token);
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
      // Include the selected account in the filters if one is selected
      const filtersWithAccount = {
        ...filters,
        accountId: selectedAccount || filters.accountId,
      };
      const response = await getFilteredKeywords(filtersWithAccount, token);
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
      minFollowers: "",
      accountId: "",
    });
    // Keep the selected account filter when clearing other filters
    fetchKeywords();
  };

  // Handle account change
  const handleAccountChange = (accountId) => {
    setSelectedAccount(accountId);
    // Refresh keywords for the selected account will happen via useEffect
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentKeyword({
      ...currentKeyword,
      [name]: name === "text" || name === "accountId" ? value : Number(value),
    });
  };

  // Handle filter input changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  // Open form for adding new keyword
  const handleAddKeyword = () => {
    setCurrentKeyword({
      id: null,
      text: "",
      minLikes: 0,
      minRetweets: 0,
      minFollowers: 0,
      accountId: selectedAccount,
    });
    setIsEditing(false);
    setFormOpen(true);
  };

  // Open form for editing keyword
  const handleEditKeyword = async (keyword) => {
    setCurrentKeyword({
      id: keyword.id,
      text: keyword.text,
      minLikes: keyword.minLikes,
      minRetweets: keyword.minRetweets,
      minFollowers: keyword.minFollowers,
      accountId: keyword.accountId,
      promptId: null, // Will be populated by fetchKeywordPrompts
    });
    setIsEditing(true);
    setFormOpen(true);
    
    // Fetch associated prompts for this keyword
    const promptId = await fetchKeywordPrompts(keyword.id);
    if (promptId) {
      setSelectedKeywordPrompt(promptId);
    } else {
      setSelectedKeywordPrompt(null);
    }
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
        severity: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // Create a copy of the keyword data with accountId converted to number if it exists
      const keywordData = {
        ...currentKeyword,
        // Make sure accountId is properly converted to a number or set to null if empty string
        accountId: currentKeyword.accountId ? Number(currentKeyword.accountId) : null
      };

      console.log('Submitting keyword with data:', keywordData);

      let keywordId;
      if (isEditing) {
        await updateKeyword(currentKeyword.id, keywordData, token);
        keywordId = currentKeyword.id;
      } else {
        const response = await addKeyword(keywordData, token);
        keywordId = response.data.id;
      }

      // If a prompt is selected, associate it with the keyword
      if (selectedKeywordPrompt && keywordId) {
        try {
          // First, check if there's already an association
          const existingPrompts = await axios.get(`http://localhost:5000/api/keywords/${keywordId}/prompts`);
          
          if (existingPrompts.data.success && existingPrompts.data.data.length > 0) {
            // If there's an existing association and it's different, update it
            const existingPromptId = existingPrompts.data.data[0].id;
            if (existingPromptId !== selectedKeywordPrompt) {
              // Remove the existing association
              await axios.delete(`http://localhost:5000/api/keywords/${keywordId}/prompts/${existingPromptId}`);
              // Create the new association
              await axios.post(`http://localhost:5000/api/keywords/${keywordId}/prompts`, {
                promptId: selectedKeywordPrompt
              });
            }
          } else {
            // If there's no existing association, create a new one
            await axios.post(`http://localhost:5000/api/keywords/${keywordId}/prompts`, {
              promptId: selectedKeywordPrompt
            });
          }
        } catch (promptErr) {
          console.error("Error associating prompt with keyword:", promptErr);
          // Don't fail the whole operation if prompt association fails
        }
      }

      // Refresh the keywords list
      await fetchKeywords();

      setNotification({
        open: true,
        message: `Keyword ${isEditing ? "updated" : "added"} successfully`,
        severity: "success",
      });
      setFormOpen(false);
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to ${
          isEditing ? "update" : "add"
        } keyword. Please try again.`,
        severity: "error",
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
        severity: "success",
      });
    } catch (err) {
      setNotification({
        open: true,
        message: "Failed to delete keyword. Please try again.",
        severity: "error",
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
      open: false,
    });
  };

  return (
    <Box>
      {/* Header and Actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{fontSize:"0.9rem"}}>Twitter Keywords Management</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddKeyword}
            sx={{backgroundColor:"#4896A0",border:"none"}}
          >
            Add Keyword
          </Button>
         
        </Box>
      </Box>

      {/* Account Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{fontSize:"0.9rem"}}>
              Select Twitter Account:
            </Typography>
          </Grid>
          <Grid item xs={12} sm={9}>
            <FormControl fullWidth size="small">
              <Select
                value={selectedAccount || ""}
                onChange={(e) => handleAccountChange(e.target.value)}
                displayEmpty
                sx={{ minWidth: 250 }}
              >
                <MenuItem value="" sx={{fontSize:"0.9rem"}}>
                  <em sx={{fontSize:"0.9rem"}}>All Accounts</em>
                </MenuItem>
                {twitterAccounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {`${account.accountName}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

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
                style: { fontSize: "0.8rem" },
              }}
              InputLabelProps={{
                style: { fontSize: "0.8rem" },
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
                style: { fontSize: "0.8rem" },
              }}
              InputLabelProps={{
                style: { fontSize: "0.8rem" },
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
                style: { fontSize: "0.8rem" },
              }}
              InputLabelProps={{
                style: { fontSize: "0.8rem" },
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
                style: { fontSize: "0.8rem" },
              }}
              InputLabelProps={{
                style: { fontSize: "0.8rem" },
              }}
            />
          </Grid>
          <Grid item xs={6} sm={0.9}>
            <Tooltip title="Clear filters">
              <IconButton
                onClick={clearFilters}
                size="small"
                sx={{
                  width: "28px",
                  height: "28px",
                  ml: 0.5,
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
              startIcon={<FilterIcon sx={{ fontSize: "0.8rem" }} />}
              size="small"
              sx={{
                minWidth: "28px",
                height: "28px",
                border:"none",
                backgroundColor: "#4896A0",
                fontSize: "0.7rem",
                py: 0,
                px: 1,
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
              <TableCell>Account</TableCell>
              <TableCell align="right">Min Likes</TableCell>
              <TableCell align="right">Min Retweets</TableCell>
              <TableCell align="right">Min Followers</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : keywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 2 }}
                  >
                    No keywords found. Add a new keyword to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              keywords.map((keyword) => (
                <TableRow key={keyword.id}>
                  <TableCell>{keyword.text}</TableCell>
                  <TableCell>
                    {keyword.accountId ?
                      `${keyword.accountName}` :
                      <em>Default (All Accounts)</em>
                    }
                  </TableCell>
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
                    <Tooltip title="Manage Prompt">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setKeywordForPrompt(keyword);
                          fetchKeywordPrompts(keyword.id).then(promptId => {
                            if (promptId) {
                              setSelectedPrompt(promptId);
                              
                              // Get the prompt details but don't automatically change the model
                              // This keeps the model selection independent from the prompt selection
                              const prompt = availablePrompts.find(p => p.id === promptId);
                              if (prompt) {
                                console.log(`Loaded prompt: ${prompt.name}, associated model: ${prompt.model}`);
                                // Note: We're intentionally NOT updating the model here to keep selections independent
                              }
                            }
                            setPromptManagementOpen(true);
                          });
                        }}
                      
                      >
                        <SmartToyIcon fontSize="small" />
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
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? "Edit Keyword" : "Add New Keyword"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* First Row - Full width */}
            <Grid >
              <TextField
                name="text"
                label="Keyword Text"
                value={currentKeyword.text}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid >
              <TextField
                name="minLikes"
                label="Minimum Likes"
                type="number"
                value={currentKeyword.minLikes}
                onChange={handleInputChange}
                fullWidth
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid>
              <TextField
                name="minRetweets"
                label="Minimum Retweets"
                type="number"
                value={currentKeyword.minRetweets}
                onChange={handleInputChange}
                fullWidth
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid >
              <TextField
                name="minFollowers"
                label="Minimum Followers"
                type="number"
                value={currentKeyword.minFollowers}
                onChange={handleInputChange}
                fullWidth
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            {/* Twitter Account Selection - Full width on its own line */}
            <Grid sx={{ mt: 2 }}>
             
                <InputLabel id="account-select-label" >Twitter Account</InputLabel>
                <Select
                  labelId="account-select-label"
                  id="account-select"
                  name="accountId"
                  value={currentKeyword.accountId || ""}
                  onChange={handleInputChange}
                  label="Twitter Account"
                  sx={{width:"190%"}}
                >
                  <MenuItem value="">
                    <em> (All Accounts)</em>
                  </MenuItem>
                  {twitterAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {`${account.accountName}`}
                    </MenuItem>
                  ))}
                </Select>
              
            </Grid>
            
          
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? (
              <CircularProgress size={24} />
            ) : isEditing ? (
              "Update"
            ) : (
              "Add"
            )}
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
            Are you sure you want to delete this keyword? This action will soft
            delete the keyword.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filter Dialog removed - filters are now inline */}

      {/* Prompt Management Dialog */}
      <Dialog
        open={promptManagementOpen}
        onClose={() => setPromptManagementOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {keywordForPrompt
            ? `Manage AI Reply Prompt for Keyword: "${keywordForPrompt.text}"`
            : "Manage AI Reply Prompts"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Select Model
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={selectedModel}
                  onChange={(e) => {
                    const newSelectedModel = e.target.value;
                    setSelectedModel(newSelectedModel);
                    
                    // Update the availableModels array to track the selected model
                    const updatedModels = availableModels.map(model => ({
                      ...model,
                      selected: model.id === newSelectedModel
                    }));
                    setAvailableModels(updatedModels);
                    
                    // Don't update the prompt selection when model changes
                    // This keeps the model and prompt selections independent
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                    },
                    "& .MuiSelect-select": {
                      padding: "10px 14px",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                        "& .MuiMenuItem-root": {
                          fontSize: "0.9rem",
                          padding: "8px 16px",
                        },
                        "& .MuiMenuItem-root.Mui-selected": {
                          backgroundColor: "rgba(77, 153, 163, 0.1)",
                        },
                        "& .MuiMenuItem-root.Mui-selected:hover": {
                          backgroundColor: "rgba(77, 153, 163, 0.2)",
                        },
                      },
                    },
                  }}
                >
                  {availableModels.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span>{model.name}</span>
                        {selectedModel === model.id && (
                          <Chip
                            label="Selected"
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(72, 150, 160, 0.1)',
                              color: '#4D99A3',
                              height: '20px',
                              fontSize: '0.7rem'
                            }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Select Prompt Template
              </Typography>
              {keywordForPrompt && keywordForPrompt.prompts && keywordForPrompt.prompts.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  This keyword has {keywordForPrompt.prompts.length} associated prompt{keywordForPrompt.prompts.length > 1 ? 's' : ''}
                </Typography>
              )}
              <FormControl fullWidth>
                <Select
                  value={isCustomPrompt ? "custom" : selectedPrompt}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setIsCustomPrompt(true);
                    } else {
                      setIsCustomPrompt(false);
                      setSelectedPrompt(e.target.value);
                      
                      // Don't automatically update the model when a prompt is selected
                      // This keeps the model selection independent from the prompt selection
                      // The user can manually select which model to use with which prompt
                      
                      // Get the prompt object for reference only
                      const selectedPromptObj = availablePrompts.find(p => p.id === e.target.value);
                      console.log(`Selected prompt: ${selectedPromptObj?.name}, associated model: ${selectedPromptObj?.model}`);
                      
                      // Note: We're intentionally NOT updating the model here to keep selections independent
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                    },
                    "& .MuiSelect-select": {
                      padding: "10px 14px",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                        "& .MuiMenuItem-root": {
                          fontSize: "0.9rem",
                          padding: "8px 16px",
                        },
                        "& .MuiMenuItem-root.Mui-selected": {
                          backgroundColor: "rgba(77, 153, 163, 0.1)",
                        },
                        "& .MuiMenuItem-root.Mui-selected:hover": {
                          backgroundColor: "rgba(77, 153, 163, 0.2)",
                        },
                      },
                    },
                  }}
                >
                  {/* Standard Templates Section */}
                  <MenuItem disabled sx={{ opacity: 1, fontWeight: 600, color: '#4D99A3', fontSize: '0.85rem', py: 0.5 }}>
                    Standard Templates
                  </MenuItem>
                  {availablePrompts
                    .filter(prompt => ["Default", "Professional", "Supportive", "Engaging"].includes(prompt.name))
                    .map((prompt) => (
                      <MenuItem key={prompt.id} value={prompt.id} sx={{ pl: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span>{prompt.name}</span>
                          {selectedPrompt === prompt.id && (
                            <Chip
                              label="Selected"
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(72, 150, 160, 0.1)',
                                color: '#4D99A3',
                                height: '20px',
                                fontSize: '0.7rem'
                              }}
                            />
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  }
                  
                  {/* Other Templates Section */}
                  <MenuItem disabled sx={{ opacity: 1, fontWeight: 600, color: '#4D99A3', fontSize: '0.85rem', py: 0.5, mt: 1, borderTop: '1px solid #eee' }}>
                    Other Templates
                  </MenuItem>
                  {availablePrompts
                    .filter(prompt => !["Default", "Professional", "Supportive", "Engaging"].includes(prompt.name))
                    .map((prompt) => (
                      <MenuItem key={prompt.id} value={prompt.id} sx={{ pl: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span>{prompt.name}</span>
                          {selectedPrompt === prompt.id && (
                            <Chip
                              label="Selected"
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(72, 150, 160, 0.1)',
                                color: '#4D99A3',
                                height: '20px',
                                fontSize: '0.7rem'
                              }}
                            />
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  }
                  
                  {/* Custom Prompt Option */}
                  <MenuItem disabled sx={{ opacity: 1, fontWeight: 600, color: '#4D99A3', fontSize: '0.85rem', py: 0.5, mt: 1, borderTop: '1px solid #eee' }}>
                    Create New
                  </MenuItem>
                  <MenuItem value="custom" sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>Custom Prompt</span>
                      {isCustomPrompt && (
                        <Chip
                          label="Selected"
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(72, 150, 160, 0.1)',
                            color: '#4D99A3',
                            height: '20px',
                            fontSize: '0.7rem'
                          }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {isCustomPrompt && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Custom Prompt
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter your custom prompt here. Use {tweetContent} as a placeholder for the tweet text."
                  helperText="Use {tweetContent} as a placeholder for the tweet text."
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                      transition: "all 0.3s",
                      fontSize: "0.95rem",
                    },
                    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(77, 153, 163, 0.5)",
                    },
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#4D99A3",
                    },
                    "& .MuiFormHelperText-root": {
                      fontSize: "0.8rem",
                      marginTop: "8px",
                    },
                  }}
                />
              </Grid>
            )}
            
         
          </Grid>
             <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Preview
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  This is how your prompt will appear to the AI model
                </Typography>
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  backgroundColor: "rgba(72, 150, 160, 0.04)",
                  borderColor: "rgba(72, 150, 160, 0.2)",
                  maxHeight: "300px",
                  overflow: "auto"
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {isCustomPrompt
                    ? customPrompt
                    : availablePrompts.find(p => p.id === selectedPrompt)?.content || ""}
                </Typography>
              </Paper>
            </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptManagementOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                // Store selected model in state
                // Update the availableModels array to track the currently selected model
                const updatedModels = availableModels.map(model => ({
                  ...model,
                  selected: model.id === selectedModel
                }));
                setAvailableModels(updatedModels);
                
                // Only store custom prompt in localStorage if needed
                if (isCustomPrompt) {
                  localStorage.setItem("customPrompt", customPrompt);
                }
                let promptId;
                
                // Save to database if it's a custom prompt
                if (isCustomPrompt) {
                  localStorage.setItem("customPrompt", customPrompt);
                  
                  // Create a new prompt in the database
                  const promptName = keywordForPrompt
                    ? `Prompt for ${keywordForPrompt.text} (${new Date().toLocaleString()})`
                    : "Custom " + new Date().toLocaleString();
                    
                  const response = await axios.post("http://localhost:5000/api/prompts", {
                    name: promptName,
                    model: selectedModel,
                    content: customPrompt,
                    is_default: false
                  });
                  
                  promptId = response.data.data.id;
                  
                  // Refresh prompts
                  fetchPrompts();
                } else {
                  // Update the selected prompt in the database with the selected model
                  promptId = selectedPrompt;
                  const selectedPromptObj = availablePrompts.find(p => p.id === promptId);
                  
                  if (selectedPromptObj) {
                    // Check if the promptId is a number or can be converted to a number
                    // Standard templates have string IDs like "professional", "supportive", etc.
                    // Database prompts have numeric IDs that can be converted to integers
                    const isNumericId = !isNaN(parseInt(promptId));
                    
                    if (isNumericId) {
                      try {
                        await axios.put(`http://localhost:5000/api/prompts/${promptId}`, {
                          name: selectedPromptObj.name,
                          model: selectedModel,
                          content: selectedPromptObj.content,
                          is_default: selectedPromptObj.name === "Default"
                        });
                      } catch (error) {
                        console.error("Error updating prompt:", error);
                        // Create a new prompt instead if update fails
                        const response = await axios.post("http://localhost:5000/api/prompts", {
                          name: selectedPromptObj.name,
                          model: selectedModel,
                          content: selectedPromptObj.content,
                          is_default: selectedPromptObj.name === "Default"
                        });
                        promptId = response.data.data.id;
                      }
                    } else {
                      // For standard templates with string IDs, create a new prompt in the database
                      console.log(`Creating new prompt based on standard template: ${selectedPromptObj.name}`);
                      const response = await axios.post("http://localhost:5000/api/prompts", {
                        name: selectedPromptObj.name,
                        model: selectedModel,
                        content: selectedPromptObj.content,
                        is_default: selectedPromptObj.name === "Default"
                      });
                      promptId = response.data.data.id;
                    }
                    
                    // Refresh prompts
                    fetchPrompts();
                  }
                }
                
                // If this is for a specific keyword, associate the prompt with the keyword
                if (keywordForPrompt && promptId) {
                  try {
                    // First, check if there's already an association
                    try {
                      const existingPrompts = await axios.get(`http://localhost:5000/api/keywords/${keywordForPrompt.id}/prompts`);
                      
                      if (existingPrompts.data.success && existingPrompts.data.data.length > 0) {
                        // Check if the prompt we want to add is already associated
                        const alreadyAssociated = existingPrompts.data.data.some(p => p.id === promptId);
                        
                        if (!alreadyAssociated) {
                          // Add the new prompt association without removing existing ones
                          await axios.post(`http://localhost:5000/api/keywords/${keywordForPrompt.id}/prompts`, {
                            promptId: promptId
                          });
                        }
                      } else {
                        // If there's no existing association, create a new one
                        await axios.post(`http://localhost:5000/api/keywords/${keywordForPrompt.id}/prompts`, {
                          promptId: promptId
                        });
                      }
                    } catch (error) {
                      if (error.response && error.response.status === 404) {
                        console.log(`Keyword with ID ${keywordForPrompt.id} not found or has been deleted`);
                      } else {
                        // Create the new association anyway
                        await axios.post(`http://localhost:5000/api/keywords/${keywordForPrompt.id}/prompts`, {
                          promptId: promptId
                        });
                      }
                    }
                    
                    // Refresh keywords to show the updated associations
                    fetchKeywords();
                  } catch (promptErr) {
                    console.error("Error associating prompt with keyword:", promptErr);
                    // Don't fail the whole operation if prompt association fails
                  }
                }
                
                setPromptManagementOpen(false);
                setKeywordForPrompt(null);
                setNotification({
                  open: true,
                  message: keywordForPrompt
                    ? `Prompt for keyword "${keywordForPrompt.text}" saved successfully`
                    : "Prompt settings saved successfully",
                  severity: "success",
                });
              } catch (error) {
                console.error("Error saving prompt:", error);
                setNotification({
                  open: true,
                  message: "Failed to save prompt settings",
                  severity: "error",
                });
              }
            }}
            variant="contained"
            sx={{ backgroundColor: "#4896A0" }}
          >
            Save
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

export default TwitterKeywords;
