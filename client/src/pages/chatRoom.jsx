import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";

import Sidebar from "../components/dashboard/Sidebar.jsx";
import ChatHeader from "../components/chat/ChatHeader.jsx";
import MessageList from "../components/chat/MessageList";
import MessageComposer from "../components/chat/MessageComposer";
import RightPanel from "../components/chat/RightPannel";

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const bottomRef = useRef(null);

  const {
    isConnected,
    messages,
    allMembers,
    onlineUsers,
    typingUsers,
    isAITyping,
    roomName,
    error,
    sendMessage,
    startTyping,
    stopTyping,
  } = useSocket(roomId);

  /* Force dark mode */
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  /* Redirect if not authenticated */
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
    }
  }, [navigate]);

  /* Redirect on access error */
  useEffect(() => {
    if (error === "Access denied to this room") {
      navigate("/dashboard");
    }
  }, [error, navigate]);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAITyping]);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background-dark text-gray-200 font-sans">

      {/* ===================== LEFT SIDEBAR ===================== */}
      <Sidebar />

      {/* ===================== MAIN CHAT ===================== */}
      <main className="flex-1 flex flex-col min-w-0 relative">

        <ChatHeader
          channel={{ name: roomName || "Loading…" }}
          isConnected={isConnected}
          onlineCount={onlineUsers.length}
        />

        <MessageList
          messages={messages}
          isAITyping={isAITyping}
          typingUsers={typingUsers}
          bottomRef={bottomRef}
        />

        <MessageComposer
          onSend={sendMessage}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          disabled={!isConnected}
        />

      </main>

      {/* ===================== RIGHT PANEL ===================== */}
      <RightPanel allMembers={allMembers} onlineUsers={onlineUsers} />

    </div>
  );
}