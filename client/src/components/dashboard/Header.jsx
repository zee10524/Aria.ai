import { CircleUser, Search, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header({ search = "", onSearchChange }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-[#1F2937] flex items-center justify-between px-6 bg-[#0F0F16]">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate("/dashboard")}
      >
        <div className="w-8 h-8 bg-lime-400 text-black font-bold flex items-center justify-center rounded">
          A
        </div>
        <span className="font-bold">ARIA AI</span>
      </div>

      <div className="flex items-center gap-4">
        {typeof onSearchChange === "function" && (
          <div className="relative hidden md:block">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search rooms..."
              className="bg-[#1F1F27] border border-[#1F2937] pl-9 pr-4 py-1.5 rounded text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lime-400/50 transition w-56"
            />
          </div>
        )}

        <span
          className="text-gray-400 cursor-pointer hover:text-white transition"
          onClick={() => navigate("/profile")}
          title="Profile"
        >
          <CircleUser size={22} />
        </span>

        <span
          className="text-gray-400 cursor-pointer hover:text-red-400 transition"
          title="Log out"
          onClick={handleLogout}
        >
          <LogOut size={22} />
        </span>
      </div>
    </header>
  );
}
