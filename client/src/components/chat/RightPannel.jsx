import { Users } from "lucide-react";

export default function RightPanel({ allMembers = [], onlineUsers = [] }) {
  const onlineIds = new Set(
    onlineUsers.map((u) => String(u.userId))
  );

  // Merge: allMembers as base, mark online status
  // Also include anyone online who isn't in allMembers yet
  const onlineOnly = onlineUsers.filter(
    (u) => !allMembers.some((m) => String(m.userId) === String(u.userId))
  );
  const mergedMembers = [
    ...allMembers.map((m) => ({ ...m, isOnline: onlineIds.has(String(m.userId)) })),
    ...onlineOnly.map((u) => ({ ...u, isOnline: true, role: "member" })),
  ];

  const onlineCount = mergedMembers.filter((m) => m.isOnline).length;

  return (
    <aside className="w-60 bg-[#15151A] border-l border-gray-800 hidden lg:flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center px-4 gap-2">
        <Users size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-300">Members</span>
        <span className="ml-auto text-xs bg-lime-400/10 text-lime-400 border border-lime-400/20 px-2 py-0.5 rounded-full">
          {onlineCount} online
        </span>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {mergedMembers.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-8">No members found</p>
        ) : (
          mergedMembers.map((user) => (
            <div
              key={String(user.userId)}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition"
            >
              <div className="relative flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    user.isOnline
                      ? "bg-lime-400/20 border border-lime-400/30 text-lime-400"
                      : "bg-gray-700/40 border border-gray-600/30 text-gray-400"
                  }`}
                >
                  {(user.username || "?").charAt(0).toUpperCase()}
                </div>
                {/* Online/offline dot */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#15151A] ${
                    user.isOnline ? "bg-lime-400" : "bg-gray-500"
                  }`}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-sm truncate ${
                  user.isOnline ? "text-gray-200" : "text-gray-500"
                }`}>
                  {user.username}
                </span>
                {user.role === "owner" && (
                  <span className="text-[10px] text-lime-400/70">Owner</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-[10px] text-gray-600 text-center leading-relaxed">
          Type <span className="text-lime-400 font-mono">@ai</span> or{" "}
          <span className="text-lime-400 font-mono">@gemini</span> followed by your
          question to get an AI answer in chat.
        </p>
      </div>
    </aside>
  );
}