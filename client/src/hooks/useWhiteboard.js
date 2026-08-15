import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../socket/socket";

// Fixed logical resolution for the whiteboard canvas. Using a constant
// internal size (scaled to fit via CSS) means resizing the browser window
// never clears the drawing — only actual "Clear" does.
export const WHITEBOARD_WIDTH = 1600;
export const WHITEBOARD_HEIGHT = 900;

/**
 * useWhiteboard
 * Synced freehand drawing: every line segment is drawn locally immediately
 * for zero-latency feel, then broadcast via "whiteboard-draw" so everyone
 * else's canvas draws the same segment. Late joiners get the full stroke
 * history replayed via "whiteboard-history" (sent once by the server right
 * after "all-users", see server/socket/socket.js).
 *
 * Undo/redo is per-user: each continuous pointer-down-to-up stroke is
 * tagged with a strokeId, and only strokes *you* drew go on your own
 * undo stack. Undoing removes every segment with that strokeId from the
 * shared history (server-side) and rebroadcasts the trimmed history to
 * everyone via "whiteboard-redraw" so all boards stay in lockstep — far
 * simpler and more robust than trying to surgically erase pixels.
 */
export default function useWhiteboard(meetingId, active) {
  const canvasRef = useRef(null);
  const myStrokesRef = useRef([]); // ordered [{ strokeId, segments }] we drew
  const redoStackRef = useRef([]); // strokes we've undone, available to redo
  const currentStrokeRef = useRef(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Wrapped in useCallback (stable identity across renders, since they only
  // ever read canvasRef.current) so redrawAll below — and the effect that
  // depends on it — can list them as dependencies without those
  // dependencies changing on every render.
  const paintSegment = useCallback((seg) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    // Eraser works by punching transparency into the canvas itself rather
    // than drawing a same-color-as-background stroke, so it correctly
    // erases overlapping strokes of any color.
    ctx.globalCompositeOperation = seg.tool === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(seg.fromX * WHITEBOARD_WIDTH, seg.fromY * WHITEBOARD_HEIGHT);
    ctx.lineTo(seg.toX * WHITEBOARD_WIDTH, seg.toY * WHITEBOARD_HEIGHT);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = seg.size;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const redrawAll = useCallback(
    (history) => {
      clearCanvas();
      (history || []).forEach(paintSegment);
    },
    [clearCanvas, paintSegment]
  );

  useEffect(() => {
    if (!active || !meetingId) return;

    const handleHistory = (history) => redrawAll(history);
    const handleDraw = (seg) => paintSegment(seg);
    const handleRedraw = (history) => redrawAll(history);
    const handleClear = () => {
      clearCanvas();
      myStrokesRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
    };

    socket.on("whiteboard-history", handleHistory);
    socket.on("whiteboard-draw", handleDraw);
    socket.on("whiteboard-redraw", handleRedraw);
    socket.on("whiteboard-clear", handleClear);

    // Catch up on everything drawn before this board was mounted.
    socket.emit("whiteboard-request-history");

    return () => {
      socket.off("whiteboard-history", handleHistory);
      socket.off("whiteboard-draw", handleDraw);
      socket.off("whiteboard-redraw", handleRedraw);
      socket.off("whiteboard-clear", handleClear);
    };
  }, [active, meetingId, redrawAll, paintSegment, clearCanvas]);

  // Call on pointerdown, before the first drawSegment of a stroke.
  const beginStroke = () => {
    currentStrokeRef.current = {
      strokeId: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      segments: [],
    };
  };

  const drawSegment = (seg) => {
    const stroke = currentStrokeRef.current;
    const fullSeg = { ...seg, strokeId: stroke?.strokeId, authorId: socket.id };
    paintSegment(fullSeg);
    stroke?.segments.push(fullSeg);
    socket.emit("whiteboard-draw", fullSeg);
  };

  // Call on pointerup/pointerleave, after the last drawSegment of a stroke.
  const endStroke = () => {
    const stroke = currentStrokeRef.current;
    if (stroke && stroke.segments.length > 0) {
      myStrokesRef.current.push(stroke);
      redoStackRef.current = []; // a fresh action invalidates old redo history
      setCanUndo(true);
      setCanRedo(false);
    }
    currentStrokeRef.current = null;
  };

  const clearBoard = () => {
    clearCanvas();
    myStrokesRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    socket.emit("whiteboard-clear");
  };

  const undo = () => {
    const last = myStrokesRef.current.pop();
    if (!last) return;
    redoStackRef.current.push(last);
    setCanUndo(myStrokesRef.current.length > 0);
    setCanRedo(true);
    socket.emit("whiteboard-undo", { strokeId: last.strokeId });
  };

  const redo = () => {
    const stroke = redoStackRef.current.pop();
    if (!stroke) return;
    myStrokesRef.current.push(stroke);
    setCanRedo(redoStackRef.current.length > 0);
    setCanUndo(true);
    socket.emit("whiteboard-redo", { strokeId: stroke.strokeId, segments: stroke.segments });
  };

  return {
    canvasRef,
    drawSegment,
    beginStroke,
    endStroke,
    clearBoard,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
