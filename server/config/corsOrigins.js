// CLIENT_URL can be a single origin or a comma-separated list (local dev +
// deployed Vercel URL). Both app.js and socket.js need the same parsed array.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

module.exports = allowedOrigins;
