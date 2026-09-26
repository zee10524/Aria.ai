import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [username] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return "Developer";
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.username || "Developer";
    } catch {
      return "Developer";
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    API.get("/rooms/mine")
      .then(({ data }) => setRooms(data.rooms || []))
      .catch(() => {
        setError("Failed to load your rooms. Please try again.");
        setRooms([]);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const filteredRooms = rooms.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q) ||
      (r.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const stats = [
    {
      title: "Your Rooms",
      value: String(rooms.length),
      sub: "Active memberships",
      icon: "group",
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-white">
      <Header search={search} onSearchChange={setSearch} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage="dashboard" />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-10">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {username}.
            </h1>
            <p className="text-gray-400">
              Here&apos;s what&apos;s happening in your dev rooms today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {stats.map((stat, index) => (
              <StatCard key={index} stat={stat} />
            ))}
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {search ? `Results for "${search}"` : "Your Rooms"}
            </h2>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          {loading ? (
            <p className="text-gray-500 text-sm">Loading rooms...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <RoomCard key={room._id} room={room} />
              ))}
              {!search && <CreateRoomCard />}
              {!search && <JoinRoomCard />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
