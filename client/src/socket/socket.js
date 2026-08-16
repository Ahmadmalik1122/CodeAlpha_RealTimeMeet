import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Do not auto-connect before authentication is available. The previous
// implementation opened an anonymous socket as soon as the bundle loaded;
// that made the waiting-room host check depend on a client-supplied userId.
// We attach the current JWT immediately before connecting instead.
const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: localStorage.getItem("token") || "",
  },
});

export function connectAuthenticatedSocket() {
  socket.auth = {
    token: localStorage.getItem("token") || "",
  };

  if (!socket.connected) {
    socket.connect();
  }
}

export default socket;
