// Turns "Muhammad Ahmad" into "MA", "Ali" into "A", falls back to "?"
export function getInitials(name) {
  if (!name || typeof name !== "string") return "?";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  const first = parts[0][0] || "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";

  return (first + second).toUpperCase();
}

// Deterministic pastel-ish background color per name, so each participant's
// avatar reliably gets the same color across renders/tiles.
const AVATAR_COLORS = [
  "#1a73e8",
  "#d93025",
  "#188038",
  "#f9ab00",
  "#8430ce",
  "#12b5cb",
  "#e8710a",
  "#5f6368",
];

export function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
