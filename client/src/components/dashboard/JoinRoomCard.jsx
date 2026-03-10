import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, ArrowRight, Loader2 } from "lucide-react";
import API from "../../lib/api";

export default function JoinRoomCard() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/rooms/join", { code: code.trim().toUpperCase() });
      navigate(`/room/${res.data.room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Room not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center border-2 border-dashed border-gray-700 rounded-xl p-6 min-h-[200px] hover:border-lime-400/50 hover:bg-[#1F1F27] transition">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#2A2A35] flex items-center justify-center">
          <Hash size={16} className="text-lime-400" />
        </div>
        <h3 className="text-base font-semibold">Join a Room</h3>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Enter a 6-character room code to join a teammate's room.
      </p>

      <form onSubmit={handleJoin} className="space-y-3">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          maxLength={6}
          placeholder="e.g. SNKCXP"
          className="w-full px-3 py-2 rounded-lg bg-[#0D0D12] border border-gray-700 text-white font-mono tracking-widest text-center uppercase placeholder-gray-600 focus:outline-none focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/30 transition"
        />

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Join Room <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
