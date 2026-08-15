import { memo, useEffect, useRef } from "react";
import { Mic, MicOff, VideoOff, Hand, ScreenShare, Crown } from "lucide-react";
import Avatar from "../ui/Avatar";
import ReactionOverlay from "./ReactionOverlay";
import useAudioOutput from "../../hooks/useAudioOutput";

/**
 * ParticipantTile
 * Renders one participant's video (or an avatar if their camera is off),
 * with a name label and mic/camera/raised-hand/presenting/host badges —
 * the core visual unit of every layout mode.
 *
 * Works for both the local participant (pass `stream` + `muted`) and remote
 * participants (pass `stream` from the WebRTC connection).
 *
 * @param {boolean} speaking  live voice activity, from useActiveSpeaker
 * @param {boolean} isHost    renders the host crown badge
 * @param {boolean} compact   thumbnail sizing (strips/rails/PiP overlays),
 *                            where full-size badges would swamp the tile
 */
function ParticipantTile({
  name,
  stream,
  muted = false,
  micOn = true,
  cameraOn = true,
  raised = false,
  presenting = false,
  isLocal = false,
  isHost = false,
  speaking = false,
  compact = false,
  reactions = [],
}) {
  const videoRef = useRef(null);

  // Routes this element's audio to the speaker chosen in Settings (Chromium
  // only; a no-op elsewhere, where the OS default is used).
  useAudioOutput(videoRef);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream || null;
    // Explicitly detach on unmount/stream change. Leaving a MediaStream
    // attached to a discarded element can keep decoders and the stream's
    // tracks referenced, which shows up as a slow leak over a long call.
    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  // Raised hand outranks speaking: it's an explicit request for attention,
  // and someone can easily be doing both at once.
  const ringClass = raised
    ? "ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/10"
    : speaking
    ? "ring-2 ring-emerald-400/80 animate-speaking-ring"
    : "ring-1 ring-white/8";

  return (
    <div
      className={`group relative w-full h-full bg-surface-3 overflow-hidden flex items-center justify-center transition-all duration-200 ${
        compact ? "rounded-xl" : "rounded-2xl"
      } ${ringClass}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          cameraOn ? "block opacity-100" : "hidden opacity-0"
        } ${isLocal && !presenting ? "-scale-x-100" : ""}`}
      />

      {!cameraOn && (
        <div className="flex flex-col items-center justify-center gap-2 animate-fade-in">
          <Avatar name={name} size={compact ? "tile" : "lg"} ring="ring-2 ring-white/10 shadow-lg" />
        </div>
      )}

      {presenting && !compact && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 aurora-bg text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg">
          <ScreenShare size={12} />
          Presenting
        </div>
      )}

      {/* Raised-hand badge — the icon itself wiggles (looping) so it reads
          as an active alert above the tile, not just a static marker. */}
      {raised && (
        <div
          key="raised"
          className={`absolute bg-amber-400 text-black rounded-full shadow-lg animate-icon-pop ${
            compact ? "top-1.5 right-1.5 p-1" : "top-2.5 right-2.5 p-1.5"
          }`}
        >
          <Hand size={compact ? 11 : 14} className="animate-hand-wave" />
        </div>
      )}

      {/* Name + mic status pill. `key={micOn}` forces the icon to remount
          (and replay its pop-in animation) every time mute state flips. */}
      <div
        className={`absolute flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white rounded-lg max-w-[calc(100%-1.25rem)] ${
          compact ? "bottom-1.5 left-1.5 text-[11px] px-1.5 py-0.5" : "bottom-2.5 left-2.5 text-sm px-2.5 py-1"
        }`}
      >
        {!micOn ? (
          <span
            key="mic-off"
            className="inline-flex items-center justify-center rounded-full animate-icon-pop animate-mic-pulse shrink-0"
          >
            <MicOff size={compact ? 11 : 13} className="text-red-400" />
          </span>
        ) : (
          <span key="mic-on" className="inline-flex items-center justify-center animate-icon-pop shrink-0">
            <Mic
              size={compact ? 11 : 13}
              className={speaking ? "text-emerald-400" : "text-slate-300"}
            />
          </span>
        )}
        <span className="truncate">
          {name} {isLocal && <span className="text-slate-400">(You)</span>}
        </span>
        {isHost && (
          <Crown
            size={compact ? 10 : 12}
            className="text-amber-300 shrink-0"
            aria-label="Meeting host"
          />
        )}
      </div>

      {/* Camera-off badge, same remount-to-replay-animation trick. */}
      {!cameraOn && !presenting && !raised && (
        <div
          key="cam-off"
          className={`absolute bg-black/60 backdrop-blur-sm rounded-full animate-icon-pop ${
            compact ? "top-1.5 right-1.5 p-1" : "top-2.5 right-2.5 p-1.5"
          }`}
        >
          <VideoOff size={compact ? 11 : 14} className="text-white" />
        </div>
      )}

      {/* Emoji reactions sent by this specific participant, floating up
          from just above their video. */}
      <ReactionOverlay reactions={reactions} compact />
    </div>
  );
}

/**
 * memo() matters here: in a busy call every voice-activity update re-renders
 * MeetingRoom, and without this each of those renders would touch every
 * tile. The props are all primitives plus a MediaStream (stable identity)
 * and the reactions array (memoized upstream), so shallow equality holds.
 */
export default memo(ParticipantTile);
