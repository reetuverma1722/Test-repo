import React, { useState } from "react";
import {
  TextField,
  Button,
  Divider,
  Typography,
  Box,
  Link,
  Alert,
  Grid,
  AppBar,
  Toolbar,
  Container,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
} from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import authService from "../../services/authService";
import { useNavigate } from "react-router";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

const Login = ({ isPopup = false }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const toggleMode = () => {
    setIsRegister((prev) => !prev);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setConfirmPass("");
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (isRegister && password !== confirmPass) {
      setError("Passwords don't match");
      return;
    }

    try {
      const data = isRegister
        ? await authService.register({ email, password })
        : await authService.login(email, password);

      setSuccess(data.message);

      if (isRegister) {
        // After successful registration, automatically log in the user
        try {
          const loginData = await authService.login(email, password);
          console.log("Logged in user:", loginData.user);
          localStorage.setItem("user", JSON.stringify(loginData.user));
          localStorage.setItem("token", loginData.token);
          navigate("/dashboard");
        } catch (loginErr) {
          // If auto-login fails, show success message but don't navigate
          console.error("Auto-login after registration failed:", loginErr);
          setSuccess(data.message + " Please log in with your new credentials.");
        }
      } else {
        console.log("Logged in user:", data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    console.log("✅ Google Login Response:", credentialResponse);

    if (!credentialResponse.credential) {
      setError("No credential returned from Google");
      return;
    }

    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log("✅ Decoded Google User:", decoded);

      const { email, name, sub: googleId } = decoded;

      const res = await fetch("http://localhost:5000/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, googleId }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("❌ Google Login Error:", err);
      setError("Google login failed");
    }
  };

  const redirectToTwitter = () => {
    try {
      const clientId = "OEkyejYzcXlKVkZmX2RVekFFUFc6MTpjaQ";
      const redirectUri = encodeURIComponent(
        "http://localhost:5000/api/auth/twitter/callback"
      );
      const scope = encodeURIComponent(
       'tweet.read tweet.write users.read offline.access'
      );
      // Generate a more unique state with timestamp to help with rate limiting
      const state = `state_${Date.now()}`; // Random string in production for CSRF protection
      const codeChallenge = "challenge"; // For now, static; later use real PKCE

      const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=plain`;

      // Add a small delay before redirecting to avoid rapid successive requests
      setTimeout(() => {
        window.location.href = twitterAuthUrl;
      }, 500);
    } catch (error) {
      console.error("Error redirecting to Twitter:", error);
      setError("Failed to connect to Twitter. Please try again later.");
    }
  };

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      minHeight: isPopup ? "auto" : "100vh",
      background: "transparent"
    }}>
      {/* Header - Only show when not in popup mode */}
      {!isPopup && (
        <>
          <AppBar
            position="fixed"
            elevation={2}
            sx={{
              backgroundColor: 'white',
              color: 'text.primary',
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
                  color: 'text.primary'
                }}
              >
                Buzzly
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Toolbar /> {/* Spacer */}
        </>
      )}
      
      {/* Main Content */}
      <Container component="main" maxWidth={isPopup ? "sm" : "xs"} sx={{
        mt: isPopup ? 0 : 8,
        mb: isPopup ? 0 : 4,
        p: isPopup ? 0 : undefined,
        width: isPopup ? '100%' : undefined,
        padding:"45px"
      }}>
        <Card elevation={isPopup ? 0 : 3} sx={{
          borderRadius: 2,
          overflow: 'visible',
          maxWidth: isPopup ? '95%' : 360,
          width: isPopup ? '95%' : 'auto',
          mx: 'auto',
          backgroundColor: 'transparent',
          boxShadow: isPopup ? 'none' : undefined,
          
        }}>
          <CardContent sx={{ p: 4, backgroundColor: 'transparent' }}>
            <Typography variant="h5" component="h1" align="center" gutterBottom sx={{ mb: 3 }}>
              {isRegister ? "Create Your Account" : "Choose Sign In Method"}
            </Typography>
            
            {!isRegister && (
              <>
                <Grid sx={{display:"flex", gap:3, flexDirection:"column", width: "100%"}}>
                  <div style={{ width: '100%' }}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError("Google Sign In Failed")}
                      fullWidth
                      variant="contained"
                      startIcon={<MailOutlineIcon />}
                      sx={{ mb: 2, width: '100%', height: '48px' }}
                      size="large"
                    >
                      Sign in with Google
                    </GoogleLogin>
                  </div>
                  <Button
                    onClick={redirectToTwitter}
                    variant="contained"
                    fullWidth
                    size="large"
                  >
                    Sign In with Twitter
                  </Button>
                </Grid>
                <Divider sx={{ my: 2 }}>OR CONTINUE WITH</Divider>
              </>
            )}

            <Box display="flex" flexDirection="column" gap={2} width="100%">
              <TextField
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="medium"
                fullWidth
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="medium"
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {isRegister && (
                <TextField
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  size="medium"
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              <Button
                variant="contained"
                fullWidth
                onClick={handleSubmit}
                size="large"
              >
                {isRegister ? "Register" : "Sign in with Password"}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}

            <Box textAlign="center" mt={3}>
              <Typography variant="body2" sx={{ fontFamily: "var(--brand-font)" }}>
                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                <Link component="button" onClick={toggleMode}>
                  {isRegister ? "Login" : "Register"}
                </Link>
              </Typography>
            </Box>

            {!isRegister && (
              <Typography
                variant="caption"
                display="block"
                textAlign="center"
                mt={3}
                color="text.secondary"
                sx={{ fontFamily: "var(--brand-font)" }}
              >
                For support, contact your system administrator
              </Typography>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login;
