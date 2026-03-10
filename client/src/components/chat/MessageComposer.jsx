import { Send, Bot, WifiOff } from "lucide-react";
import { useState, useRef, useCallback } from "react";

const TYPING_DEBOUNCE_MS = 1000;

export default function MessageComposer({ onSend, onTypingStart, onTypingStop, disabled }) {
  const [text, setText] = useState("");
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const handleChange = useCallback(
    (e) => {
      setText(e.target.value);

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTypingStart?.();
      }

      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTypingStop?.();
      }, TYPING_DEBOUNCE_MS);
    },
    [onTypingStart, onTypingStop]
  );

  const submit = () => {
    if (!text.trim() || disabled) return;
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    onTypingStop?.();
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const insertAIPrefix = () => {
    setText((prev) => (prev.startsWith("@ai ") ? prev : `@ai ${prev}`));
  };

  return (
    <div className="p-4 bg-[#0D0D12]/95 border-t border-gray-800">
      {disabled && (
        <div className="flex items-center gap-2 text-xs text-red-400 mb-2 px-1">
          <WifiOff size={12} /> Connecting…
        </div>
      )}
      <div className="bg-[#15151A] rounded-xl border border-gray-700 focus-within:ring-1 focus-within:ring-lime-400/50">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700">
          <button
            type="button"
            onClick={insertAIPrefix}
            className="text-lime-400 flex items-center gap-1 text-xs font-bold hover:text-lime-300 transition"
            title="Prefix with @ai to ask Gemini"
          >
            <Bot size={14} /> Ask Gemini
          </button>
          <span className="ml-auto text-[10px] text-gray-500 font-mono">
            <kbd className="px-1 py-0.5 bg-gray-800 rounded">Enter</kbd> to send
            &nbsp;·&nbsp;
            <kbd className="px-1 py-0.5 bg-gray-800 rounded">Shift+Enter</kbd> for newline
          </span>
        </div>

        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Connecting to room…" : "Message the room or type @ai to ask Gemini…"}
          disabled={disabled}
          className="w-full bg-transparent text-gray-200 resize-none p-4 focus:outline-none min-h-[70px] disabled:opacity-50"
        />

        <div className="flex justify-end px-3 pb-3">
          <button
            onClick={submit}
            disabled={disabled || !text.trim()}
            className="bg-lime-400 hover:bg-lime-300 disabled:opacity-40 disabled:cursor-not-allowed text-black p-2 rounded-lg transition"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}