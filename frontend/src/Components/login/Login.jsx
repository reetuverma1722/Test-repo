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
} from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import authService from "../../services/authService";
import { useNavigate } from "react-router";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

      if (!isRegister) {
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
    const clientId = "OEkyejYzcXlKVkZmX2RVekFFUFc6MTpjaQ";
    const redirectUri = encodeURIComponent(
      "http://localhost:5000/api/auth/twitter/callback"
    );
    const scope = encodeURIComponent(
     'tweet.read tweet.write users.read offline.access'
    );
    const state = "state"; // Random string in production for CSRF protection
    const codeChallenge = "challenge"; // For now, static; later use real PKCE

    const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=plain`;

    window.location.href = twitterAuthUrl;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
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
      
      {/* Main Content */}
      <Container component="main" maxWidth="xs" sx={{ mt: 8, mb: 4 }}>
        <Card elevation={3} sx={{ borderRadius: 2, overflow: 'visible', maxWidth: 360, mx: 'auto' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" component="h1" align="center" gutterBottom sx={{ mb: 3 }}>
              {isRegister ? "Create Your Account" : "Choose Sign In Method"}
            </Typography>
            
            {!isRegister && (
              <>
                <Grid sx={{display:"flex", gap:3, flexDirection:"column"}}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google Sign In Failed")}
                    fullWidth
                    variant="contained"
                    startIcon={<MailOutlineIcon />}
                    sx={{ mb: 2 }}
                  >
                    Sign in with Google
                  </GoogleLogin>
                  <Button
                    onClick={redirectToTwitter}
                    variant="contained"
                  >
                    Sign In with Twitter
                  </Button>
                </Grid>
                <Divider sx={{ my: 2 }}>OR CONTINUE WITH</Divider>
              </>
            )}

            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="small"
                fullWidth
              />
              {isRegister && (
                <TextField
                  label="Confirm Password"
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  size="small"
                  fullWidth
                />
              )}
              <Button
                variant="contained"
                fullWidth
                onClick={handleSubmit}
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
