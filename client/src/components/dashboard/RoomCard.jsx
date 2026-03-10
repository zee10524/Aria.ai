import { useNavigate } from "react-router-dom";

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
  const roomId = room._id || room.id;

  // Support both real DB fields and mock data fields
  const title = room.name || room.title || "Unnamed Room";
  const lastActive = timeAgo(room.lastActiveAt) || room.lastActive || null;
  const description = room.description || null;
  const tags = room.tags || (room.code ? [`Code: ${room.code}`] : []);
  const roleLabel = room.membershipRole === "owner" ? "Owner" : room.membershipRole === "member" ? "Member" : null;

  return (
    <div
      className="bg-[#18181F] border border-[#1F2937] rounded-xl p-6 hover:border-lime-400/50 transition group cursor-pointer"
      onClick={() => navigate(`/room/${roomId}`)}
    >
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold group-hover:text-lime-400 transition truncate">
            {title}
          </h3>
          {roleLabel && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-lime-400/30 text-lime-400 bg-lime-400/10 flex-shrink-0">
              {roleLabel}
            </span>
          )}
        </div>
        {lastActive && (
          <p className="text-xs text-gray-500 mt-1">Last active: {lastActive}</p>
        )}
      </div>

      {description && (
        <p className="text-sm text-gray-400 mb-6">{description}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
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

      <div className="text-xs text-lime-400 font-medium">
        ● {room.online || "Enter room"}
      </div>
    </div>
  );
}