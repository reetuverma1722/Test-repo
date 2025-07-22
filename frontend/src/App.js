import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./Pages/Dashboard";
import Login from "./Components/login/Login";
import DirectLogin from "./Components/login/DirectLogin";
import LandingPage from "./Pages/landing_page";
import { PrivateRoute } from "./Components/login/ProtectedRoute";
import GoalsTable from "./Pages/Post_Manager";
import HistoryTable from "./Pages/history";
import Keyword_Management from "./Pages/Keyword_Management";
import SocialMediaSettings from "./Pages/SocialMediaSettings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/direct-login" element={<DirectLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/postmanager" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/keyword-management" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/social-media-settings" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
