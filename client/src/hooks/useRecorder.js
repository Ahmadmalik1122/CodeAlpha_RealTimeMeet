import { useCallback, useEffect, useRef, useState } from "react";

const FPS = 25;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

/**
 * useRecorder
 * Records the meeting entirely client-side — there is no server-side media
 * pipeline, so this captures exactly what your own browser can see and hear:
 * a canvas compositing every currently-visible video tile in a grid, mixed
 * with every tile's audio track via the Web Audio API, encoded live with
 * MediaRecorder and auto-downloaded as a .webm when you stop.
 *
 * Call `updateTiles(tiles)` whenever the participant list changes (tiles:
 * [{ id, name, stream, cameraOn }]) so the composite adapts as people join
 * or leave, screen-share, or toggle their camera.
 */
export default function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState("");

  const tilesRef = useRef([]);
  const videoElsRef = useRef(new Map());
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const destinationRef = useRef(null);
  const audioSourcesRef = useRef(new Map());
  const startTimeRef = useRef(0);
  const timerIntervalRef = useRef(null);

  // Stable identity: MeetingRoom calls this from an effect keyed on
  // [updateTiles, videoTiles], so a fresh function each render would make
  // that effect fire on every single render instead of only when the tiles
  // actually change. It only writes a ref, so [] deps are correct.
  const updateTiles = useCallback((tiles) => {
    tilesRef.current = tiles;
  }, []);

  const ensureVideoEl = (tile) => {
    let el = videoElsRef.current.get(tile.id);
    if (!el) {
      el = document.createElement("video");
      el.muted = true; // audio is pulled separately via Web Audio to avoid double playback
      el.playsInline = true;
      videoElsRef.current.set(tile.id, el);
    }
    if (el.srcObject !== tile.stream) {
      el.srcObject = tile.stream || null;
      if (tile.stream) el.play().catch(() => {});
    }
    return el;
  };

  const ensureAudioSource = (tile) => {
    if (!tile.stream || tile.stream.getAudioTracks().length === 0) return;
    if (audioSourcesRef.current.has(tile.id)) return;
    try {
      const source = audioCtxRef.current.createMediaStreamSource(tile.stream);
      source.connect(destinationRef.current);
      audioSourcesRef.current.set(tile.id, source);
    } catch (err) {
      console.error("Failed to connect audio source for recording:", err);
    }
  };

  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#202124";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tiles = tilesRef.current;
    const count = Math.max(tiles.length, 1);
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    tiles.forEach((tile, i) => {
      ensureVideoEl(tile);
      ensureAudioSource(tile);

      const el = videoElsRef.current.get(tile.id);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellW;
      const y = row * cellH;

      if (el && el.readyState >= 2 && tile.cameraOn !== false) {
        const vw = el.videoWidth || 16;
        const vh = el.videoHeight || 9;
        const scale = Math.max(cellW / vw, cellH / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = x + (cellW - dw) / 2;
        const dy = y + (cellH - dh) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, cellW, cellH);
        ctx.clip();
        ctx.drawImage(el, dx, dy, dw, dh);
        ctx.restore();
      } else {
        ctx.fillStyle = "#3c4043";
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      }

      const label = tile.name || "";
      ctx.font = "16px sans-serif";
      const labelWidth = Math.min(cellW - 16, ctx.measureText(label).width + 20);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x + 8, y + cellH - 34, labelWidth, 24);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 16, y + cellH - 16);
    });

    rafRef.current = requestAnimationFrame(drawFrame);
  };

  const startRecording = () => {
    if (isRecording) return;

    if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
      setError("Recording isn't supported in this browser.");
      return;
    }

    setError("");

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvasRef.current = canvas;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtxRef.current = new AudioCtx();
    destinationRef.current = audioCtxRef.current.createMediaStreamDestination();

    rafRef.current = requestAnimationFrame(drawFrame);

    const canvasStream = canvas.captureStream(FPS);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destinationRef.current.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";

    let recorder;
    try {
      recorder = new MediaRecorder(combinedStream, { mimeType });
    } catch (err) {
      setError("Failed to start recording: " + err.message);
      return;
    }

    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    recorder.start(1000);
    recorderRef.current = recorder;

    startTimeRef.current = Date.now();
    setElapsedMs(0);
    timerIntervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 1000);

    setIsRecording(true);
  };

  const stopRecording = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;

    audioSourcesRef.current.forEach((source) => source.disconnect());
    audioSourcesRef.current.clear();

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    videoElsRef.current.forEach((el) => {
      el.srcObject = null;
    });
    videoElsRef.current.clear();

    setIsRecording(false);
  };

  // Safety net: stop cleanly if the component unmounts mid-recording, and
  // always detach the offscreen <video> elements the compositor created —
  // otherwise they keep the participants' MediaStreams referenced after the
  // call is over.
  useEffect(() => {
    const videoEls = videoElsRef.current;
    return () => {
      if (recorderRef.current) stopRecording();
      videoEls.forEach((el) => {
        el.srcObject = null;
      });
      videoEls.clear();
    };
    // stopRecording only touches refs, so an intentionally-empty dep list
    // (unmount-only) is safe here.
  }, []);

  return { isRecording, elapsedMs, error, startRecording, stopRecording, updateTiles };
}
