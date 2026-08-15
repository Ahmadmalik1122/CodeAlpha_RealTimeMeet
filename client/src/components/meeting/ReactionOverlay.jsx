/**
 * ReactionOverlay
 * Renders floating emoji that rise and fade out — purely decorative,
 * driven by the ephemeral list from useReactions. Positioned with a
 * pseudo-random horizontal offset per reaction (derived from its id) so
 * multiple reactions don't stack exactly on top of each other.
 *
 * `compact` renders it sized for a single participant tile (smaller emoji,
 * shorter float distance) instead of the full video-grid area.
 */
function ReactionOverlay({ reactions, compact = false }) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {reactions.map((r) => {
        const leftPercent = 10 + ((r.id * 37) % 80);
        return (
          <div
            key={r.id}
            className={`absolute flex flex-col items-center ${
              compact ? "bottom-10 animate-float-up-tile" : "bottom-16 animate-float-up"
            }`}
            style={{ left: `${leftPercent}%` }}
          >
            <span className={compact ? "text-2xl drop-shadow-lg" : "text-4xl drop-shadow-lg"}>
              {r.emoji}
            </span>
            {!compact && r.name && (
              <span className="text-xs text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full mt-1 whitespace-nowrap ring-1 ring-white/10">
                {r.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ReactionOverlay;
