import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  History,
  Settings,
  Plus,
} from "lucide-react";

/* ---------------- animation variants ---------------- */
const sidebarVariants = {
  hidden: { x: -40, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export default function Sidebar() {
  const navigate = useNavigate();
  useEffect(() => {
    document.documentElement.classList.add("dark");

    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
    <motion.aside
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      className="w-64 bg-surface-light border-r border-border-light hidden md:flex flex-col justify-between shrink-0"
    >
      {/* ================= TOP ================= */}
      <div className="p-4 space-y-6">

        {/* CREATE ROOM */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/create-room")}
          className="w-full cursor-pointer bg-primary hover:bg-primary-hover text-black font-semibold py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
        >
          <Plus size={18} />
          Create Room
        </motion.button>

        {/* NAVIGATION */}
        <nav className="space-y-1 text-sm">
          <SidebarItem
            active
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
          />
          <SidebarItem
            icon={<Compass size={18} />}
            label="Explore"
          />
          <SidebarItem
            icon={<History size={18} />}
            label="Recent Activity"
          />
        </nav>

        {/* MY ROOMS */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            My Rooms
          </h3>

          <div className="space-y-1">
            <RoomItem color="bg-green-500" label="React Native Devs" />
            <RoomItem color="bg-purple-500" label="Python AI/ML" />
            <RoomItem color="bg-blue-500" label="Frontend Masters" />
          </div>
        </div>
      </div>

      {/* ================= BOTTOM ================= */}
      <div className="p-4 border-t border-border-light">
        <SidebarItem
          icon={<Settings size={18} />}
          label="Settings"
        />
      </div>
    </motion.aside>
  );
}

/* ================= SUB COMPONENTS ================= */

function SidebarItem({ icon, label, active = false }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ x: 4 }}
      className={`flex items-center px-3 py-2 rounded-md font-medium cursor-pointer transition
        ${
          active
            ? "bg-[#2A2A35] text-white shadow-sm"
            : "text-gray-400 hover:bg-[#1F1F27] hover:text-white"
        }
      `}
    >
      <span className={`mr-3 ${active ? "text-primary" : "text-gray-400"}`}>
        {icon}
      </span>
      {label}
    </motion.div>
  );
}

function RoomItem({ color, label }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ x: 4 }}
      className="flex items-center px-3 py-2 rounded-md text-gray-400 hover:bg-[#1F1F27] hover:text-white transition cursor-pointer"
    >
      <span className={`w-2 h-2 rounded-full ${color} mr-3`} />
      <span className="truncate">{label}</span>
    </motion.div>
  );
}