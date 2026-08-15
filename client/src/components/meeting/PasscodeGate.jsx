import { useState } from "react";
import { KeyRound, ArrowLeft, AlertCircle } from "lucide-react";
import BrandMark from "../ui/BrandMark";
import AuroraBackdrop from "../ui/AuroraBackdrop";

/**
 * PasscodeGate
 * Shown instead of the waiting room when the host has set a meeting
 * passcode. Submits back through the same "waiting-room:request" flow
 * (useWaitingRoom.requestToJoin), just with a passcode attached this time.
 *
 * @param {string} meetingId
 * @param {boolean} invalid       true if the last guess was wrong
 * @param {(passcode: string) => void} onSubmit
 * @param {() => void} onCancel
 */
function PasscodeGate({ meetingId, invalid, onSubmit, onCancel }) {
  const [passcode, setPasscode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    onSubmit(passcode.trim());
  };

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative mb-8 animate-fade-in">
        <BrandMark />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center text-center animate-scale-in">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 ring-1 bg-indigo-500/10 ring-indigo-500/25">
          <KeyRound size={26} className="text-indigo-300" />
        </div>

        <h1 className="text-2xl font-display font-bold mb-2">This meeting is protected</h1>

        <p className="text-slate-400 text-sm mb-1.5">
          Meeting ID <span className="text-slate-300 font-medium">{meetingId}</span>
        </p>

        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Enter the passcode the host shared with you to continue.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-3">
          <input
            type="text"
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Meeting passcode"
            className="input-field w-full rounded-xl px-4 py-3 text-sm text-center tracking-wide"
          />

          {invalid && (
            <div className="w-full flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-3 text-sm">
              <AlertCircle size={15} className="shrink-0 text-red-400" />
              <span>That passcode isn't right. Please try again.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!passcode.trim()}
            className="btn-primary w-full px-9 py-3.5 rounded-full text-sm mt-2"
          >
            Continue
          </button>
        </form>

        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-300 hover:text-white bg-white/6 hover:bg-white/10 px-5 py-2.5 rounded-full text-sm transition-colors focus-ring mt-6"
        >
          <ArrowLeft size={15} />
          Back to dashboard
        </button>
      </div>
    </div>
  );
}

export default PasscodeGate;
