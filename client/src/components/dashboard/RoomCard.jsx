import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RoomCard({ room }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const title = room.name || "Unnamed Room";
  const lastActive = timeAgo(room.lastActiveAt);
  const description = room.description || null;
  const tags = room.tags || [];
  const unreadCount = room.unreadCount || 0;
  const roleLabel =
    room.membershipRole === "owner"
      ? "Owner"
      : room.membershipRole === "member"
      ? "Member"
      : null;

  return (
    <div
      className="bg-[#18181F] border border-[#1F2937] rounded-xl p-6 hover:border-lime-400/50 transition group cursor-pointer"
      onClick={() => navigate(`/room/${room._id}`)}
    >
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-lg font-semibold group-hover:text-lime-400 transition truncate">
              {title}
            </h3>
            {unreadCount > 0 && (
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-lime-400 text-black text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                room.isPrivate === false
                  ? "border-blue-400/30 text-blue-400 bg-blue-400/10"
                  : "border-gray-600/30 text-gray-500 bg-gray-600/10"
              }`}
            >
              {room.isPrivate === false ? "Public" : "Private"}
            </span>
            {roleLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-lime-400/30 text-lime-400 bg-lime-400/10">
                {roleLabel}
              </span>
            )}
          </div>
        </div>
        {lastActive && (
          <p className="text-xs text-gray-500 mt-1">Last active: {lastActive}</p>
        )}
      </div>

      {description && (
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{description}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs bg-[#2A2A35] border border-[#1F2937] rounded font-mono"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {room.isPrivate !== false && room.code && (
        <div
          className="flex items-center gap-2 mt-1 group/code"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-gray-500">Invite code:</span>
          <span className="font-mono text-xs text-gray-300 tracking-widest">
            {room.code}
          </span>
          <button
            onClick={handleCopyCode}
            title="Copy invite code"
            className="text-gray-600 hover:text-lime-400 transition flex-shrink-0"
          >
            {copied ? (
              <Check size={13} className="text-lime-400" />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>
      )}

      <div className="text-xs text-lime-400 font-medium mt-1">Enter room</div>
    </div>
  );
}
