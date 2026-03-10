import { Bot } from "lucide-react";

export default function AIMessage({ message }) {
  return (
    <div className="bg-[#1A1A23]/60 border border-lime-400/10 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-2">
        <Bot size={18} className="text-lime-400" />
        <span className="font-bold text-lime-400">
          DevAI Assistant
        </span>
        <span className="text-xs text-gray-500">
          {message.model}
        </span>
      </div>

      <p className="text-gray-300 text-sm">
        {message.content.text}
      </p>

      {message.content.code && (
        <pre className="mt-4 bg-[#1E1E24] p-4 rounded-lg text-sm overflow-x-auto">
          <code>{message.content.code.body}</code>
        </pre>
      )}
    </div>
  );
}