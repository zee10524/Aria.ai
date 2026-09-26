import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Plus, X } from "lucide-react";
import API from "../lib/api";
import Header from "../components/dashboard/Header";

/* ─────────────────────────── PAGE ─────────────────────────────────────────── */

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("dark");

    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    API.get("/users/me")
      .then((res) => setProfile(res.data))
      .catch(() => setLoadError("Failed to load profile. Please try again."));
  }, [navigate]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#F2F2E6] flex items-center justify-center">
        <p className="text-red-400">{loadError}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#F2F2E6] flex items-center justify-center">
        <p className="text-gray-400 font-mono animate-pulse">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F2F2E6] font-sans">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <ProfileHeader profile={profile} onUpdate={setProfile} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
          <LeftColumn profile={profile} onUpdate={setProfile} />
          <RightColumn profile={profile} />
        </div>
      </main>

      <PageFooter />
    </div>
  );
}

/* ─────────────────────────── HEADER ───────────────────────────────────────── */

function ProfileHeader({ profile }) {
  const joinedYear = profile.joinedAt
    ? new Date(profile.joinedAt).getFullYear()
    : null;

  return (
    <div className="flex flex-col md:flex-row justify-between gap-6">
      <div className="flex gap-6 items-end">
        <div className="w-32 h-32 rounded-2xl bg-[#16161D] border border-white/10 flex items-center justify-center text-5xl font-bold text-[#DFFF5E] shrink-0">
          {profile.username?.[0]?.toUpperCase() ?? "?"}
        </div>

        <div>
          <h1 className="text-4xl font-bold">{profile.username}</h1>
          <p className="text-sm text-gray-400 font-mono mt-1">{profile.email}</p>
          {joinedYear && (
            <p className="text-xs text-gray-500 font-mono mt-1">
              Member since {joinedYear}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── STATS ROW ────────────────────────────────────── */

function StatsRow({ stats }) {
  const items = [
    { label: "Rooms Owned", value: stats.roomsOwned },
    { label: "Rooms Joined", value: stats.roomsJoined },
    { label: "Messages Sent", value: stats.messagesSent },
    { label: "AI Prompts", value: stats.aiPrompts },
  ];

  return (
    <Card>
      <div className="grid grid-cols-2 gap-4">
        {items.map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-2xl font-bold font-mono text-[#DFFF5E]">{value}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─────────────────────────── LEFT COLUMN ──────────────────────────────────── */

function LeftColumn({ profile, onUpdate }) {
  return (
    <div className="space-y-6">
      <StatsRow stats={profile.stats} />
      <BioEditor bio={profile.bio} onUpdate={onUpdate} />
      <SkillsEditor skills={profile.skills} onUpdate={onUpdate} />
    </div>
  );
}

/* ─────────────────────────── BIO EDITOR ───────────────────────────────────── */

function BioEditor({ bio, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const res = await API.patch("/users/me", { bio: draft });
      onUpdate((prev) => ({ ...prev, bio: res.data.bio }));
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }, [draft, onUpdate]);

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-mono uppercase text-gray-400">About</h3>
        {!editing && (
          <button
            className="text-xs text-gray-500 hover:text-[#DFFF5E] transition"
            onClick={() => { setDraft(bio); setEditing(true); }}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-[#DFFF5E]/50"
            rows={4}
            maxLength={300}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button
              disabled={saving}
              onClick={save}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#DFFF5E] text-black font-bold hover:bg-white transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-300 leading-relaxed">
          {bio || <span className="text-gray-500 italic">No bio yet. Add one to tell people about yourself.</span>}
        </p>
      )}
    </Card>
  );
}

/* ─────────────────────────── SKILLS EDITOR ────────────────────────────────── */

function SkillsEditor({ skills, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([...skills]);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed || draft.length >= 10 || trimmed.length > 30) return;
    setDraft((prev) => [...prev, trimmed]);
    setNewSkill("");
  };

  const removeSkill = (idx) => setDraft((prev) => prev.filter((_, i) => i !== idx));

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const res = await API.patch("/users/me", { skills: draft });
      onUpdate((prev) => ({ ...prev, skills: res.data.skills }));
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }, [draft, onUpdate]);

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-mono uppercase text-gray-400">Skills</h3>
        {!editing && (
          <button
            className="text-xs text-gray-500 hover:text-[#DFFF5E] transition"
            onClick={() => { setDraft([...skills]); setEditing(true); }}
          >
            Edit
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(editing ? draft : skills).map((s, i) => (
          <span
            key={i}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded-md bg-[#0D0C12] border border-white/10 text-gray-300"
          >
            {s}
            {editing && (
              <button
                onClick={() => removeSkill(i)}
                className="ml-1 text-gray-500 hover:text-red-400 transition"
              >
                <X size={10} />
              </button>
            )}
          </span>
        ))}

        {editing && draft.length < 10 && (
          <div className="flex items-center gap-1">
            <input
              className="w-28 bg-black/30 border border-white/10 rounded-md px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-[#DFFF5E]/50"
              placeholder="Add skill"
              value={newSkill}
              maxLength={30}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
            />
            <button
              onClick={addSkill}
              className="p-1 text-gray-500 hover:text-[#DFFF5E] transition"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      {editing && (
        <>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button
              disabled={saving}
              onClick={save}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#DFFF5E] text-black font-bold hover:bg-white transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

/* ─────────────────────────── RIGHT COLUMN ─────────────────────────────────── */

function RightColumn({ profile }) {
  return (
    <div className="lg:col-span-2 space-y-10">
      <RoomList rooms={profile.rooms} />
      <RecentActivity activity={profile.activity ?? []} />
    </div>
  );
}

function RoomList({ rooms }) {
  const navigate = useNavigate();

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">My Rooms</h2>

      {rooms.length === 0 ? (
        <p className="text-sm text-gray-500">You are not a member of any rooms yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => navigate(`/room/${room.id}`)}
              className="text-left p-5 rounded-xl bg-[#16161D] border border-white/5 hover:border-[#DFFF5E]/40 transition"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-lg hover:text-[#DFFF5E] transition truncate">
                  {room.name}
                </h3>
                <span className="shrink-0 text-xs font-mono px-2 py-0.5 rounded-full border border-white/10 text-gray-500">
                  {room.role === "owner" ? "owner" : "member"}
                </span>
              </div>
              {room.description && (
                <p className="text-sm text-gray-400 line-clamp-2">{room.description}</p>
              )}
              <div className="text-xs font-mono text-gray-500 mt-3">
                Created {new Date(room.createdAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── RECENT ACTIVITY ──────────────────────────────── */

const ACTIVITY_ICONS = {
  room_created: "🏗",
  room_joined: "🚪",
  message_sent: "💬",
  ai_prompt: "🤖",
};

const ACTIVITY_LABELS = {
  room_created: "Created room",
  room_joined: "Joined room",
  message_sent: "Message sent",
  ai_prompt: "AI prompt",
};

function RecentActivity({ activity }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Recent Activity</h2>

      {activity.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity yet.</p>
      ) : (
        <Card>
          <ul className="space-y-4">
            {activity.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5" aria-hidden="true">
                  {ACTIVITY_ICONS[item.type] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-200 truncate">{item.label}</p>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────── FOOTER ───────────────────────────────────────── */

function PageFooter() {
  return (
    <footer className="border-t border-white/5 py-10 mt-16 text-sm text-gray-500">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          ARIA<span className="text-[#DFFF5E]">.ai</span>
        </div>
        <div className="font-mono text-xs">2026 ARIA AI Inc.</div>
      </div>
    </footer>
  );
}

/* ─────────────────────────── CARD ─────────────────────────────────────────── */

function Card({ children }) {
  return (
    <div className="bg-[#16161D] border border-white/5 rounded-xl p-6">
      {children}
    </div>
  );
}
