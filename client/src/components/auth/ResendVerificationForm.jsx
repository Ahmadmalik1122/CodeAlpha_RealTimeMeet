import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";

import API from "../../services/api";

/**
 * ResendVerificationForm
 *
 * Shared by the expired/invalid states of VerifyEmail, the inline prompt on
 * the Login page, and the standalone /resend-verification route — so the
 * cooldown handling and copy stay identical everywhere rather than being
 * reimplemented three times.
 *
 * Props:
 *   initialEmail — prefills the field (from the API's expired-token response,
 *                  or from whatever the user just typed into the login form)
 *   compact      — drops the outer padding for embedding inside another panel
 */
function ResendVerificationForm({ initialEmail = "", compact = false }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Keep in sync when the parent discovers the address after mount (e.g. the
  // expired-token response arrives, or the user edits the login email field).
  // Synced during render (React's documented "adjusting state when a prop
  // changes" pattern) instead of in a useEffect, so this doesn't trigger an
  // extra render-then-effect-then-render cycle and satisfies
  // react-hooks/set-state-in-effect.
  const [prevInitialEmail, setPrevInitialEmail] = useState(initialEmail);
  if (initialEmail && initialEmail !== prevInitialEmail) {
    setPrevInitialEmail(initialEmail);
    setEmail(initialEmail);
  }

  // Local countdown mirroring the server's throttle, so the button is visibly
  // disabled with a live timer instead of failing on submit.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSent(false);

    try {
      setLoading(true);

      const { data } = await API.post("/auth/resend-verification", { email });

      setSent(true);
      // Start the client-side clock so rapid re-clicks don't hit a 429.
      setCooldown(60);

      // Dev-only: Ethereal returns a preview link since nothing is delivered.
      if (data.previewUrl) {
        console.log("📧 Verification email preview:", data.previewUrl);
      }
    } catch (err) {
      const res = err.response?.data;

      if (res?.reason === "COOLDOWN") {
        setCooldown(res.retryAfter || 60);
        setError(res.message || "Please wait before requesting another email.");
      } else {
        setError(res?.message || "Couldn't send the email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || cooldown > 0 || !email;

  return (
    <div className={compact ? "" : "mt-1"}>
      {sent && (
        <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm rounded-xl p-3.5 mb-4 animate-slide-up">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
          <span>
            If an unverified account exists for that email, a new verification
            link is on its way. Check your inbox and spam folder.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-4 animate-slide-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="resend-email"
            className="block text-xs font-medium text-slate-400 mb-1.5"
          >
            Email
          </label>
          <input
            id="resend-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="input-field rounded-xl px-4 py-3 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="btn-primary w-full py-3 rounded-xl text-sm"
        >
          {loading
            ? "Sending…"
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Send verification email"}
          {!loading && cooldown === 0 && <Send size={15} />}
        </button>
      </form>
    </div>
  );
}

export default ResendVerificationForm;
