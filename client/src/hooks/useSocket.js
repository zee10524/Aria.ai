import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import API from "../lib/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

export function useSocket(roomId) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState(null);
  // connectionError carries { message, type } where type is "auth" (go to /login)
  // or "server_error" (transient; socket.io will retry automatically).
  const [connectionError, setConnectionError] = useState(null);

  // Board state
  const [boardElements, setBoardElements] = useState([]);
  const [boardCursors, setBoardCursors] = useState({});
  // Cursor event throttle: at most one emit per 50 ms
  const cursorThrottleRef = useRef(0);

  // Reply-to state: the message object the next send will quote, or null.
  const [replyTo, setReplyToState] = useState(null);
  // Ref keeps sendMessage's closure up-to-date without re-creating it.
  const replyToRef = useRef(null);

  const setReplyTo = useCallback((msg) => {
    setReplyToState(msg);
    replyToRef.current = msg;
  }, []);

  // Fetch all room members from REST API once on mount
  useEffect(() => {
    if (!roomId) return;
    API.get(`/rooms/${roomId}/members`)
      .then(({ data }) => setAllMembers(data.members || []))
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !roomId) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
      setConnectionError(null);
      socket.emit("room:join", { roomId });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      setIsConnected(false);
      const errType = err.data?.type;
      if (errType === "auth") {
        // Stop socket.io from retrying - the token will not become valid on its own.
        socket.disconnect();
        setConnectionError({ message: err.message, type: "auth" });
      } else {
        // Transient server failure - let socket.io reconnect automatically.
        setConnectionError({
          message: "Server is temporarily unavailable. Retrying…",
          type: "server_error",
        });
      }
    });

    socket.on("error", ({ message }) => {
      setError(message);
    });

    socket.on("room:history", ({ messages: history, roomName: name }) => {
      setMessages(history || []);
      setRoomName(name || "");
    });

    socket.on("message:new", ({ message }) => {
      setMessages((prev) => [...prev, message]);
    });

    // Update reactions in-place when the server broadcasts a change.
    socket.on("message:reactions", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(messageId) ? { ...m, reactions } : m
        )
      );
    });

    socket.on("room:onlineUsers", ({ users }) => {
      setOnlineUsers(users || []);
    });

    socket.on("room:userJoined", ({ username, userId }) => {
      console.log(`${username} joined`);
      // Add to allMembers if not already there
      setAllMembers((prev) => {
        if (prev.some((m) => String(m.userId) === String(userId))) return prev;
        return [...prev, { userId, username, role: "member" }];
      });
    });

    socket.on("room:userLeft", ({ username }) => {
      console.log(`${username} left`);
    });

    socket.on("typing:update", ({ userId, username, isTyping }) => {
      setTypingUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== userId);
        if (isTyping) return [...filtered, { userId, username }];
        return filtered;
      });
    });

    socket.on("ai:typing", ({ isTyping }) => {
      setIsAITyping(isTyping);
    });

    // Board events
    socket.on("board:added", ({ element }) => {
      setBoardElements((prev) => [...prev, element]);
    });

    socket.on("board:removed", ({ elementIds }) => {
      setBoardElements((prev) =>
        prev.filter((el) => !elementIds.includes(String(el.id)))
      );
    });

    socket.on("board:cleared", () => {
      setBoardElements([]);
    });

    socket.on("board:cursor", ({ userId, username, x, y }) => {
      setBoardCursors((prev) => ({
        ...prev,
        [String(userId)]: { username, x, y },
      }));
    });

    return () => {
      socket.emit("room:leave", { roomId });
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setMessages([]);
      setOnlineUsers([]);
      setTypingUsers([]);
      setIsAITyping(false);
      setBoardElements([]);
      setBoardCursors({});
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (content) => {
      if (socketRef.current && content?.trim()) {
        socketRef.current.emit("message:send", {
          roomId,
          content,
          replyTo: replyToRef.current?._id || null,
        });
        // Clear reply-to after sending.
        setReplyToState(null);
        replyToRef.current = null;
      }
    },
    [roomId]
  );

  const reactToMessage = useCallback(
    (messageId, emoji) => {
      if (socketRef.current) {
        socketRef.current.emit("message:react", { roomId, messageId, emoji });
      }
    },
    [roomId]
  );

  const startTyping = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("typing:start", { roomId });
    }
  }, [roomId]);

  const stopTyping = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("typing:stop", { roomId });
    }
  }, [roomId]);

  // Board functions

  // Fetch initial board state from REST; called when the board view opens.
  const initBoard = useCallback(async () => {
    if (!roomId) return;
    try {
      const { data } = await API.get(`/rooms/${roomId}/board`);
      setBoardElements(data.elements || []);
    } catch {
      // Fail silently; board starts empty.
    }
  }, [roomId]);

  // Add an element: optimistically update local state (server only broadcasts
  // board:added to *others*, not back to the sender).
  const addBoardElement = useCallback((element) => {
    setBoardElements((prev) => [...prev, element]);
    socketRef.current?.emit("board:add", { roomId, element });
  }, [roomId]);

  // Remove elements by ID array (eraser). Wait for server's board:removed broadcast.
  const removeBoardElements = useCallback((elementIds) => {
    socketRef.current?.emit("board:remove", { roomId, elementIds });
  }, [roomId]);

  // Undo: server removes the sender's most recent element and broadcasts board:removed.
  const undoBoard = useCallback(() => {
    socketRef.current?.emit("board:undo", { roomId });
  }, [roomId]);

  // Clear: owner only. Server broadcasts board:cleared to all members.
  const clearBoard = useCallback(() => {
    socketRef.current?.emit("board:clear", { roomId });
  }, [roomId]);

  // Cursor position: throttled to at most one emit per 50 ms.
  const sendCursorPos = useCallback((x, y) => {
    const now = Date.now();
    if (now - cursorThrottleRef.current < 50) return;
    cursorThrottleRef.current = now;
    socketRef.current?.emit("board:cursor", { roomId, x, y });
  }, [roomId]);

  return {
    isConnected,
    messages,
    allMembers,
    onlineUsers,
    typingUsers,
    isAITyping,
    roomName,
    error,
    connectionError,
    replyTo,
    setReplyTo,
    sendMessage,
    reactToMessage,
    startTyping,
    stopTyping,
    boardElements,
    boardCursors,
    initBoard,
    addBoardElement,
    removeBoardElements,
    undoBoard,
    clearBoard,
    sendCursorPos,
  };
}
