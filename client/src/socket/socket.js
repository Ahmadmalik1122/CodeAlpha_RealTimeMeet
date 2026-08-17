import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// autoConnect: false prevents an anonymous connection before the user has
// authenticated. MeetingRoom calls socket.connect() once it mounts (after
// auth is confirmed) and socket.disconnect() when it unmounts.
//
// The auth callback is invoked on every connection attempt (including
// reconnects), so the JWT is always fresh from localStorage and the server
// can verify identity during the Socket.IO handshake rather than trusting
// a client-supplied userId field in later events.
const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (cb) => {
    cb({ token: localStorage.getItem("token") || "" });
  },
});

export default socket;
