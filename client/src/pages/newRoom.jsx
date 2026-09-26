import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Hash, ArrowRight, Loader2 } from "lucide-react";
import API from "../lib/api";

const MotionDiv = motion.div;
const MotionButton = motion.button;

const pageFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

const cardAnim = {
  hidden: { opacity: 0, scale: 0.96, y: 24 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const [isPrivate, setIsPrivate] = useState(true);
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 24) {
      setError("Each tag must be 24 characters or fewer");
      return;
    }
    if (tags.length >= 8) {
      setError("A room can have at most 8 tags");
      return;
    }
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
    setError("");
  };

  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag));

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const handleCreate = async () => {
    if (!roomName.trim()) {
      setError("Room name is required");
      return;
    }
    if (description.length > 300) {
      setError("Description must be 300 characters or fewer");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/rooms", {
        name: roomName.trim(),
        description: description.trim(),
        tags,
        isPrivate,
      });
      navigate(`/room/${res.data.room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionDiv
      variants={pageFade}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-[#0c0a18] flex items-center justify-center
                 text-[#f2f2e4] font-sans relative overflow-hidden"
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-[#3b3452] opacity-20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[700px] h-[700px] bg-[#1a1626] opacity-40 rounded-full blur-[120px]" />
      </div>

      <MotionDiv
        variants={cardAnim}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden
                   bg-[#161321]/90 backdrop-blur-xl
                   border border-white/10
                   shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]"
      >
        {/* HEADER */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Create Room</h1>
            <p className="mt-2 text-sm text-gray-400">
              Initialize a new collaborative environment.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM */}
        <form className="px-8 py-6 space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* ROOM NAME */}
          <Field label="Room Name">
            <div className="relative">
              <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Frontend Architecture Review"
                className="w-full pl-10 pr-3 py-3 rounded-lg bg-[#080610] text-[#f2f2e4]
                           border border-[#2a2636] placeholder-gray-600
                           focus:ring-1 focus:ring-[#DFFF5E]/50 focus:border-[#DFFF5E]/50 transition"
              />
            </div>
          </Field>

          {/* TAGS */}
          <Field label="Tags" hint="Press Enter or comma to add (max 8, each max 24 chars)">
            <div className="p-3 rounded-lg bg-[#080610] border border-[#2a2636] min-h-[80px]">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[#2a2636] text-gray-300 border border-white/10"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-gray-500 hover:text-white transition ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                placeholder={tags.length >= 8 ? "Max tags reached" : "Add a tag..."}
                disabled={tags.length >= 8}
                className="w-full bg-transparent text-sm text-[#f2f2e4] placeholder-gray-600 focus:outline-none disabled:opacity-40"
              />
            </div>
          </Field>

          {/* DESCRIPTION */}
          <Field label="Description" hint={`${description.length}/300`}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Briefly describe the purpose of this room..."
              className="w-full p-3 rounded-lg resize-none bg-[#080610] text-[#f2f2e4]
                         border border-[#2a2636] placeholder-gray-600
                         focus:ring-1 focus:ring-[#DFFF5E]/50 focus:border-[#DFFF5E]/50 transition"
            />
          </Field>

          {/* PRIVACY */}
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Room Privacy</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isPrivate
                  ? "Private — join by code only."
                  : "Public — visible on the Explore page."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative w-12 h-6 rounded-full transition
                ${isPrivate ? "bg-[#DFFF5E]" : "bg-[#2a2636]"}`}
              aria-label={isPrivate ? "Switch to public" : "Switch to private"}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[#080610] transition-transform
                  ${isPrivate ? "translate-x-6" : ""}`}
              />
            </button>
          </div>
        </form>

        {/* FOOTER */}
        <div className="px-8 py-6 flex justify-end gap-3 bg-[#080610]/40 border-t border-white/10">
          {error && (
            <p className="text-red-400 text-sm flex-1 flex items-center">{error}</p>
          )}
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Cancel
          </button>

          <MotionButton
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5
                       bg-[#DFFF5E] text-black font-bold rounded-lg
                       shadow-[0_0_15px_rgba(223,255,94,0.35)]
                       hover:shadow-[0_0_25px_rgba(223,255,94,0.6)]
                       disabled:opacity-60 disabled:cursor-not-allowed
                       transition"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {loading ? "Creating..." : "Create Room"}
          </MotionButton>
        </div>

        <div className="h-[2px] w-full bg-gradient-to-r from-[#DFFF5E] via-purple-500 to-blue-500 opacity-50" />
      </MotionDiv>
    </MotionDiv>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">
        {label}
        {hint && (
          <span className="ml-2 text-xs font-normal text-gray-600">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}
