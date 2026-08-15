const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    // Null for Google-authenticated accounts
    password: {
      type: String,
      default: null,
    },

    profilePic: {
      type: String,
      default: "",
    },

    // ===================== PROFILE SETTINGS =====================
    // Optional contact/bio info editable from /settings. Both are plain
    // strings with no PII-specific handling beyond length limits enforced
    // in the controller — kept optional so existing users aren't affected.
    phone: {
      type: String,
      default: "",
      trim: true,
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    // Firebase UID, set for Google-authenticated accounts
    googleId: {
      type: String,
      default: "",
    },

    // How the account was created
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // ===================== EMAIL VERIFICATION =====================
    // Local signups start unverified and must click the emailed link.
    // Google signups are created with this already true (the provider has
    // itself confirmed ownership of the address).
    isVerified: {
      type: Boolean,
      default: false,
    },

    // SHA-256 hash of the raw token that went out in the email — never the
    // raw value. A leaked DB dump therefore can't be replayed to verify
    // somebody else's account. Lookup hashes the incoming token the same way.
    // `select: false` keeps it out of every ordinary query (e.g. getProfile).
    verificationToken: {
      type: String,
      default: null,
      select: false,
    },

    verificationTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    // Throttles "resend verification" so the endpoint can't be used to spray
    // mail at an address. See RESEND_COOLDOWN_MS in verificationService.
    lastVerificationEmailSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    // ===================== PASSWORD RESET =====================
    // Same design as the verification fields above: only the SHA-256 hash of
    // the emailed token is stored, so a DB leak can't be replayed to seize an
    // account. Kept as a separate field pair rather than reusing the
    // verification token, because the two flows can legitimately be in flight
    // at once — sharing one field would let a reset silently invalidate a
    // pending verification, or let a verification link set a password.
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    // Throttles "forgot password" so the endpoint can't be used to spray mail
    // at an address. See RESET_COOLDOWN_MS in passwordResetService.
    lastPasswordResetEmailSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    // ===================== MEETING PREFERENCES (Part 2B) =====================
    // Reused directly by the pre-join lobby / MeetingRoom: cameraId etc. are
    // the same deviceIds useMediaDevices already works with, so no new
    // device-selection concept is introduced — this is just where the choice
    // is remembered across devices/browsers instead of only in localStorage.
    meetingPreferences: {
      cameraId: { type: String, default: "" },
      microphoneId: { type: String, default: "" },
      speakerId: { type: String, default: "" },
      joinWithCamera: { type: Boolean, default: true },
      joinWithMicrophone: { type: Boolean, default: true },
      layout: {
        type: String,
        enum: ["grid", "speaker", "sidebar"],
        default: "grid",
      },
    },

    // ===================== APPEARANCE SETTINGS (Part 2B) =====================
    appearanceSettings: {
      theme: {
        type: String,
        enum: ["dark", "light", "system"],
        default: "dark",
      },
      accentColor: {
        type: String,
        enum: ["indigo", "blue", "purple", "green"],
        default: "indigo",
      },
      fontSize: {
        type: String,
        enum: ["small", "medium", "large"],
        default: "medium",
      },
      language: {
        type: String,
        enum: ["english"],
        default: "english",
      },
    },

    // ===================== NOTIFICATION SETTINGS (Part 2B) =====================
    // Distinct from the per-browser localStorage prefs in
    // useBrowserNotifications (client/src/hooks/useBrowserNotifications.js) —
    // those decide when a desktop Notification actually fires during a call
    // already in progress; these are the account-level switches shown in
    // Settings, and MeetingRoom seeds the browser hook's initial prefs from
    // these so there's one source of truth rather than two systems.
    notificationSettings: {
      meetingReminders: { type: Boolean, default: true },
      chatNotifications: { type: Boolean, default: true },
      reactionNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      desktopNotifications: { type: Boolean, default: true },
      joinLeaveNotifications: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Verification lookups hit this on every click of an emailed link. Sparse so
// the (many) rows with a null token don't bloat the index.
userSchema.index({ verificationToken: 1 }, { sparse: true });

// Reset lookups hit this on every click of an emailed reset link. Sparse for
// the same reason as above — most rows never hold a reset token.
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);