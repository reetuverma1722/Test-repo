import { createTheme } from '@mui/material/styles';

// Perplexity-inspired font-focused theme with minimal colors
// Emphasis on typography hierarchy and readability

// Define minimal neutral colors (inspired by Perplexity's approach)
const neutralColors = {
  primary: '#1a1a1a',      // Deep black for primary text
  secondary: '#666666',     // Medium gray for secondary text
  tertiary: '#999999',      // Light gray for tertiary text
  accent: '#2563eb',        // Subtle blue accent (minimal use)
  background: '#ffffff',    // Clean white background
  surface: '#f8f9fa',      // Light gray surface
  border: '#e5e7eb',       // Subtle border color
};

// Create a theme instance focused on typography
const theme = createTheme({
  palette: {
    primary: {
      main: neutralColors.primary,
      light: neutralColors.secondary,
      dark: '#000000',
      contrastText: '#ffffff',
    },
    secondary: {
      main: neutralColors.secondary,
      light: neutralColors.tertiary,
      dark: neutralColors.primary,
      contrastText: '#ffffff',
    },
    background: {
      default: neutralColors.background,
      paper: neutralColors.background,
    },
    text: {
      primary: neutralColors.primary,
      secondary: neutralColors.secondary,
      disabled: neutralColors.tertiary,
    },
    divider: neutralColors.border,
    error: {
      main: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
    },
    info: {
      main: neutralColors.accent,
    },
    success: {
      main: '#059669',
    },
  },
  typography: {
    // Custom font stack with fkGroteskNeue
    fontFamily: '"fkGroteskNeue", "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    
    // Enhanced typography hierarchy
    h1: {
      fontWeight: 700,
      fontSize: '2.75rem',
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      color: neutralColors.primary,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2.25rem',
      lineHeight: 1.25,
      letterSpacing: '-0.02em',
      color: neutralColors.primary,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.875rem',
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
      color: neutralColors.primary,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
      color: neutralColors.primary,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      letterSpacing: '-0.005em',
      color: neutralColors.primary,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.45,
      color: neutralColors.primary,
    },
    subtitle1: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
      color: neutralColors.secondary,
    },
    subtitle2: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
      color: neutralColors.secondary,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: neutralColors.primary,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: neutralColors.secondary,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: neutralColors.tertiary,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: neutralColors.tertiary,
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.02em',
      textTransform: 'none', // Remove uppercase for cleaner look
    },
  },
  shape: {
    borderRadius: 8, // Slightly more rounded for modern feel
  },
  components: {
    // Button styling focused on typography and minimal design
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          padding: '10px 20px',
          boxShadow: 'none',
          border: `1px solid ${neutralColors.border}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          backgroundColor: neutralColors.primary,
          color: '#ffffff',
          border: `1px solid ${neutralColors.primary}`,
          '&:hover': {
            backgroundColor: '#000000',
            border: '1px solid #000000',
          },
        },
        outlined: {
          borderColor: neutralColors.border,
          color: neutralColors.primary,
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: neutralColors.surface,
            borderColor: neutralColors.secondary,
          },
        },
        text: {
          color: neutralColors.primary,
          border: 'none',
          '&:hover': {
            backgroundColor: neutralColors.surface,
          },
        },
      },
    },
    
    // AppBar with minimal design
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: neutralColors.background,
          color: neutralColors.primary,
          boxShadow: `0 1px 0 ${neutralColors.border}`,
          borderBottom: `1px solid ${neutralColors.border}`,
        },
      },
    },
    
    // Drawer with clean typography focus
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: neutralColors.background,
          color: neutralColors.primary,
          borderRight: `1px solid ${neutralColors.border}`,
          boxShadow: 'none',
        },
      },
    },
    
    // List items with typography emphasis
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: neutralColors.surface,
            color: neutralColors.primary,
            fontWeight: 500,
            '&:hover': {
              backgroundColor: '#f1f3f4',
            },
          },
          '&:hover': {
            backgroundColor: neutralColors.surface,
          },
        },
      },
    },
    
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontWeight: 400,
          fontSize: '0.875rem',
          color: neutralColors.primary,
        },
        secondary: {
          fontSize: '0.75rem',
          color: neutralColors.tertiary,
        },
      },
    },
    
    // Cards with minimal shadow and typography focus
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          borderRadius: 12,
          border: `1px solid ${neutralColors.border}`,
          backgroundColor: neutralColors.background,
        },
      },
    },
    
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '20px 24px 16px',
        },
        title: {
          fontSize: '1.25rem',
          fontWeight: 600,
          color: neutralColors.primary,
          lineHeight: 1.4,
        },
        subheader: {
          fontSize: '0.875rem',
          color: neutralColors.secondary,
          marginTop: '4px',
        },
      },
    },
    
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '0 24px 20px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },
    
    // Typography components with enhanced styling
    MuiTypography: {
      styleOverrides: {
        root: {
          '&.MuiTypography-h1, &.MuiTypography-h2, &.MuiTypography-h3': {
            marginBottom: '0.5em',
          },
          '&.MuiTypography-h4, &.MuiTypography-h5, &.MuiTypography-h6': {
            marginBottom: '0.35em',
          },
          '&.MuiTypography-body1, &.MuiTypography-body2': {
            marginBottom: '1em',
          },
        },
      },
    },
    
    // Input fields with clean typography
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: neutralColors.background,
            '& fieldset': {
              borderColor: neutralColors.border,
            },
            '&:hover fieldset': {
              borderColor: neutralColors.secondary,
            },
            '&.Mui-focused fieldset': {
              borderColor: neutralColors.accent,
              borderWidth: 1,
            },
          },
          '& .MuiInputLabel-root': {
            color: neutralColors.secondary,
            fontSize: '0.875rem',
            fontWeight: 400,
          },
          '& .MuiInputBase-input': {
            fontSize: '0.875rem',
            color: neutralColors.primary,
            padding: '12px 14px',
          },
        },
      },
    },
    
    // Table styling with typography focus
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: neutralColors.surface,
            color: neutralColors.secondary,
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: `1px solid ${neutralColors.border}`,
          },
        },
      },
    },
    
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: neutralColors.primary,
          borderBottom: `1px solid ${neutralColors.border}`,
          padding: '12px 16px',
        },
      },
    },
  },
});

export default theme;