import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Loader2, ArrowRight } from "lucide-react";

const MotionDiv = motion.div;
import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import API from "../lib/api";

export default function Explore() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    API.get("/rooms/explore")
      .then(({ data }) => setRooms(data.rooms || []))
      .catch(() => setError("Failed to load public rooms."))
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

  const handleJoin = async (room) => {
    if (room.isMember) {
      navigate(`/room/${room._id}`);
      return;
    }
    setJoining(room._id);
    try {
      await API.post("/rooms/join", { code: room.code });
      navigate(`/room/${room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join room.");
      setJoining(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-white">
      <Header search={search} onSearchChange={setSearch} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage="explore" />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-10 flex items-center gap-3">
            <Compass size={28} className="text-lime-400" />
            <div>
              <h1 className="text-3xl font-bold">Explore Rooms</h1>
              <p className="text-gray-400 text-sm mt-1">
                Browse public rooms and join with one click.
              </p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

          {loading ? (
            <p className="text-gray-500 text-sm">Loading public rooms...</p>
          ) : filteredRooms.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {search ? "No rooms match your search." : "No public rooms available yet."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <PublicRoomCard
                  key={room._id}
                  room={room}
                  isMember={room.isMember}
                  joining={joining === room._id}
                  onJoin={() => handleJoin(room)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PublicRoomCard({ room, isMember, joining, onJoin }) {
  return (
    <MotionDiv
      whileHover={{ scale: 1.01 }}
      className="bg-[#18181F] border border-[#1F2937] rounded-xl p-6 hover:border-lime-400/50 transition flex flex-col gap-4"
    >
      <div>
        <h3 className="text-lg font-semibold mb-1 truncate">{room.name}</h3>
        {room.description && (
          <p className="text-sm text-gray-400 line-clamp-2">{room.description}</p>
        )}
      </div>

      {room.tags && room.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {room.tags.map((tag, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs bg-[#2A2A35] border border-[#1F2937] rounded font-mono"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {room.owner && (
        <p className="text-xs text-gray-600">
          Owner: <span className="text-gray-400">{room.owner.username}</span>
        </p>
      )}

      <button
        onClick={onJoin}
        disabled={joining}
        className="mt-auto w-full flex items-center justify-center gap-2 py-2 rounded-lg
                   bg-lime-400 hover:bg-lime-300 text-black font-semibold text-sm
                   disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {joining ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isMember ? (
          <>
            Open Room <ArrowRight size={16} />
          </>
        ) : (
          <>
            Join Room <ArrowRight size={16} />
          </>
        )}
      </button>
    </MotionDiv>
  );
}
