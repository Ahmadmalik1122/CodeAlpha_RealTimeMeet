import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import API from "../services/api";
import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";

/**
 * ResetPassword — /reset-password/:token
 *
 * Mirrors VerifyEmail's shape: validate the token on mount, then render one
 * of several states.
 *
 *   checking → spinner
 *   form     → the actual new-password form (token is good)
 *   success  → tick, then auto-redirect to /login
 *   expired  → friendly copy + route back to /forgot-password
 *   invalid  → flat error + route back to /forgot-password
 *
 * The upfront GET is what buys the expired/invalid states. Without it the
 * user would fill in two password fields, submit, and only then learn the
 * link was dead — the most annoying possible moment to find out.
 *
 * On success the redirect passes its message through router location state
 * rather than a query string: it survives the navigation, stays out of the
 * URL bar, and vanishes on reload. Login already renders this as
 * `verifiedMessage`, so the success banner works with no change there.
 */

const MIN_PASSWORD_LENGTH = 6;
const REDIRECT_DELAY_MS = 2500;

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("checking"); // checking|form|success|expired|invalid
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Field-level messages, only shown after a submit attempt so the form
  // doesn't scold the user mid-typing.
  const [fieldErrors, setFieldErrors] = useState({});

  // StrictMode double-invokes effects in dev. The GET is read-only so a
  // duplicate is harmless, but the guard keeps the network tab honest and
  // matches VerifyEmail.
  const hasChecked = useRef(false);

  const checkToken = useCallback(async () => {
    try {
      await API.get(`/auth/reset-password/${token}`);
      setStatus("form");
    } catch (err) {
      const res = err.response?.data;

      if (res?.reason === "TOKEN_EXPIRED") {
        setStatus("expired");
        setEmail(res.email || "");
        setMessage(res.message || "This password reset link has expired.");
        return;
      }

      setStatus("invalid");
      setMessage(
        res?.message ||
          "This password reset link is invalid or has already been used."
      );
    }
  }, [token]);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    checkToken();
  }, [checkToken]);

  // Auto-redirect on success. Cleared on unmount so a user who clicks through
  // early doesn't get yanked a second time.
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

  const validate = () => {
    const errors = {};

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);

      const { data } = await API.post(`/auth/reset-password/${token}`, {
        password,
        confirmPassword,
      });

      setMessage(data.message || "Password reset successfully.");
      setStatus("success");
    } catch (err) {
      const res = err.response?.data;

      // A token can lapse between page load and submit. Promote that to the
      // full expired screen rather than showing it as a form error the user
      // can't do anything about.
      if (res?.reason === "TOKEN_EXPIRED" || res?.reason === "INVALID_TOKEN") {
        setEmail(res.email || "");
        setMessage(res.message || "This password reset link is no longer valid.");
        setStatus(res.reason === "TOKEN_EXPIRED" ? "expired" : "invalid");
        return;
      }

      if (res?.reason === "PASSWORD_TOO_SHORT") {
        setFieldErrors({ password: res.message });
      } else if (res?.reason === "PASSWORD_MISMATCH") {
        setFieldErrors({ confirmPassword: res.message });
      }

      setError(res?.message || "Couldn't reset your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative w-full max-w-md glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl animate-scale-in">
        <div className="mb-8">
          <BrandMark />
        </div>

        {status === "checking" && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/25 flex items-center justify-center mx-auto mb-5">
              <Loader2 size={26} className="text-indigo-300 animate-spin" />
            </div>
            <h1 className="text-xl font-display font-bold text-white mb-1.5">
              Checking your link…
            </h1>
            <p className="text-slate-400 text-sm">This only takes a moment.</p>
          </div>
        )}

        {status === "form" && (
          <>
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/25 flex items-center justify-center mx-auto mb-5">
                <ShieldCheck size={26} className="text-indigo-300" />
              </div>
              <h1 className="text-xl font-display font-bold text-white mb-1.5">
                Reset your password
              </h1>
              <p className="text-slate-400 text-sm">
                Choose a new password for your account. Make it at least{" "}
                {MIN_PASSWORD_LENGTH} characters.
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
                  htmlFor="new-password"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                    className="input-field rounded-xl px-4 py-3 pr-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus-ring rounded"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-300 text-xs mt-1.5 flex items-center gap-1.5">
                    <AlertCircle size={12} className="shrink-0" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    className="input-field rounded-xl px-4 py-3 pr-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus-ring rounded"
                    title={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-300 text-xs mt-1.5 flex items-center gap-1.5">
                    <AlertCircle size={12} className="shrink-0" />
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 rounded-xl text-sm mt-2"
              >
                {submitting ? "Resetting…" : "Reset Password"}
                {!submitting && <ArrowRight size={16} />}
              </button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
              <Link
                to="/login"
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Back to Login
              </Link>
            </p>
          </>
        )}

        {status === "success" && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/25 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={26} className="text-emerald-400" />
            </div>

            <h1 className="text-xl font-display font-bold text-white mb-1.5">
              Password reset successfully.
            </h1>

            <p className="text-slate-400 text-sm mb-7">
              You can now sign in with your new password.
            </p>

            <button
              onClick={() =>
                navigate("/login", {
                  replace: true,
                  state: { verifiedMessage: message },
                })
              }
              className="btn-primary w-full py-3 rounded-xl text-sm"
            >
              Go to Login
              <ArrowRight size={16} />
            </button>

            <p className="text-xs text-slate-500 mt-4">
              Redirecting you automatically…
            </p>
          </div>
        )}

        {status === "expired" && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 ring-1 ring-amber-400/25 flex items-center justify-center mx-auto mb-5">
              <Clock size={26} className="text-amber-400" />
            </div>

            <h1 className="text-xl font-display font-bold text-white mb-1.5">
              This link has expired
            </h1>

            <p className="text-slate-400 text-sm mb-7">{message}</p>

            <Link
              to="/forgot-password"
              state={{ email }}
              className="btn-primary w-full py-3 rounded-xl text-sm inline-flex"
            >
              Request a new link
              <ArrowRight size={16} />
            </Link>

            <p className="text-center text-slate-400 text-sm mt-6">
              <Link
                to="/login"
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Back to Login
              </Link>
            </p>
          </div>
        )}

        {status === "invalid" && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 ring-1 ring-red-400/25 flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={26} className="text-red-400" />
            </div>

            <h1 className="text-xl font-display font-bold text-white mb-1.5">
              This link isn't valid
            </h1>

            <p className="text-slate-400 text-sm mb-7">{message}</p>

            <Link
              to="/forgot-password"
              className="btn-primary w-full py-3 rounded-xl text-sm inline-flex"
            >
              Request a new link
              <ArrowRight size={16} />
            </Link>

            <p className="text-center text-slate-400 text-sm mt-6">
              <Link
                to="/login"
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Back to Login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
