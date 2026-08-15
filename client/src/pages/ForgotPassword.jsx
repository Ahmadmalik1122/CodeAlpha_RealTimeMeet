import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, ArrowLeft, KeyRound, MailCheck, Send } from "lucide-react";

import API from "../services/api";
import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";

/**
 * ForgotPassword — /forgot-password
 *
 * Two visual states rather than a form that stays put with a banner above it:
 *
 *   idle    → email field + "Send Reset Link"
 *   sent    → confirmation panel, no form
 *
 * Swapping the form out on success matters here. The API answers identically
 * for registered and unregistered addresses (deliberately — see the
 * controller's anti-enumeration note), so leaving the form on screen invites
 * the user to retype and resubmit, hunting for a different response that will
 * never come. The confirmation is a full stop.
 *
 * Accepts an optional `email` in router state so Login and the expired-token
 * state of ResetPassword can hand the address over without retyping.
 */
function ForgotPassword() {
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Local countdown mirroring the server throttle, so the button shows a live
  // timer instead of failing on submit. Same pattern as
  // ResendVerificationForm.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const { data } = await API.post("/auth/forgot-password", {
        email: email.trim(),
      });

      setSent(true);
      setCooldown(60);

      // Dev-only: Ethereal returns a preview link since nothing is delivered.
      if (data.previewUrl) {
        console.log("📧 Password reset email preview:", data.previewUrl);
      }
    } catch (err) {
      const res = err.response?.data;

      if (res?.reason === "COOLDOWN") {
        setCooldown(res.retryAfter || 60);
      }

      setError(
        res?.message || "Couldn't send the reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || cooldown > 0 || !email.trim();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative w-full max-w-md glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl animate-scale-in">
        <div className="mb-8">
          <BrandMark />
        </div>

        {sent ? (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/25 flex items-center justify-center mx-auto mb-5">
              <MailCheck size={26} className="text-emerald-400" />
            </div>

            <h1 className="text-xl font-display font-bold text-white mb-2">
              Check your inbox
            </h1>

            <p className="text-slate-300 text-sm mb-2">
              Password reset link has been sent to your email.
            </p>

            <p className="text-slate-500 text-xs leading-relaxed mb-7">
              It can take a minute to arrive — check your spam folder too. The
              link expires in 60 minutes.
            </p>

            <Link
              to="/login"
              className="btn-primary w-full py-3 rounded-xl text-sm inline-flex"
            >
              Back to Login
            </Link>

            <button
              type="button"
              onClick={() => {
                setSent(false);
                setError("");
              }}
              disabled={cooldown > 0}
              className="w-full mt-3 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors focus-ring"
            >
              {cooldown > 0
                ? `Didn't get it? Resend in ${cooldown}s`
                : "Didn't get it? Try another email"}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/25 flex items-center justify-center mx-auto mb-5">
                <KeyRound size={26} className="text-indigo-300" />
              </div>

              <h1 className="text-xl font-display font-bold text-white mb-1.5">
                Forgot your password?
              </h1>

              <p className="text-slate-400 text-sm">
                Enter your email and we'll send you a password reset link.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
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
                    : "Send Reset Link"}
                {!loading && cooldown === 0 && <Send size={15} />}
              </button>
            </form>
          </>
        )}

        {!sent && (
          <p className="text-center text-sm mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <ArrowLeft size={14} />
              Back to Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
