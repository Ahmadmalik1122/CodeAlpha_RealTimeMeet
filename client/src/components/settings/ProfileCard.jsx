import { CheckCircle2, AlertCircle, Mail, Lock, Loader2 } from "lucide-react";
import ProfilePhotoUploader from "./ProfilePhotoUploader";

/**
 * ProfileCard
 * The "Profile settings" glass panel: photo uploader + name/phone/bio/email
 * fields + submit button, with its own loading/error/saving presentation.
 * All state and the actual save/upload calls stay in Settings.jsx — this
 * component is purely presentational so it stays easy to reuse/test.
 */
function ProfileCard({
  loading,
  saving,
  uploadingPhoto,
  error,
  fullName,
  phone,
  bio,
  email,
  bioMaxLength,
  displaySrc,
  hasPhoto,
  pendingFile,
  onFullNameChange,
  onPhoneChange,
  onBioChange,
  onPhotoSelect,
  onPhotoError,
  onSubmit,
}) {
  return (
    <div className="glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl">
      <h1 className="text-2xl sm:text-[1.75rem] font-display font-bold text-white mb-1.5">
        Profile settings
      </h1>
      <p className="text-slate-400 text-sm mb-7">
        Update your photo and personal details.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Loading your profile…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Profile picture */}
          <ProfilePhotoUploader
            fullName={fullName}
            displaySrc={displaySrc}
            hasPhoto={hasPhoto}
            pendingFile={pendingFile}
            onSelect={onPhotoSelect}
            onError={onPhotoError}
          />

          <div className="h-px bg-white/10" />

          {/* Full name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-xs font-medium text-slate-400 mb-1.5"
            >
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => onFullNameChange(e.target.value)}
              placeholder="Your full name"
              required
              maxLength={80}
              className="input-field rounded-xl px-4 py-3 text-sm"
            />
          </div>

          {/* Phone number */}
          <div>
            <label
              htmlFor="phone"
              className="block text-xs font-medium text-slate-400 mb-1.5"
            >
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="+1 555 123 4567"
              maxLength={20}
              className="input-field rounded-xl px-4 py-3 text-sm"
            />
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="bio" className="block text-xs font-medium text-slate-400">
                Bio
              </label>
              <span className="text-xs text-slate-500">
                {bio.length}/{bioMaxLength}
              </span>
            </div>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => onBioChange(e.target.value.slice(0, bioMaxLength))}
              placeholder="Tell your teammates a little about yourself…"
              rows={4}
              className="input-field rounded-xl px-4 py-3 text-sm resize-none"
            />
          </div>

          {/* Email — read only */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-slate-400 mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                id="email"
                type="email"
                value={email}
                readOnly
                disabled
                className="input-field rounded-xl pl-11 pr-11 py-3 text-sm text-slate-400 cursor-not-allowed opacity-80"
              />
              <Lock
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600"
              />
            </div>
            <p className="text-slate-500 text-xs mt-1.5">
              Your email is tied to your account and can't be changed here.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full py-3 rounded-xl text-sm mt-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {uploadingPhoto ? "Uploading photo…" : "Saving…"}
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Save changes
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default ProfileCard;
