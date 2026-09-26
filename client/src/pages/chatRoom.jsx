import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import API from "../lib/api";

import Sidebar from "../components/dashboard/Sidebar.jsx";
import ChatHeader from "../components/chat/ChatHeader.jsx";
import MessageList from "../components/chat/MessageList";
import MessageComposer from "../components/chat/MessageComposer";
import RightPanel from "../components/chat/RightPannel";

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const [roomDetails, setRoomDetails] = useState(null);

  const {
    isConnected,
    messages,
    allMembers,
    onlineUsers,
    typingUsers,
    isAITyping,
    roomName,
    error,
    connectionError,
    sendMessage,
    startTyping,
    stopTyping,
  } = useSocket(roomId);

  /* Fetch room details (description, tags) from the API */
  useEffect(() => {
    if (!roomId) return;
    API.get(`/rooms/${roomId}`)
      .then((res) => setRoomDetails(res.data.room))
      .catch(() => {}); // degrade gracefully: header will still show the name
  }, [roomId]);

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

  /* Auth connection error -> send to /login (bad or expired token).
     Server-side errors are shown inline; socket.io retries automatically. */
  useEffect(() => {
    if (connectionError?.type === "auth") {
      navigate("/login");
    }
  }, [connectionError, navigate]);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAITyping]);

  const handleLeaveRoom = async () => {
    try {
      await API.post(`/rooms/${roomId}/leave`);
    } catch {
      // ignore - still navigate away so the user isn't stuck
    } finally {
      navigate("/dashboard");
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background-dark text-gray-200 font-sans">

      {/* ===================== LEFT SIDEBAR ===================== */}
      <Sidebar />

      {/* ===================== MAIN CHAT ===================== */}
      <main className="flex-1 flex flex-col min-w-0 relative">

        <ChatHeader
          channel={{
            name: roomName || roomDetails?.name || "Loading…",
            description: roomDetails?.description ?? "",
            tags: roomDetails?.tags ?? [],
          }}
          isConnected={isConnected}
          onlineCount={onlineUsers.length}
          onLeave={handleLeaveRoom}
        />

        {error && error !== "Access denied to this room" && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {connectionError?.type === "server_error" && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
            {connectionError.message}
          </div>
        )}

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