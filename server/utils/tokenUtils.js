const crypto = require("crypto");

const TOKEN_BYTES = 32;

/** Hash a raw token the same way on write and on lookup. */
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function generateRawToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Client origin used to build emailed links. CLIENT_URL may be a
 * comma-separated list for CORS purposes; mailed links need exactly one,
 * so use the first.
 */
function getClientUrl() {
  const first = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();
  return first.replace(/\/$/, "");
}

module.exports = { hashToken, generateRawToken, getClientUrl };
