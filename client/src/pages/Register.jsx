import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, ArrowRight, Check, X, MailCheck } from "lucide-react";

import API from "../services/api";
import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";
import ConnectionIllustration from "../components/ui/ConnectionIllustration";
import ResendVerificationForm from "../components/auth/ResendVerificationForm";

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "Too short", color: "bg-red-500" },
    { label: "Weak", color: "bg-red-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-amber-400" },
    { label: "Strong", color: "bg-emerald-500" },
    { label: "Excellent", color: "bg-emerald-400" },
  ];

  return { score, ...levels[Math.min(score, levels.length - 1)] };
}

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Set once registration succeeds; swaps the form out for the
  // "check your inbox" panel below.
  const [registeredEmail, setRegisteredEmail] = useState("");

  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === formData.password;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (confirmPassword !== formData.password) {
      setError("Passwords don't match");
      return;
    }

    try {
      setLoading(true);

      const { data } = await API.post("/auth/register", formData);

      // The API no longer returns a JWT here — an unverified account must not
      // hold a session, or it would sail straight past the login gate. So
      // instead of login() + navigate("/dashboard"), we show the
      // "check your inbox" state and wait for the user to click the link.
      setRegisteredEmail(data.email || formData.email);

      // Dev-only: Ethereal returns a preview link since nothing is delivered.
      if (data.previewUrl) {
        console.log("📧 Verification email preview:", data.previewUrl);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative w-full max-w-4xl grid lg:grid-cols-2 glass-panel-strong rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
        <div className="hidden lg:flex flex-col justify-between p-10 bg-white/[0.02] border-r border-white/5">
          <BrandMark />

          <div className="flex-1 flex items-center justify-center py-8">
            <ConnectionIllustration />
          </div>

          <div>
            <p className="text-white font-display font-semibold text-lg leading-snug mb-2">
              Free to create. Ready in seconds.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Set up your account and start your first meeting right away —
              no downloads, no waiting.
            </p>
          </div>
        </div>

        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="lg:hidden mb-8">
            <BrandMark />
          </div>

          {registeredEmail ? (
            /* ---- Post-registration: awaiting email verification ---- */
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/25 flex items-center justify-center mb-5">
                <MailCheck size={26} className="text-emerald-400" />
              </div>

              <h1 className="text-2xl sm:text-[1.75rem] font-display font-bold text-white mb-1.5">
                Check your inbox
              </h1>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                We sent a verification link to{" "}
                <span className="text-white font-medium">{registeredEmail}</span>.
                Click it to activate your account, then sign in.
              </p>

              <div className="glass-panel rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nothing yet? It can take a minute to arrive — and it's worth
                  checking your spam folder. You can send a new link below.
                </p>
              </div>

              <ResendVerificationForm initialEmail={registeredEmail} compact />

              <button
                onClick={() => navigate("/login")}
                className="w-full mt-3 py-3 rounded-xl text-sm font-medium text-slate-300 bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-indigo-500 transition-all"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-[1.75rem] font-display font-bold text-white mb-1.5">
                Create your account
              </h1>
              <p className="text-slate-400 text-sm mb-7">
                Takes less than a minute.
              </p>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-medium text-slate-400 mb-1.5">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                placeholder="Jordan Lee"
                value={formData.fullName}
                onChange={handleChange}
                required
                autoComplete="name"
                className="input-field rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5">
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
              <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
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

              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          i < strength.score ? strength.color : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{strength.label}</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-400 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={`input-field rounded-xl px-4 py-3 pr-11 text-sm ${
                    !passwordsMatch ? "!border-red-500/60" : ""
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  {confirmPassword.length > 0 &&
                    (passwordsMatch ? (
                      <Check size={17} className="text-emerald-400" />
                    ) : (
                      <X size={17} className="text-red-400" />
                    ))}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm mt-2"
            >
              {loading ? "Creating account…" : "Create account"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

              <p className="text-center text-slate-400 text-sm mt-7">
                Already have an account?{" "}
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Register;
