import { Hash, Wifi, WifiOff, LogOut } from "lucide-react";

export default function ChatHeader({ channel, isConnected, onlineCount, onLeave }) {
  if (!channel) return null;

  const hasMeta = channel.description || (channel.tags && channel.tags.length > 0);

  return (
    <header className="border-b border-gray-800 bg-[#15151A]/80 backdrop-blur">
      <div className="h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Hash size={18} className="text-gray-500 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold text-lg text-white truncate leading-tight">
              {channel.name}
            </h2>
            {hasMeta && (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {channel.description && (
                  <p className="text-xs text-gray-400 truncate max-w-xs">
                    {channel.description}
                  </p>
                )}
                {channel.tags && channel.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {channel.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!hasMeta && (
              <p className="text-xs text-gray-500">
                Use{" "}
                <span className="text-lime-400 font-mono">@ai</span>{" "}
                or{" "}
                <span className="text-lime-400 font-mono">@gemini</span>{" "}
                to ask the AI assistant.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-500 shrink-0">
          {typeof onlineCount === "number" && (
            <span className="text-xs text-gray-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-lime-400 mr-1 align-middle" />
              {onlineCount} online
            </span>
          )}
          {isConnected !== undefined && (
            isConnected
              ? <Wifi size={16} className="text-lime-400" />
              : <WifiOff size={16} className="text-red-400" />
          )}
          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              title="Leave Room"
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Leave</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
