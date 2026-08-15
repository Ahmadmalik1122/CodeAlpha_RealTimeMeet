import { AlertCircle, KeyRound, Lock, Loader2, ShieldCheck } from "lucide-react";

/**
 * SecurityCard
 * The "Security" glass panel: change-password form for local accounts, or
 * an explanatory message for Google-authenticated accounts (mirrors the
 * server-side GOOGLE_ACCOUNT rule in authController.changePassword). All
 * state and the actual API call stay in Settings.jsx — this component is
 * purely presentational.
 */
function SecurityCard({
  authProvider,
  passwordError,
  changingPassword,
  currentPassword,
  newPassword,
  confirmNewPassword,
  minPasswordLength,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmNewPasswordChange,
  onSubmit,
}) {
  return (
    <div className="glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl mt-6">
      <div className="flex items-center gap-2 mb-1.5">
        <ShieldCheck size={20} className="text-indigo-400" />
        <h2 className="text-xl font-display font-bold text-white">Security</h2>
      </div>

      {authProvider === "google" ? (
        <>
          <p className="text-slate-400 text-sm mb-1">
            Your account signs in with Google.
          </p>
          <p className="text-slate-500 text-xs leading-relaxed">
            There's no local password to change here — manage your sign-in
            credentials directly through your Google account instead.
          </p>
        </>
      ) : (
        <>
          <p className="text-slate-400 text-sm mb-7">
            Change the password used to sign in.
          </p>

          {passwordError && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                Current password
              </label>
              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => onCurrentPasswordChange(e.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  className="input-field rounded-xl pl-11 pr-4 py-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                New password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => onNewPasswordChange(e.target.value)}
                  placeholder={`At least ${minPasswordLength} characters`}
                  autoComplete="new-password"
                  className="input-field rounded-xl pl-11 pr-4 py-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmNewPassword"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                Confirm new password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  className="input-field rounded-xl pl-11 pr-4 py-3 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="btn-primary w-full py-3 rounded-xl text-sm mt-2"
            >
              {changingPassword ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating password…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Update password
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default SecurityCard;
