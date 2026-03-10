import messages from "@/data/messages.json";
import MessageItem from "./MessageList";
import AIMessage from "./AIMessage";

export default function ChatMessages() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      {messages.map(msg =>
        msg.type === "ai" ? (
          <AIMessage key={msg.id} message={msg} />
        ) : (
          <MessageItem key={msg.id} message={msg} />
        )
      )}
    </div>
  );
}