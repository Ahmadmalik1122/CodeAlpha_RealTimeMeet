// Base origin of the Express server (no "/api" suffix) — used to build full
// URLs for statically-served assets like uploaded chat files.
export const SERVER_ORIGIN =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
