import { useEffect, useRef, useState } from "react";
import socket from "../socket/socket";
import API from "../services/api";
import { SERVER_ORIGIN } from "../utils/config";

// The server's Multer upload route enforces a 20MB hard limit (see
// server/routes/uploadRoutes.js); we check a bit under that here so the
// error message shows before the request even goes out.
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

// How long a "typing" event stays valid client-side before we assume the
// person stopped without an explicit "stopped typing" event (e.g. tab
// closed, connection dropped) — keeps a stale indicator from sticking.
const TYPING_TIMEOUT_MS = 4000;

/**
 * useChat
 * Owns the live-chat state for a meeting room: text messages over
 * "send-message"/"receive-message", file shares, a typing indicator, and
 * read receipts. Files are uploaded once via POST /api/upload (Multer,
 * saved to disk on the server) and only the resulting metadata + URL is
 * broadcast through the existing chat pipeline — not the file bytes
 * themselves, which would blow past Socket.IO's default 1MB message-buffer
 * limit for anything but tiny files.
 */
export default function useChat(meetingId, userName, onMessage) {
  const [messages, setMessages] = useState([]);
  const [readCount, setReadCount] = useState(0);
  const [fileError, setFileError] = useState("");
  const [typingUsers, setTypingUsers] = useState([]); // display names currently typing
  // socketId -> { userName, at } — the latest "I've read up to here" a
  // peer has reported. Used to show "Seen" on our own sent messages.
  const [readReceipts, setReadReceipts] = useState({});

  const typingTimersRef = useRef({}); // socketId -> timeout, clears a stale "typing" state
  const ownTypingTimeoutRef = useRef(null);

  // Held in a ref so a caller passing a fresh closure each render can't tear
  // down and rebuild the socket subscription below.
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!meetingId) return;

    const handleReceiveMessage = (data) => {
      const msg = { type: data.type || "text", ...data };
      setMessages((prev) => [...prev, msg]);
      onMessageRef.current?.(msg);
    };

    const handleTyping = ({ id, userName: name, isTyping }) => {
      clearTimeout(typingTimersRef.current[id]);

      if (isTyping) {
        setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
        // Safety net: auto-clear if we never get an explicit "stopped typing".
        typingTimersRef.current[id] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== name));
        }, TYPING_TIMEOUT_MS);
      } else {
        setTypingUsers((prev) => prev.filter((n) => n !== name));
      }
    };

    const handleChatRead = ({ id, userName: name, at }) => {
      setReadReceipts((prev) => ({ ...prev, [id]: { userName: name, at } }));
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("chat-read", handleChatRead);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("chat-read", handleChatRead);
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
      clearTimeout(ownTypingTimeoutRef.current);
      setMessages([]);
      setReadCount(0);
      setTypingUsers([]);
      setReadReceipts({});
    };
  }, [meetingId]);

  const unreadCount = Math.max(0, messages.length - readCount);

  const markAsRead = () => {
    setReadCount(messages.length);
    if (meetingId) socket.emit("chat-read", { meetingId, at: Date.now() });
  };

  // Called on every keystroke in the composer. Emits "typing: true" (the
  // server relays it live) and — once the person pauses — "typing: false",
  // so the indicator disappears on its own without needing a keypress.
  const sendTyping = (isTyping) => {
    if (!meetingId) return;

    if (isTyping) {
      socket.emit("typing", { meetingId, isTyping: true });
      clearTimeout(ownTypingTimeoutRef.current);
      ownTypingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { meetingId, isTyping: false });
      }, 1500);
    } else {
      clearTimeout(ownTypingTimeoutRef.current);
      socket.emit("typing", { meetingId, isTyping: false });
    }
  };

  const sendMessage = (text) => {
    if (!text.trim() || !meetingId) return;

    clearTimeout(ownTypingTimeoutRef.current);
    socket.emit("typing", { meetingId, isTyping: false });

    // The server broadcasts to the whole room via io.to(room), which
    // includes this socket, so we don't optimistically add it ourselves —
    // "receive-message" will deliver it back to us too.
    socket.emit("send-message", {
      meetingId,
      type: "text",
      sender: userName || "Guest",
      message: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
    });
  };

  const sendFile = async (file) => {
    if (!file || !meetingId) return;
    setFileError("");

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        `"${file.name}" is too large to share here (max ${Math.floor(
          MAX_FILE_SIZE_BYTES / (1024 * 1024)
        )}MB).`
      );
      return;
    }

    try {
      const form = new FormData();
      form.append("file", file);

      const { data } = await API.post("/upload", form);

      socket.emit("send-message", {
        meetingId,
        type: "file",
        sender: userName || "Guest",
        fileName: data.file.fileName,
        fileType: data.file.fileType,
        fileSize: data.file.fileSize,
        fileUrl: `${SERVER_ORIGIN}${data.file.fileUrl}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now(),
      });
    } catch (err) {
      setFileError(err.response?.data?.message || `Failed to share "${file.name}".`);
    }
  };

  return {
    messages,
    unreadCount,
    sendMessage,
    sendFile,
    markAsRead,
    fileError,
    typingUsers,
    sendTyping,
    readReceipts,
  };
}
