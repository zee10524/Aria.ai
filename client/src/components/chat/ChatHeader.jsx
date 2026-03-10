import { Search, Pin, HelpCircle, Hash, Wifi, WifiOff } from "lucide-react";

export default function ChatHeader({ channel, isConnected, onlineCount }) {
  if (!channel) return null;

  return (
    <header className="h-16 border-b border-gray-800 bg-[#15151A]/80 backdrop-blur flex items-center justify-between px-6">
      <div className="flex items-center gap-3 min-w-0">
        <Hash size={18} className="text-gray-500" />
        <h2 className="font-bold text-lg text-white truncate">
          {channel.name}
        </h2>
        <span className="hidden md:block h-4 w-px bg-gray-700 mx-2" />
        <p className="hidden md:block text-sm text-gray-500 truncate max-w-md">
          Use <span className="text-lime-400 font-mono">@ai</span> or <span className="text-lime-400 font-mono">@gemini</span> to ask the AI assistant.
        </p>
      </div>

      <div className="flex items-center gap-4 text-gray-500">
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
        <Search className="hover:text-lime-400 cursor-pointer" size={18} />
        <Pin className="hover:text-lime-400 cursor-pointer" size={18} />
        <HelpCircle className="hover:text-lime-400 cursor-pointer" size={18} />
      </div>
    </header>
  );
}