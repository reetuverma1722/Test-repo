import React, { useState } from 'react';
import { Snackbar, Alert, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const SuccessPopup = ({ open, onClose }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3000} // auto-close in 3 sec
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: "right" }}
    >
      <Alert
        onClose={onClose}
        severity="success"
        variant="filled"
        sx={{ width: '100%' }}
      >
        ✅ Posted Successfully!
      </Alert>
    </Snackbar>
  );
};

export default SuccessPopup;
