import { Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import LandingPage from "./pages/LandingPage";
import CreateRoom from "./pages/newRoom";
import Profile from "./pages/profile";
import ChatRoom from "./pages/chatRoom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/create-room" element={<CreateRoom />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/room/:roomId" element={<ChatRoom />} />
    </Routes>
  );
}

export default App;