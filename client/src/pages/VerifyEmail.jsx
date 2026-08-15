import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Clock, ArrowRight, Loader2 } from "lucide-react";

import API from "../services/api";
import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";
import ResendVerificationForm from "../components/auth/ResendVerificationForm";

/**
 * VerifyEmail — /verify-email/:token
 *
 * Lands here from the emailed link, immediately exchanges the token with the
 * API, and shows one of four states:
 *
 *   verifying → spinner
 *   success   → tick, then auto-redirect to /login with a success message
 *   expired   → friendly copy + inline resend form (requirement 7)
 *   invalid   → flat error + a route back to login
 *
 * The redirect passes the success message through router location state
 * rather than a query string: it survives the navigation, doesn't linger in
 * the URL bar, and disappears if the user reloads the login page.
 */

const REDIRECT_DELAY_MS = 2500;

function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying"); // verifying|success|expired|invalid
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  // StrictMode double-invokes effects in dev. Without this guard the token
  // would be redeemed twice: the first call succeeds and clears the token,
  // the second finds no match and paints a false "invalid link" error.
  const hasRequested = useRef(false);

  const verify = useCallback(async () => {
    try {
      const { data } = await API.get(`/auth/verify-email/${token}`);

      setStatus("success");
      setMessage(data.message || "Email verified successfully.");
    } catch (err) {
      const res = err.response?.data;

      if (res?.reason === "TOKEN_EXPIRED") {
        setStatus("expired");
        setEmail(res.email || "");
        setMessage(res.message || "This verification link has expired.");
        return;
      }

      setStatus("invalid");
      setMessage(
        res?.message ||
          "We couldn't verify this link. It may be invalid or already used."
      );
    }
  }, [token]);

  useEffect(() => {
    if (hasRequested.current) return;
    hasRequested.current = true;
    verify();
  }, [verify]);

  // Auto-redirect on success (requirement 4). Cleared on unmount so a user
  // who clicks through early doesn't get yanked a second time.
  useEffect(() => {
    if (status !== "success") return;

    const timer = setTimeout(() => {
      navigate("/login", {
        replace: true,
        state: { verifiedMessage: message },
      });
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [status, message, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative w-full max-w-md glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl animate-scale-in">
        <div className="mb-8">
          <BrandMark />
        </div>

        {status === "verifying" && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/25 flex items-center justify-center mx-auto mb-5">
              <Loader2 size={26} className="text-indigo-300 animate-spin" />
            </div>
            <h1 className="text-xl font-display font-bold text-white mb-1.5">
              Verifying your email…
            </h1>
            <p className="text-slate-400 text-sm">This only takes a moment.</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/25 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={26} className="text-emerald-400" />
            </div>
            <h1 className="text-xl font-display font-bold text-white mb-1.5">
              You're verified
            </h1>
            <p className="text-slate-400 text-sm mb-7">{message}</p>

            <button
              onClick={() =>
                navigate("/login", {
                  replace: true,
                  state: { verifiedMessage: message },
                })
              }
              className="btn-primary w-full py-3 rounded-xl text-sm"
            >
              Continue to sign in
              <ArrowRight size={16} />
            </button>

            <p className="text-xs text-slate-500 mt-4">
              Redirecting you automatically…
            </p>
          </div>
        )}

        {status === "expired" && (
          <div>
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 ring-1 ring-amber-400/25 flex items-center justify-center mx-auto mb-5">
                <Clock size={26} className="text-amber-400" />
              </div>
              <h1 className="text-xl font-display font-bold text-white mb-1.5">
                This link has expired
              </h1>
              <p className="text-slate-400 text-sm">
                Verification links are only valid for a limited time. Enter your
                email and we'll send a fresh one.
              </p>
            </div>

            <ResendVerificationForm initialEmail={email} />

            <p className="text-center text-slate-400 text-sm mt-6">
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Back to sign in
              </Link>
            </p>
          </div>
        )}

        {status === "invalid" && (
          <div>
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 ring-1 ring-red-400/25 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={26} className="text-red-400" />
              </div>
              <h1 className="text-xl font-display font-bold text-white mb-1.5">
                We couldn't verify this link
              </h1>
              <p className="text-slate-400 text-sm">{message}</p>
            </div>

            <ResendVerificationForm />

            <p className="text-center text-slate-400 text-sm mt-6">
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Back to sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
