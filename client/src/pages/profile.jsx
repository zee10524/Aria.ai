import { useEffect } from "react";
import {
  Terminal,
  Bell,
  Share2,
  Settings,
  Plus,
  Rocket,
  Bug,
  Palette,
  Sparkles,
} from "lucide-react";
import Header from "../components/dashboard/Header";

/* -------------------------------- PAGE -------------------------------- */

export default function ProfilePage() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#F2F2E6] font-sans">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <ProfileHeader />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
          <LeftColumn />
          <RightColumn />
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* -------------------------------- HEADER -------------------------------- */

function ProfileHeader() {
  return (
    <div className="flex flex-col md:flex-row justify-between gap-6">
      <div className="flex gap-6 items-end">
        <img
          src="https://i.pravatar.cc/300?img=12"
          alt="profile"
          className="w-32 h-32 rounded-2xl object-cover ring-4 ring-[#16161D]"
        />

        <div>
          <h1 className="text-4xl font-bold">Alex Chen</h1>
          <p className="text-sm text-gray-400 font-mono mt-1">
            @alxchn · Senior Full Stack Engineer
          </p>
        </div>
      </div>

      
    </div>
  );
}

function ActionButton({ icon, label, primary }) {
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition
        ${
          primary
            ? "bg-[#F2F2E6] text-black hover:bg-white"
            : "border border-white/10 text-gray-300 hover:bg-white/5"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* -------------------------------- LEFT COLUMN -------------------------------- */

function LeftColumn() {
  return (
    <div className="space-y-6">
      <AIContribution />
      <TechStack />
      <About />
    </div>
  );
}

function AIContribution() {
  return (
    <Card>
      <h3 className="flex items-center gap-2 text-sm font-mono uppercase text-gray-400 mb-6">
        <Sparkles className="w-4 h-4 text-[#DFFF5E]" />
        AI Contribution
      </h3>

      <Metric label="Bugs Fixed by AI" value="142" percent={75} />
      <Metric label="Code Optimization" value="89%" percent={89} />

      <div className="flex justify-between text-xs font-mono text-gray-400 pt-4 border-t border-white/5">
        <span>Credits Used</span>
        <span className="text-white">4,203 / 5,000</span>
      </div>
    </Card>
  );
}

function Metric({ label, value, percent }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="font-mono text-xl">{value}</span>
      </div>
      <div className="h-1.5 bg-black/40 rounded-full">
        <div
          className="h-1.5 bg-[#DFFF5E] rounded-full shadow-[0_0_10px_rgba(223,255,94,0.4)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function TechStack() {
  const tech = ["React", "TypeScript", "Node.js", "Next.js", "Tailwind", "Python"];

  return (
    <Card>
      <h3 className="text-sm font-mono uppercase text-gray-400 mb-4">
        Tech Stack
      </h3>

      <div className="flex flex-wrap gap-2">
        {tech.map((t) => (
          <span
            key={t}
            className="px-3 py-1.5 text-xs font-mono rounded-md bg-[#0D0C12] border border-white/10 text-gray-300"
          >
            {t}
          </span>
        ))}

        <button className="px-3 py-1.5 text-xs font-mono rounded-md border border-dashed border-white/10 text-gray-500 hover:text-[#DFFF5E] hover:border-[#DFFF5E]">
          + Add
        </button>
      </div>
    </Card>
  );
}

function About() {
  return (
    <Card>
      <h3 className="text-sm font-mono uppercase text-gray-400 mb-4">About</h3>
      <p className="text-sm text-gray-300 leading-relaxed">
        Building the future of collaborative coding environments. Passionate
        about AI-assisted development and optimizing workflows. Currently
        exploring Rust and WebAssembly.
      </p>
    </Card>
  );
}

/* -------------------------------- RIGHT COLUMN -------------------------------- */

function RightColumn() {
  return (
    <div className="lg:col-span-2 space-y-10">
      <ActiveRooms />
      <RecentActivity />
    </div>
  );
}

function ActiveRooms() {
  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">Active Rooms</h2>
        <span className="text-sm font-mono text-[#DFFF5E] cursor-pointer">
          View All →
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RoomCard
          icon={<Rocket />}
          title="Frontend Architecture"
          desc="Discussing micro-frontends and state management strategies."
          time="2m ago"
          status="green"
        />

        <RoomCard
          icon={<Bug />}
          title="Bug Squash – Core API"
          desc="Tracking memory leaks in websocket service."
          time="1h ago"
          status="yellow"
        />

        <RoomCard
          icon={<Palette />}
          title="Design System V2"
          desc="Implementing new tokens and dark mode variants."
          time="4h ago"
        />

        <CreateRoomCard />
      </div>
    </div>
  );
}

function RoomCard({ icon, title, desc, time, status }) {
  return (
    <div className="relative p-5 rounded-xl bg-[#16161D] border border-white/5 hover:border-[#DFFF5E]/40 transition">
      <div className="flex justify-between mb-4">
        <div className="p-2 rounded-lg bg-white/5">{icon}</div>
        {status && (
          <span
            className={`w-2 h-2 rounded-full bg-${status}-500 ring-4 ring-[#16161D]`}
          />
        )}
      </div>

      <h3 className="font-bold text-lg mb-1 hover:text-[#DFFF5E] transition">
        {title}
      </h3>
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{desc}</p>

      <div className="text-xs font-mono text-gray-500 text-right">{time}</div>
    </div>
  );
}

function CreateRoomCard() {
  return (
    <button className="p-5 rounded-xl border border-dashed border-white/10 hover:border-[#DFFF5E] flex flex-col items-center justify-center gap-3 transition">
      <div className="p-3 rounded-full bg-[#0D0C12]">
        <Plus />
      </div>
      <span className="text-gray-400">Create New Room</span>
    </button>
  );
}

/* -------------------------------- ACTIVITY -------------------------------- */

function RecentActivity() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Recent Activity</h2>

      <div className="border-l border-white/10 pl-6 space-y-8">
        <Activity
          title="Created a new AI workspace"
          desc='Initialized "Project Nebula" with React and Python templates.'
          time="2 hours ago"
          highlight
        />

        <Activity
          title="Pushed to main"
          desc='Merged PR #442: "Fix dark mode contrast issues in sidebar".'
          time="Yesterday"
        />

        <Activity title='Joined "Rust Learners"' time="3 days ago" />
      </div>
    </div>
  );
}

function Activity({ title, desc, time, highlight }) {
  return (
    <div className="relative">
      <div
        className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full ${
          highlight ? "bg-[#DFFF5E]" : "bg-gray-600"
        } ring-4 ring-black`}
      />

      <div className="flex justify-between mb-1">
        <p className="font-medium">{title}</p>
        <span className="text-xs font-mono text-gray-500">{time}</span>
      </div>

      {desc && <p className="text-sm text-gray-400">{desc}</p>}
    </div>
  );
}

/* -------------------------------- FOOTER -------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 mt-16 text-sm text-gray-500">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          ARIA<span className="text-[#DFFF5E]">.ai</span>
        </div>

        <div className="flex gap-6">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Status</span>
          <span>Contact</span>
        </div>

        <div className="font-mono text-xs">
          © 2026 ARIA AI Inc.
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------- CARD -------------------------------- */

function Card({ children }) {
  return (
    <div className="bg-[#16161D] border border-white/5 rounded-xl p-6">
      {children}
    </div>
  );
}