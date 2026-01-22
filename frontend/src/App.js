import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/landing";
import Authentication from "./pages/authentication";
import Home from "./pages/home";
import History from "./pages/history";
import VideoMeet from "./pages/VideoMeet";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Authentication />} />
        <Route path="/home" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/:url" element={<VideoMeet />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
