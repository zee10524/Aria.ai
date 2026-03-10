import { Bot, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function MessageList({ messages, isAITyping, typingUsers, bottomRef }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((msg) =>
        msg.type === "ai" ? (
          <AIMessage key={msg._id || msg.id} msg={msg} />
        ) : (
          <UserMessage key={msg._id || msg.id} msg={msg} />
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

/* ---------------- USER MESSAGE ---------------- */
function UserMessage({ msg }) {
  const username = msg.sender?.username || msg.author || "Unknown";
  const initial = username.charAt(0).toUpperCase();
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : msg.time || "";

  return (
    <div className="flex gap-4">
      {msg.avatar ? (
        <img src={msg.avatar} className="w-10 h-10 rounded-full bg-gray-800" alt="" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-lime-400/20 border border-lime-400/40 flex items-center justify-center text-lime-400 font-bold text-sm flex-shrink-0">
          {initial}
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-bold text-gray-200">{username}</span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="text-gray-300 text-sm whitespace-pre-wrap">
          {typeof msg.content === "string" ? msg.content : msg.content?.text || ""}
        </p>
      </div>
    </div>
  );
}

/* ---------------- AI MESSAGE ---------------- */
function AIMessage({ msg }) {
  const triggeredBy = msg.aiTriggeredBy?.username;
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : msg.time || "";
  const contentText = typeof msg.content === "string" ? msg.content : msg.content?.text || "";

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
                code({ inline, children, ...props }) {
                  return inline ? (
                    <code className="bg-[#2A2A35] px-1 py-0.5 rounded text-lime-300 text-xs" {...props}>
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-[#1E1E24] border border-gray-700 rounded-lg p-4 text-xs overflow-x-auto my-3">
                      <code {...props}>{children}</code>
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
        </div>
      </div>
    </div>
  );
}