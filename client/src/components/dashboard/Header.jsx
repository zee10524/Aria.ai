import { BellDot , CircleUser, Search} from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function Header() {
  const navigate = useNavigate();
  return (
    <header className="h-16 border-b border-[#1F2937] flex items-center justify-between px-6 bg-[#0F0F16]">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
        <div className="w-8 h-8 bg-lime-400 text-black font-bold flex items-center justify-center rounded">
          A
        </div>
        <span className="font-bold">ARIA AI</span>
      </div>

      <div className="flex items-center gap-6">
        <span className="material-icons text-gray-400 cursor-pointer">
            <input placeholder="Search rooms..." className="hidden md:block bg-[#1F1F27] border border-[#1F2937] px-4 py-1 rounded text-sm"/>
        </span>
        
        <span className="material-icons text-gray-400 cursor-pointer">
          <BellDot />
        </span>
        <span className="material-icons text-gray-400 cursor-pointer" onClick={() => navigate("/profile")}>
          <CircleUser />
        </span>
      </div>
    </header>
  );
}