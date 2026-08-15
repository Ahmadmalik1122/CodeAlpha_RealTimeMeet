import { Clock, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import BrandMark from "../ui/BrandMark";
import AuroraBackdrop from "../ui/AuroraBackdrop";

/**
 * WaitingRoom
 * Shown to a non-host participant between clicking "Join now" and the host
 * approving/rejecting them. Also covers the rejected and error end states
 * so MeetingRoom can render a single component for the whole pre-admission
 * flow instead of branching in three places.
 *
 * @param {"waiting"|"rejected"|"error"} status
 * @param {string} meetingId
 * @param {string} [message]     shown for "rejected"/"error"
 * @param {() => void} onCancel  leave the waiting room / go back
 */
function WaitingRoom({ status, meetingId, message, onCancel }) {
  const isRejected = status === "rejected";
  const isError = status === "error";

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative mb-8 animate-fade-in">
        <BrandMark />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center text-center animate-scale-in">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ring-1 ${
            isRejected || isError
              ? "bg-red-500/10 ring-red-500/25"
              : "bg-indigo-500/10 ring-indigo-500/25"
          }`}
        >
          {isRejected ? (
            <XCircle size={28} className="text-red-400" />
          ) : isError ? (
            <AlertTriangle size={28} className="text-red-400" />
          ) : (
            <Clock size={26} className="text-indigo-300 animate-pulse" />
          )}
        </div>

        <h1 className="text-2xl font-display font-bold mb-2">
          {isRejected
            ? "You weren't admitted"
            : isError
            ? "Something went wrong"
            : "Waiting to be let in…"}
        </h1>

        <p className="text-slate-400 text-sm mb-1.5">
          Meeting ID <span className="text-slate-300 font-medium">{meetingId}</span>
        </p>

        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          {isRejected || isError
            ? message
            : "The host has been notified you're here. Hang tight — you'll join automatically as soon as they approve you."}
        </p>

        {!isRejected && !isError && (
          <div className="flex items-center gap-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span
              className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
        )}

        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-300 hover:text-white bg-white/6 hover:bg-white/10 px-5 py-2.5 rounded-full text-sm transition-colors focus-ring"
        >
          <ArrowLeft size={15} />
          {isRejected || isError ? "Back to dashboard" : "Cancel and leave"}
        </button>
      </div>
    </div>
  );
}

export default WaitingRoom;
