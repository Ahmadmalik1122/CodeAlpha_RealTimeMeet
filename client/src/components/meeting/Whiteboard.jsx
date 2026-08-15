import { useRef, useState } from "react";
import { X, Trash2, Eraser, Pencil, Undo2, Redo2 } from "lucide-react";
import useWhiteboard, { WHITEBOARD_WIDTH, WHITEBOARD_HEIGHT } from "../../hooks/useWhiteboard";

const COLORS = ["#ffffff", "#ea4335", "#34a853", "#4285f4", "#fbbc04", "#a142f4"];
const SIZES = [2, 4, 8];
const ERASER_SIZE = 24;

/**
 * Whiteboard
 * Full-area synced drawing surface. Coordinates are normalized to the
 * canvas's fixed logical resolution so every participant's board stays
 * pixel-aligned regardless of their window size.
 */
function Whiteboard({ meetingId, active, onClose }) {
  const { canvasRef, drawSegment, beginStroke, endStroke, clearBoard, undo, redo, canUndo, canRedo } =
    useWhiteboard(meetingId, active);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [tool, setTool] = useState("pencil"); // "pencil" | "eraser"

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const getNormalizedPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handlePointerDown = (e) => {
    isDrawingRef.current = true;
    lastPointRef.current = getNormalizedPoint(e);
    beginStroke();
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const point = getNormalizedPoint(e);
    const last = lastPointRef.current;

    drawSegment({
      fromX: last.x,
      fromY: last.y,
      toX: point.x,
      toY: point.y,
      color,
      size: tool === "eraser" ? ERASER_SIZE : size,
      tool,
    });

    lastPointRef.current = point;
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current) endStroke();
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  return (
    <div className="absolute inset-0 bg-surface-0 flex flex-col z-10 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/8 shrink-0 glass-panel-strong">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-white font-semibold text-[15px]">Whiteboard</span>

          <div className="flex items-center gap-1 glass-panel rounded-full px-1.5 py-1">
            <button
              onClick={() => setTool("pencil")}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors focus-ring ${
                tool === "pencil" ? "bg-white/15" : "hover:bg-white/10"
              }`}
              title="Pencil"
            >
              <Pencil size={15} className="text-white" />
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors focus-ring ${
                tool === "eraser" ? "bg-white/15" : "hover:bg-white/10"
              }`}
              title="Eraser"
            >
              <Eraser size={15} className="text-white" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 glass-panel rounded-full px-2 py-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setTool("pencil");
                }}
                className={`w-6 h-6 rounded-full border-2 transition-transform focus-ring ${
                  color === c && tool === "pencil"
                    ? "border-indigo-400 scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 glass-panel rounded-full px-1.5 py-1">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors focus-ring ${
                  size === s && tool === "pencil" ? "bg-white/15" : "hover:bg-white/10"
                }`}
                title={`${s}px`}
              >
                <span
                  className="rounded-full bg-white"
                  style={{ width: s + 2, height: s + 2 }}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 glass-panel rounded-full px-1.5 py-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors focus-ring ${
                canUndo ? "hover:bg-white/10 text-white" : "text-slate-600 cursor-not-allowed"
              }`}
              title="Undo"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors focus-ring ${
                canRedo ? "hover:bg-white/10 text-white" : "text-slate-600 cursor-not-allowed"
              }`}
              title="Redo"
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearBoard}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors focus-ring"
            title="Clear board for everyone"
          >
            <Trash2 size={16} />
            Clear
          </button>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors focus-ring"
            title="Close whiteboard"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-3 min-h-0">
        <canvas
          ref={canvasRef}
          width={WHITEBOARD_WIDTH}
          height={WHITEBOARD_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`w-full h-full bg-surface-2 rounded-2xl touch-none ring-1 ring-white/8 shadow-2xl shadow-black/30 ${
            tool === "eraser" ? "cursor-cell" : "cursor-crosshair"
          }`}
          style={{ aspectRatio: `${WHITEBOARD_WIDTH} / ${WHITEBOARD_HEIGHT}` }}
        />
      </div>
    </div>
  );
}

export default Whiteboard;
