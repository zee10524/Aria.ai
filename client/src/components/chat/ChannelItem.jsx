import { Hash, Bug, Lock } from "lucide-react";

const ICONS = {
  hash: Hash,
  bug: Bug,
  lock: Lock
};

export default function ChannelItem({ channel }) {
  const Icon = ICONS[channel.icon] || Hash;

  return (
    <button
      className={`flex items-center gap-3 px-2 py-2 rounded-md border-l-2 transition-colors
        ${channel.active
          ? "bg-lime-400/10 text-white border-lime-400"
          : "text-gray-400 hover:bg-[#15151A] hover:text-gray-200 border-transparent"
        }`}
    >
      <Icon size={16} className={channel.active ? "text-lime-400" : ""} />
      <span className="hidden lg:block text-sm font-medium">
        {channel.name}
      </span>

      {channel.badge && (
        <span className="ml-auto text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 rounded">
          {channel.badge}
        </span>
      )}

      {channel.unread && !channel.badge && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-lime-400" />
      )}
    </button>
  );
}