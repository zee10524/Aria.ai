import {
  Hash,
  Bug,
  Lock,
  Circle,
} from "lucide-react";

export default function ChannelList({
  channels,
  activeChannel,
  onChannelChange,
}) {
  const iconMap = {
    public: Hash,
    private: Lock,
    bug: Bug,
  };

  return (
    <div className="space-y-1">
      <div className="px-2 mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Channels
        </span>
      </div>

      {channels.map((channel) => {
        const Icon = iconMap[channel.type] || Hash;
        const isActive = activeChannel?.id === channel.id;

        return (
          <button
            key={channel.id}
            onClick={() => onChannelChange(channel)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md transition-all
              ${
                isActive
                  ? "bg-lime-500/10 text-white border-l-2 border-lime-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
          >
            <Icon size={16} className={isActive ? "text-lime-400" : ""} />

            <span className="font-medium text-sm flex-1 text-left">
              {channel.name}
            </span>

            {channel.unread && (
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded">
                {channel.unread}
              </span>
            )}

            {isActive && (
              <Circle
                size={6}
                className="text-lime-400 fill-lime-400"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}