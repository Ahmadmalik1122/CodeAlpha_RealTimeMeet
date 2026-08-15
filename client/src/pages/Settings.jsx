import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, ArrowRight } from "lucide-react";

import API from "../services/api";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";
import useTheme from "../hooks/useTheme";
import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";
import ProfileCard from "../components/settings/ProfileCard";
import SecurityCard from "../components/settings/SecurityCard";
import MeetingPreferencesCard from "../components/settings/MeetingPreferencesCard";
import AppearanceCard from "../components/settings/AppearanceCard";
import NotificationSettingsCard from "../components/settings/NotificationSettingsCard";
import { SERVER_ORIGIN } from "../utils/config";
import { writeJoinPrefs } from "../utils/meetingJoinPrefs";
import { writeStoredLayoutMode } from "../hooks/useLayoutMode";
import { syncAccountNotificationPrefs } from "../hooks/useBrowserNotifications";

const BIO_MAX_LENGTH = 300;
// Must match MIN_PASSWORD_LENGTH in server/services/passwordResetService.js.
// Server is the authority — this is just to save a round trip.
const MIN_PASSWORD_LENGTH = 6;

function Settings() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [authProvider, setAuthProvider] = useState("local");

  // ---- Security (change password) ----
  // Kept entirely separate from the profile form's state/error/loading above
  // — the two save independently, so mixing them would let an error in one
  // section wrongly block or clear the other.
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Persisted picture URL (what's actually saved) vs. a locally-chosen file
  // awaiting upload. previewUrl is whichever should be shown right now.
  const [profilePic, setProfilePic] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ---- Part 2B: Meeting Preferences + Notification Settings ----
  // Appearance is handled separately by useTheme()/ThemeProvider, which
  // already owns its own load/save/apply cycle (see context/ThemeContext.jsx)
  // — Settings just renders AppearanceCard against it.
  const [meetingPreferences, setMeetingPreferences] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsError, setPrefsError] = useState("");
  const [savingMeetingPrefs, setSavingMeetingPrefs] = useState(false);

  const { appearance, updateAppearance } = useTheme();

  // Load the current profile from the server (source of truth) rather than
  // trusting only whatever is cached in AuthContext/localStorage.
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const { data } = await API.get("/auth/profile");
        if (cancelled) return;

        const u = data.user;
        setFullName(u.fullName || "");
        setPhone(u.phone || "");
        setBio(u.bio || "");
        setEmail(u.email || "");
        setProfilePic(u.profilePic || "");
        setAuthProvider(u.authProvider || "local");
      } catch {
        if (!cancelled) {
          setError("Couldn't load your profile. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load Meeting Preferences + Notification Settings (Part 2B #1/#4).
  // Appearance loads separately inside ThemeProvider itself.
  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      try {
        const { data } = await API.get("/users/preferences");
        if (cancelled) return;

        setMeetingPreferences(data.meetingPreferences);
        setNotificationSettings(data.notificationSettings);

        // Keep MeetingRoom's synchronous localStorage caches current the
        // moment the account's real values are known — see
        // utils/meetingJoinPrefs.js and the exported helpers in
        // useLayoutMode.js / useBrowserNotifications.js for why these three
        // specifically need this (device ids already sync themselves via
        // useMediaDevices' own `select`, called from MeetingPreferencesCard).
        writeJoinPrefs({
          joinWithCamera: data.meetingPreferences?.joinWithCamera,
          joinWithMicrophone: data.meetingPreferences?.joinWithMicrophone,
          desktopNotifications: data.notificationSettings?.desktopNotifications,
        });
        if (data.meetingPreferences?.layout) {
          writeStoredLayoutMode(data.meetingPreferences.layout);
        }
        syncAccountNotificationPrefs(data.notificationSettings);
      } catch {
        if (!cancelled) {
          setPrefsError("Couldn't load your meeting/notification preferences. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setPrefsLoading(false);
      }
    };

    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  // Clean up the local object-URL preview when it's replaced or unmounted.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ProfilePhotoUploader (via ProfileCard) already validated the file — this
  // just owns the object-URL lifecycle, which stays here since previewUrl
  // needs to be cleaned up on unmount/replacement regardless of which field
  // triggered the change.
  const handlePhotoSelect = (file) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Full name can't be empty.");
      return;
    }

    if (bio.length > BIO_MAX_LENGTH) {
      setError(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`);
      return;
    }

    setSaving(true);

    try {
      let nextProfilePic = profilePic;

      // Upload the picture first (existing generic /api/upload endpoint —
      // same disk storage already used for meeting chat attachments), then
      // save the returned URL along with the rest of the form.
      if (pendingFile) {
        setUploadingPhoto(true);
        const form = new FormData();
        form.append("file", pendingFile);

        const { data: uploadData } = await API.post("/upload", form);
        nextProfilePic = `${SERVER_ORIGIN}${uploadData.file.fileUrl}`;
        setUploadingPhoto(false);
      }

      const { data } = await API.put("/auth/profile", {
        fullName: trimmedName,
        phone: phone.trim(),
        bio,
        profilePic: nextProfilePic,
      });

      setFullName(data.user.fullName || "");
      setPhone(data.user.phone || "");
      setBio(data.user.bio || "");
      setProfilePic(data.user.profilePic || "");

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setPendingFile(null);

      updateUser({
        fullName: data.user.fullName,
        profilePic: data.user.profilePic,
      });

      showToast("Profile updated successfully.", { type: "success" });
    } catch (err) {
      setUploadingPhoto(false);
      setError(err.response?.data?.message || "Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Fill in all three fields.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from your current password.");
      return;
    }

    setChangingPassword(true);

    try {
      await API.put("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      showToast("Password changed successfully.", { type: "success" });
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || "Couldn't change your password. Please try again."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // ---- Part 2B: Meeting Preferences save ----
  // Returns true/false (rather than throwing) so MeetingPreferencesCard can
  // decide locally whether to clear its "dirty" state — same contract
  // ProfileCard's onSubmit effectively has via handleSave above.
  const handleSaveMeetingPreferences = async (patch) => {
    setSavingMeetingPrefs(true);
    setPrefsError("");
    try {
      const { data } = await API.put("/users/preferences", { meetingPreferences: patch });
      setMeetingPreferences(data.meetingPreferences);
      writeJoinPrefs({
        joinWithCamera: data.meetingPreferences?.joinWithCamera,
        joinWithMicrophone: data.meetingPreferences?.joinWithMicrophone,
      });
      if (data.meetingPreferences?.layout) {
        writeStoredLayoutMode(data.meetingPreferences.layout);
      }
      showToast("Meeting preferences saved.", { type: "success" });
      return true;
    } catch (err) {
      setPrefsError(
        err.response?.data?.message || "Couldn't save your meeting preferences. Please try again."
      );
      return false;
    } finally {
      setSavingMeetingPrefs(false);
    }
  };

  // ---- Part 2B: Notification Settings save ----
  // One field at a time (Toggle fires immediately, there's no form submit),
  // so this both updates local state optimistically and persists — with a
  // rollback on failure, same shape as ThemeProvider.updateAppearance.
  const handleToggleNotification = async (key, value) => {
    const previous = notificationSettings;
    const next = { ...notificationSettings, [key]: value };
    setNotificationSettings(next);
    setPrefsError("");
    try {
      const { data } = await API.put("/users/preferences", {
        notificationSettings: { [key]: value },
      });
      setNotificationSettings(data.notificationSettings);
      writeJoinPrefs({ desktopNotifications: data.notificationSettings?.desktopNotifications });
      syncAccountNotificationPrefs(data.notificationSettings);
    } catch (err) {
      setNotificationSettings(previous);
      setPrefsError(
        err.response?.data?.message || "Couldn't save that notification setting. Please try again."
      );
    }
  };

  const displaySrc = previewUrl || profilePic || undefined;
  const hasPhoto = Boolean(profilePic || previewUrl);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative w-full max-w-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <BrandMark size="sm" />
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors focus-ring"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
        </div>

        <ProfileCard
          loading={loading}
          saving={saving}
          uploadingPhoto={uploadingPhoto}
          error={error}
          fullName={fullName}
          phone={phone}
          bio={bio}
          email={email}
          bioMaxLength={BIO_MAX_LENGTH}
          displaySrc={displaySrc}
          hasPhoto={hasPhoto}
          pendingFile={pendingFile}
          onFullNameChange={setFullName}
          onPhoneChange={setPhone}
          onBioChange={setBio}
          onPhotoSelect={handlePhotoSelect}
          onPhotoError={setError}
          onSubmit={handleSave}
        />

        {!loading && (
          <SecurityCard
            authProvider={authProvider}
            passwordError={passwordError}
            changingPassword={changingPassword}
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmNewPassword={confirmNewPassword}
            minPasswordLength={MIN_PASSWORD_LENGTH}
            onCurrentPasswordChange={setCurrentPassword}
            onNewPasswordChange={setNewPassword}
            onConfirmNewPasswordChange={setConfirmNewPassword}
            onSubmit={handleChangePassword}
          />
        )}

        {!prefsLoading && meetingPreferences && (
          <MeetingPreferencesCard
            preferences={meetingPreferences}
            saving={savingMeetingPrefs}
            error={prefsError}
            onSave={handleSaveMeetingPreferences}
          />
        )}

        <AppearanceCard appearance={appearance} onChange={updateAppearance} />

        {!prefsLoading && notificationSettings && (
          <NotificationSettingsCard
            settings={notificationSettings}
            saving={false}
            error={prefsError}
            onToggle={handleToggleNotification}
          />
        )}

        <button
          type="button"
          onClick={() => navigate("/activity")}
          className="w-full flex items-center justify-between gap-3 glass-panel rounded-2xl px-6 py-5 mt-6 hover:bg-white/[0.04] transition-colors focus-ring"
        >
          <span className="flex items-center gap-2.5 text-white text-sm font-medium">
            <BarChart3 size={18} className="text-indigo-300" />
            View Activity
          </span>
          <ArrowRight size={16} className="text-slate-400" />
        </button>
      </div>
    </div>
  );
}

export default Settings;
