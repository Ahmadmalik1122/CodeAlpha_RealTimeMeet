import { memo, useMemo, useRef, useState } from "react";
import ParticipantTile from "./ParticipantTile";

/**
 * VideoGrid
 * Renders the call in one of four layouts:
 *
 *   grid    — everyone equal, column count adapts to headcount
 *   speaker — one spotlight tile with a horizontal thumbnail strip below
 *   sidebar — spotlight with a vertical thumbnail rail beside it
 *   pip     — one full-bleed tile with small draggable overlay tiles
 *
 * Whoever is spotlighted is chosen the same way in every non-grid mode (see
 * pickSpotlight): an active screen share always wins, otherwise the current
 * active speaker, otherwise the first remote participant — never yourself
 * while others are present, since watching your own face is rarely useful.
 */

function getGridClass(count) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 6) return "grid-cols-2 sm:grid-cols-3";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

function pickSpotlight(tiles, activeSpeakerId, pinnedId) {
  if (!tiles.length) return null;
  // An explicit pin from the user beats every automatic rule.
  if (pinnedId) {
    const pinned = tiles.find((t) => t.id === pinnedId);
    if (pinned) return pinned;
  }
  const presenter = tiles.find((t) => t.presenting);
  if (presenter) return presenter;
  const speaker = tiles.find((t) => t.id === activeSpeakerId);
  if (speaker) return speaker;
  const firstRemote = tiles.find((t) => !t.isLocal);
  return firstRemote || tiles[0];
}

/** Horizontal thumbnail strip (speaker view, and the mobile sidebar fallback). */
const ThumbStrip = memo(function ThumbStrip({ tiles, speakingIds, onSelect, compactHeight }) {
  if (!tiles.length) return null;
  return (
    <div className={`flex gap-2 sm:gap-3 overflow-x-auto scrollbar-thin shrink-0 ${compactHeight}`}>
      {tiles.map((tile) => (
        <button
          key={tile.id}
          onClick={() => onSelect?.(tile.id)}
          title={`Spotlight ${tile.name}`}
          className="w-28 sm:w-40 shrink-0 h-full focus-ring rounded-xl"
        >
          <ParticipantTile {...tile} compact speaking={speakingIds.has(tile.id)} />
        </button>
      ))}
    </div>
  );
});

/** Vertical thumbnail rail (sidebar view — desktop/landscape tablet only). */
const ThumbRail = memo(function ThumbRail({ tiles, speakingIds, onSelect }) {
  if (!tiles.length) return null;
  return (
    <div className="flex flex-col gap-3 overflow-y-auto scrollbar-thin shrink-0 w-44 lg:w-52 h-full">
      {tiles.map((tile) => (
        <button
          key={tile.id}
          onClick={() => onSelect?.(tile.id)}
          title={`Spotlight ${tile.name}`}
          className="w-full shrink-0 h-28 lg:h-32 focus-ring rounded-xl"
        >
          <ParticipantTile {...tile} compact speaking={speakingIds.has(tile.id)} />
        </button>
      ))}
    </div>
  );
});

/**
 * PipOverlay
 * The floating tile(s) in picture-in-picture mode. Draggable by pointer so
 * it can be moved off whatever part of the shared screen it's covering.
 * Position is stored as a 0-1 fraction of the container, so it stays put
 * (proportionally) when the window resizes or the phone rotates.
 */
const PipOverlay = memo(function PipOverlay({ tiles, speakingIds, onSelect }) {
  const [pos, setPos] = useState({ x: 0.97, y: 0.03 }); // top-right by default
  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const onPointerDown = (e) => {
    const box = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!box) return;
    dragRef.current = { box, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.moved = true;
    const { box } = drag;
    const el = containerRef.current;
    const w = el ? el.offsetWidth : 0;
    const h = el ? el.offsetHeight : 0;
    // Clamp so the overlay can never be dragged off the visible area.
    const maxX = box.width - w;
    const maxY = box.height - h;
    const x = Math.min(Math.max(e.clientX - box.left - w / 2, 0), Math.max(maxX, 0));
    const y = Math.min(Math.max(e.clientY - box.top - h / 2, 0), Math.max(maxY, 0));
    setPos({
      x: maxX > 0 ? x / maxX : 0,
      y: maxY > 0 ? y / maxY : 0,
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  if (!tiles.length) return null;

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        // Offset by the same fraction so the tile stays fully on-screen at
        // both extremes (0% = flush left, 100% = flush right).
        transform: `translate(-${pos.x * 100}%, -${pos.y * 100}%)`,
      }}
      className="absolute z-20 flex flex-col gap-2 touch-none cursor-grab active:cursor-grabbing"
    >
      {tiles.map((tile) => (
        <div
          key={tile.id}
          onClick={() => {
            // Ignore the click that ends a drag, only treat taps as select.
            if (!dragRef.current?.moved) onSelect?.(tile.id);
          }}
          className="w-28 h-20 sm:w-44 sm:h-28 shadow-2xl shadow-black/50 rounded-xl overflow-hidden"
        >
          <ParticipantTile {...tile} compact speaking={speakingIds.has(tile.id)} />
        </div>
      ))}
    </div>
  );
});

function VideoGrid({
  tiles,
  mode = "grid",
  activeSpeakerId = null,
  speakingIds,
  pinnedId = null,
  onPin,
}) {
  const speaking = useMemo(() => speakingIds || new Set(), [speakingIds]);

  // A live screen share is the whole point of looking at the call, so it
  // overrides plain "grid" the way the original implementation did.
  const presenter = useMemo(() => tiles.find((t) => t.presenting), [tiles]);
  const effectiveMode = mode === "grid" && presenter ? "speaker" : mode;

  const spotlight = useMemo(
    () => pickSpotlight(tiles, activeSpeakerId, pinnedId),
    [tiles, activeSpeakerId, pinnedId]
  );
  // Stable across renders where the spotlight didn't change, so the memo()'d
  // thumbnail strip/rail/overlay above can actually skip re-rendering.
  const others = useMemo(
    () => (spotlight ? tiles.filter((t) => t.id !== spotlight.id) : []),
    [tiles, spotlight]
  );
  const pipTiles = useMemo(() => others.slice(0, 3), [others]);

  if (effectiveMode === "grid") {
    return (
      <div
        className={`grid ${getGridClass(tiles.length)} gap-2 sm:gap-3 w-full h-full auto-rows-fr overflow-y-auto scrollbar-thin p-0.5 sm:p-1`}
      >
        {tiles.map((tile) => (
          <button
            key={tile.id}
            onDoubleClick={() => onPin?.(tile.id)}
            aria-label={`Spotlight ${tile.name}`}
            className="min-h-[120px] sm:min-h-[180px] animate-scale-in focus-ring rounded-2xl text-left"
          >
            <ParticipantTile {...tile} speaking={speaking.has(tile.id)} />
          </button>
        ))}
      </div>
    );
  }

  if (!spotlight) return null;

  if (effectiveMode === "sidebar") {
    return (
      <div className="flex gap-3 w-full h-full">
        <div className="flex-1 min-w-0 animate-fade-in">
          <ParticipantTile {...spotlight} speaking={speaking.has(spotlight.id)} />
        </div>
        <ThumbRail tiles={others} speakingIds={speaking} onSelect={onPin} />
      </div>
    );
  }

  if (effectiveMode === "pip") {
    return (
      <div className="relative w-full h-full">
        <div className="w-full h-full animate-fade-in">
          <ParticipantTile {...spotlight} speaking={speaking.has(spotlight.id)} />
        </div>
        {/* Cap the overlay stack so a large call doesn't bury the video. */}
        <PipOverlay tiles={pipTiles} speakingIds={speaking} onSelect={onPin} />
      </div>
    );
  }

  // speaker
  return (
    <div className="flex flex-col gap-2 sm:gap-3 w-full h-full">
      <div className="flex-1 min-h-0 animate-fade-in">
        <ParticipantTile {...spotlight} speaking={speaking.has(spotlight.id)} />
      </div>
      <ThumbStrip
        tiles={others}
        speakingIds={speaking}
        onSelect={onPin}
        compactHeight="h-20 sm:h-28"
      />
    </div>
  );
}

/**
 * memo() here plus memo() on ParticipantTile is what keeps a large call
 * cheap: MeetingRoom re-renders on every voice-activity tick, but the grid
 * only re-renders when the tiles/mode/speaking set actually change.
 */
export default memo(VideoGrid);
