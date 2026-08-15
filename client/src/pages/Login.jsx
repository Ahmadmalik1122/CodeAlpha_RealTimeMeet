import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  MailWarning,
} from "lucide-react";

import API from "../services/api";
import useAuth from "../hooks/useAuth";
import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";
import ConnectionIllustration from "../components/ui/ConnectionIllustration";
import ResendVerificationForm from "../components/auth/ResendVerificationForm";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/firebase";

const REMEMBER_KEY = "rtm_remembered_email";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: localStorage.getItem(REMEMBER_KEY) || "",
    password: "",
  });

  const [remember, setRemember] = useState(
    !!localStorage.getItem(REMEMBER_KEY),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Success banner handed over by VerifyEmail via router state.
  const [successMessage, setSuccessMessage] = useState(
    location.state?.verifiedMessage || "",
  );

  // Set when the API rejects a login with EMAIL_NOT_VERIFIED, which reveals
  // the inline resend form instead of a dead-end error.
  const [needsVerification, setNeedsVerification] = useState(false);

  // Drop the message out of history so a refresh or a later back-navigation
  // doesn't resurrect a stale "email verified!" banner.
  useEffect(() => {
    if (location.state?.verifiedMessage) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    // Intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setNeedsVerification(false);

    try {
      setLoading(true);

      const { data } = await API.post("/auth/login", formData);

      if (remember) {
        localStorage.setItem(REMEMBER_KEY, formData.email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      const res = err.response?.data;

      // 403 + EMAIL_NOT_VERIFIED — surface the resend path rather than
      // leaving the user staring at an error they can't act on.
      if (res?.reason === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
      }

      setError(res?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setNeedsVerification(false);

    try {
      // Firebase popup
      const result = await signInWithPopup(auth, googleProvider);

      // Firebase ID Token
      const idToken = await result.user.getIdToken();

      // Backend ko token bhejo
      const { data } = await API.post("/auth/google-login", {
        idToken,
      });

      // Backend ka JWT + user save karo
      login(data.user, data.token);

      navigate("/dashboard");
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || err.message || "Google Login Failed",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative w-full max-w-4xl grid lg:grid-cols-2 glass-panel-strong rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
        {/* Illustration side — hidden on small screens */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-white/[0.02] border-r border-white/5">
          <BrandMark />

          <div className="flex-1 flex items-center justify-center py-8">
            <ConnectionIllustration />
          </div>

          <div>
            <p className="text-white font-display font-semibold text-lg leading-snug mb-2">
              Meetings that feel like being in the room.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              HD video, live chat, a shared whiteboard, and screen share — all
              synced in real time, the moment you join.
            </p>
          </div>
        </div>

        {/* Form side */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="lg:hidden mb-8">
            <BrandMark />
          </div>

          <h1 className="text-2xl sm:text-[1.75rem] font-display font-bold text-white mb-1.5">
            Welcome back
          </h1>
          <p className="text-slate-400 text-sm mb-7">
            Sign in to start or join a meeting.
          </p>

          {successMessage && (
            <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
              <CheckCircle2
                size={16}
                className="shrink-0 mt-0.5 text-emerald-400"
              />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {needsVerification && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-5 animate-slide-up">
              <div className="flex items-start gap-2.5 mb-3">
                <MailWarning
                  size={16}
                  className="shrink-0 mt-0.5 text-amber-400"
                />
                <p className="text-amber-100 text-sm leading-relaxed">
                  Your account isn't verified yet. Send yourself a fresh
                  verification link — it only takes a moment.
                </p>
              </div>
              <ResendVerificationForm initialEmail={formData.email} compact />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="input-field rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
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

              <div className="flex justify-end mt-2">
                <Link
                  to="/forgot-password"
                  state={{ email: formData.email }}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500 bg-white/5 border-white/20"
              />
              Remember my email
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm mt-2"
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-medium text-slate-300 bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-indigo-500 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.73z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29A7.2 7.2 0 0 1 4.88 12c0-.8.14-1.57.39-2.29V6.6H1.27A11.96 11.96 0 0 0 0 12c0 1.93.46 3.76 1.27 5.4l4-3.11z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.6l4 3.11C6.22 6.86 8.87 4.75 12 4.75z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-slate-400 text-sm mt-7">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Create one
            </Link>
          </p>

          <p className="text-center text-slate-500 text-xs mt-3">
            Need a new verification link?{" "}
            <Link
              to="/resend-verification"
              state={{ email: formData.email }}
              className="text-slate-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Resend it
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
