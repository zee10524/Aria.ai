import { iconMap } from "../utils/iconMapper";

export default function StatCard({ stat }) {
  const Icon = iconMap[stat.icon];

  return (
    <div className="bg-[#18181F] border border-[#1F2937] p-5 rounded-lg hover:border-lime-400/40 transition">
      <div className="flex justify-between mb-4 items-center">
        <h3 className="text-sm text-gray-400">
          {stat.title}
        </h3>

        {Icon && (
          <Icon
            size={20}
            className="text-lime-400"
            strokeWidth={1.5}
          />
        )}
      </div>

      <div className="text-2xl font-bold">
        {stat.value}
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {stat.sub}
      </p>
    </div>
  );
}