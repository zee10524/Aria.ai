import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Compass, Plus } from "lucide-react";
import API from "../../lib/api";

const MotionAside = motion.aside;
const MotionButton = motion.button;
const MotionDiv = motion.div;

const sidebarVariants = {
  hidden: { x: -40, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export default function Sidebar({ activePage = "dashboard" }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    API.get("/rooms/mine")
      .then(({ data }) => setRooms(data.rooms || []))
      .catch(() => setRooms([]));
  }, []);

  return (
    <MotionAside
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      className="w-64 bg-surface-light border-r border-border-light hidden md:flex flex-col justify-between shrink-0"
    >
      <div className="p-4 space-y-6">
        <MotionButton
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/create-room")}
          className="w-full cursor-pointer bg-primary hover:bg-primary-hover text-black font-semibold py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
        >
          <Plus size={18} />
          Create Room
        </MotionButton>

        <nav className="space-y-1 text-sm">
          <SidebarItem
            active={activePage === "dashboard"}
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            onClick={() => navigate("/dashboard")}
          />
          <SidebarItem
            active={activePage === "explore"}
            icon={<Compass size={18} />}
            label="Explore"
            onClick={() => navigate("/explore")}
          />
        </nav>

        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            My Rooms
          </h3>
          <div className="space-y-1">
            {rooms.length === 0 ? (
              <p className="px-3 text-xs text-gray-600">No rooms yet</p>
            ) : (
              rooms.map((room) => (
                <RoomItem
                  key={room._id}
                  color="bg-lime-400"
                  label={room.name}
                  unreadCount={room.unreadCount || 0}
                  onClick={() => navigate(`/room/${room._id}`)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </MotionAside>
  );
}

function SidebarItem({ icon, label, active = false, onClick }) {
  return (
    <MotionDiv
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`flex items-center px-3 py-2 rounded-md font-medium cursor-pointer transition
        ${active ? "bg-[#2A2A35] text-white shadow-sm" : "text-gray-400 hover:bg-[#1F1F27] hover:text-white"}`}
    >
      <span className={`mr-3 ${active ? "text-primary" : "text-gray-400"}`}>{icon}</span>
      {label}
    </MotionDiv>
  );
}

function RoomItem({ color, label, unreadCount = 0, onClick }) {
  return (
    <MotionDiv
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ x: 4 }}
      onClick={onClick}
      className="flex items-center px-3 py-2 rounded-md text-gray-400 hover:bg-[#1F1F27] hover:text-white transition cursor-pointer"
    >
      <span className={`w-2 h-2 rounded-full ${color} mr-3 flex-shrink-0`} />
      <span className="truncate flex-1">{label}</span>
      {unreadCount > 0 && (
        <span className="ml-2 flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-lime-400 text-black text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </MotionDiv>
  );
}
