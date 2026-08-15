import { Mic, MicOff, Video, VideoOff, AlertCircle, Settings } from "lucide-react";
import ParticipantTile from "./ParticipantTile";
import BrandMark from "../ui/BrandMark";
import AuroraBackdrop from "../ui/AuroraBackdrop";

function PreJoinLobby({
  meetingId,
  userName,
  stream,
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  onJoin,
  onOpenSettings,
  error,
}) {
  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative mb-8 animate-fade-in">
        <BrandMark />
      </div>

      <div className="relative w-full max-w-md flex flex-col items-center animate-scale-in">
        <h1 className="text-2xl font-display font-bold mb-1.5 text-center">Ready to join?</h1>
        <p className="text-slate-400 mb-7 text-sm">
          Meeting ID <span className="text-slate-300 font-medium">{meetingId}</span>
        </p>

        <div className="w-full aspect-video mb-6 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/40">
          <ParticipantTile
            name={userName}
            stream={stream}
            muted
            micOn={micOn}
            cameraOn={cameraOn}
            isLocal
          />
        </div>

        {error && (
          <div className="w-full flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-3.5 mb-6 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onToggleMic}
            title={micOn ? "Turn off microphone" : "Turn on microphone"}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors focus-ring ${
              micOn ? "bg-white/8 hover:bg-white/12" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {micOn ? <Mic size={19} /> : <MicOff size={19} />}
          </button>

          <button
            onClick={onToggleCamera}
            title={cameraOn ? "Turn off camera" : "Turn on camera"}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors focus-ring ${
              cameraOn ? "bg-white/8 hover:bg-white/12" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {cameraOn ? <Video size={19} /> : <VideoOff size={19} />}
          </button>

          {/* Choosing the right camera/mic before joining is the whole point
              of a green room, so settings live next to the toggles here. */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Audio and video settings"
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/8 hover:bg-white/12 transition-colors focus-ring"
            >
              <Settings size={19} />
            </button>
          )}
        </div>

        <button
          onClick={() => onJoin()}
          className="btn-primary px-9 py-3.5 rounded-full text-sm"
        >
          Join now
        </button>
      </div>
    </div>
  );
}

export default PreJoinLobby;
