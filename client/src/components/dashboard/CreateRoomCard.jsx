import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function CreateRoomCard() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-6 min-h-[250px] hover:border-lime-400 hover:bg-[#1F1F27] transition cursor-pointer" onClick={() => navigate("/create-room")}>
      <div className="w-12 h-12 rounded-full bg-[#2A2A35] flex items-center justify-center mb-4" >
        <span className="material-icons text-gray-400"><Plus /></span>
        
      </div>

      <h3 className="text-lg font-medium mb-1">
        Create New Room
      </h3>

      <p className="text-sm text-gray-500 text-center">
        Set up a space for your next project
      </p>
    </div>
  );
}