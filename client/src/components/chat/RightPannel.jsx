import { useState } from "react";
import { Users, Sparkles, Loader2 } from "lucide-react";
import API from "../../lib/api";

export default function RightPanel({ allMembers = [], onlineUsers = [], roomId }) {
  const [catchUpState, setCatchUpState] = useState(null); // null | "loading" | { summary, messageCount, since }
  const [catchUpError, setCatchUpError] = useState(null);

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

  const handleCatchUp = async () => {
    if (!roomId || catchUpState === "loading") return;
    setCatchUpState("loading");
    setCatchUpError(null);
    try {
      const { data } = await API.post(`/rooms/${roomId}/catch-up`);
      setCatchUpState(data);
    } catch (err) {
      setCatchUpError(
        err.response?.data?.message || "Failed to get summary. Try again."
      );
      setCatchUpState(null);
    }
  };

  const handleDismiss = () => {
    setCatchUpState(null);
    setCatchUpError(null);
  };

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

      {/* Catch-up panel */}
      <div className="border-t border-gray-800 p-3 space-y-2">
        {catchUpError && (
          <p className="text-[10px] text-red-400 leading-relaxed">{catchUpError}</p>
        )}

        {catchUpState && catchUpState !== "loading" && (
          <div className="rounded-lg bg-[#1a1a22] border border-gray-700 p-3 space-y-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-semibold text-lime-400 uppercase tracking-wider">
                Catch-up
              </span>
              <button
                onClick={handleDismiss}
                className="text-gray-600 hover:text-gray-400 text-xs leading-none"
                aria-label="Dismiss"
              >
                x
              </button>
            </div>
            {catchUpState.messageCount === 0 ? (
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {catchUpState.summary}
              </p>
            ) : (
              <>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  {catchUpState.summary}
                </p>
                <p className="text-[10px] text-gray-600">
                  {catchUpState.messageCount} message{catchUpState.messageCount !== 1 ? "s" : ""} since last visit
                  {catchUpState.since
                    ? ` (${new Date(catchUpState.since).toLocaleString()})`
                    : ""}
                </p>
              </>
            )}
          </div>
        )}

        <button
          onClick={handleCatchUp}
          disabled={!roomId || catchUpState === "loading"}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md
            bg-lime-400/10 hover:bg-lime-400/20 border border-lime-400/20 hover:border-lime-400/40
            text-lime-400 text-[11px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {catchUpState === "loading" ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Summarising...
            </>
          ) : (
            <>
              <Sparkles size={12} />
              Catch me up
            </>
          )}
        </button>

        {/* Footer hint */}
        <p className="text-[10px] text-gray-600 text-center leading-relaxed pt-1">
          Type <span className="text-lime-400 font-mono">@ai</span> or{" "}
          <span className="text-lime-400 font-mono">@gemini</span> followed by your
          question to get an AI answer in chat.
        </p>
      </div>
    </aside>
  );
}
