import { useState } from "react";
import { Bot, Loader2, Reply, Smile } from "lucide-react";
import ReactMarkdown from "react-markdown";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🚀", "🤔"];

export default function MessageList({
  messages,
  isAITyping,
  typingUsers,
  bottomRef,
  onReply,
  onReact,
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((msg) =>
        msg.type === "ai" ? (
          <AIMessage key={msg._id || msg.id} msg={msg} onReact={onReact} />
        ) : (
          <UserMessage
            key={msg._id || msg.id}
            msg={msg}
            onReply={onReply}
            onReact={onReact}
          />
        )
      )}

      {/* AI typing indicator */}
      {isAITyping && (
        <div className="relative bg-[#1A1A23]/70 border border-lime-400/10 rounded-xl px-5 py-4">
          <div className="absolute -top-3 left-4 bg-lime-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Bot size={12} /> AI
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-black flex items-center justify-center">
              <Bot size={18} className="text-lime-400" />
            </div>
            <div className="flex items-center gap-1">
              <Loader2 size={14} className="text-lime-400 animate-spin" />
              <span className="text-sm text-gray-400">Gemini is thinking…</span>
            </div>
          </div>
        </div>
      )}

      {/* Human typing indicators */}
      {typingUsers && typingUsers.length > 0 && (
        <div className="text-xs text-gray-500 italic px-2">
          {typingUsers.map((u) => u.username).join(", ")}{" "}
          {typingUsers.length === 1 ? "is" : "are"} typing…
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

/* ---------------- EMOJI PICKER (inline, no library) ---------------- */
function EmojiPicker({ messageId, onReact }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-gray-500 hover:text-lime-400 transition p-1 rounded"
        title="React"
      >
        <Smile size={14} />
      </button>
      {open && (
        <div className="absolute bottom-7 left-0 z-10 flex gap-1 bg-[#1E1E28] border border-gray-700 rounded-lg px-2 py-1.5 shadow-lg">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact?.(messageId, emoji);
                setOpen(false);
              }}
              className="text-lg hover:scale-125 transition-transform leading-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- REACTIONS BAR ---------------- */
function ReactionsBar({ reactions, messageId, onReact }) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map(({ emoji, users }) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact?.(messageId, emoji)}
          className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-800 border border-gray-700 hover:border-lime-400/50 transition"
          title={`${users.length} reaction${users.length !== 1 ? "s" : ""}`}
        >
          <span>{emoji}</span>
          <span className="text-gray-300 font-medium">{users.length}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- QUOTED REPLY PREVIEW ---------------- */
function ReplyQuote({ replyTo }) {
  if (!replyTo) return null;
  const author = replyTo.sender?.username || "Unknown";
  const snippet =
    typeof replyTo.content === "string"
      ? replyTo.content.slice(0, 120)
      : "";

  return (
    <div className="mb-1.5 pl-3 border-l-2 border-lime-400/50 text-xs text-gray-400">
      <span className="font-semibold text-gray-300 mr-1">{author}</span>
      {snippet}
      {replyTo.content?.length > 120 && "…"}
    </div>
  );
}

/* ---------------- USER MESSAGE ---------------- */
function UserMessage({ msg, onReply, onReact }) {
  const [actionsVisible, setActionsVisible] = useState(false);

  const username = msg.sender?.username || msg.author || "Unknown";
  const initial = username.charAt(0).toUpperCase();
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : msg.time || "";

  return (
    <div
      className="flex gap-4 group"
      onMouseEnter={() => setActionsVisible(true)}
      onMouseLeave={() => setActionsVisible(false)}
    >
      {msg.avatar ? (
        <img
          src={msg.avatar}
          className="w-10 h-10 rounded-full bg-gray-800"
          alt=""
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-lime-400/20 border border-lime-400/40 flex items-center justify-center text-lime-400 font-bold text-sm flex-shrink-0">
          {initial}
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-gray-200">{username}</span>
          <span className="text-xs text-gray-500">{time}</span>

          {/* Hover action buttons */}
          <div
            className={`flex items-center gap-1 ml-1 transition-opacity ${
              actionsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <EmojiPicker messageId={msg._id} onReact={onReact} />
            <button
              type="button"
              onClick={() => onReply?.(msg)}
              className="text-gray-500 hover:text-lime-400 transition p-1 rounded"
              title="Reply"
            >
              <Reply size={14} />
            </button>
          </div>
        </div>

        {/* Quoted reply if this message is a reply */}
        <ReplyQuote replyTo={msg.replyTo} />

        <p className="text-gray-300 text-sm whitespace-pre-wrap">
          {typeof msg.content === "string"
            ? msg.content
            : msg.content?.text || ""}
        </p>

        <ReactionsBar
          reactions={msg.reactions}
          messageId={msg._id}
          onReact={onReact}
        />
      </div>
    </div>
  );
}

/* ---------------- AI MESSAGE ---------------- */
function AIMessage({ msg, onReact }) {
  const triggeredBy = msg.aiTriggeredBy?.username;
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : msg.time || "";
  const contentText =
    typeof msg.content === "string" ? msg.content : msg.content?.text || "";

  return (
    <div className="relative bg-[#1A1A23]/70 border border-lime-400/10 rounded-xl px-5 py-6">
      <div className="absolute -top-3 left-4 bg-lime-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
        <Bot size={12} /> Gemini AI
      </div>

      <div className="flex gap-4">
        <div className="w-10 h-10 rounded bg-black flex items-center justify-center flex-shrink-0">
          <Bot size={22} className="text-lime-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-bold text-lime-400">Gemini AI</span>
            <span className="text-xs text-gray-500">{time}</span>
            {triggeredBy && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">
                asked by @{triggeredBy}
              </span>
            )}
          </div>

          <div className="prose prose-invert prose-sm max-w-none text-gray-300">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      className="bg-[#2A2A35] px-1 py-0.5 rounded text-lime-300 text-xs"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-[#1E1E24] border border-gray-700 rounded-lg p-4 text-xs overflow-x-auto my-3">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
              }}
            >
              {contentText}
            </ReactMarkdown>
          </div>

          {/* Fallback code block from old mock format */}
          {typeof msg.content === "object" && msg.content?.code && (
            <pre className="bg-[#1E1E24] border border-gray-700 rounded-lg p-4 text-xs overflow-x-auto mt-3">
              <code>{msg.content.code.body}</code>
            </pre>
          )}

          <ReactionsBar
            reactions={msg.reactions}
            messageId={msg._id}
            onReact={onReact}
          />
        </div>
      </div>
    </div>
  );
}
