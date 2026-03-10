import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import staticData from "../data/dashboard.json";
import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import StatCard from "../components/dashboard/StatCard";
import RoomCard from "../components/dashboard/RoomCard";
import CreateRoomCard from "../components/dashboard/CreateRoomCard";
import JoinRoomCard from "../components/dashboard/JoinRoomCard";
import API from "../lib/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [username, setUsername] = useState("Developer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Set auth header for all API requests
    API.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Fetch user's rooms
    API.get("/rooms/mine")
      .then(({ data }) => {
        setRooms(data.rooms || []);
      })
      .catch(() => {
        // fallback to empty
        setRooms([]);
      })
      .finally(() => setLoading(false));

    // Decode username from JWT payload
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.username) setUsername(payload.username);
    } catch {
      // ignore
    }
  }, [navigate]);

  const stats = [
    {
      title: "Your Rooms",
      value: String(rooms.length),
      sub: "Active memberships",
      icon: "group",
    },
    ...staticData.stats.slice(1),
  ];

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-white">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-8">
          {/* Welcome Section */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {username}.
            </h1>
            <p className="text-gray-400">
              Here's what's happening in your dev rooms today.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {stats.map((stat, index) => (
              <StatCard key={index} stat={stat} />
            ))}
          </div>

          {/* Rooms */}
          <h2 className="text-xl font-bold mb-6">Your Rooms</h2>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading rooms…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <RoomCard key={room._id} room={room} />
              ))}
              <CreateRoomCard />
              <JoinRoomCard />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}