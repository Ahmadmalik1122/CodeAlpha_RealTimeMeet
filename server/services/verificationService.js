const crypto = require("crypto");
const { sendMail } = require("../config/mailer");
const { verificationEmail, welcomeEmail } = require("./emailTemplates");

// ── Config ───────────────────────────────────────────────────────────────────
const EXPIRY_HOURS =
  Number(process.env.VERIFICATION_TOKEN_EXPIRY_HOURS) || 24;

const RESEND_COOLDOWN_MS =
  (Number(process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS) || 60) * 1000;

// ── Helpers ──────────────────────────────────────────────────────────────────
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Generate token, persist hash on user, send verification email.
 *
 * deferEmail: true  → fire-and-forget (registration must never fail due to mail)
 * deferEmail: false → awaited (resend endpoint, errors propagate to caller)
 */
async function issueVerificationToken(user, { deferEmail = false } = {}) {
  const rawToken = crypto.randomBytes(32).toString("hex");

  user.verificationToken = hashToken(rawToken);
  user.verificationTokenExpiry = new Date(
    Date.now() + EXPIRY_HOURS * 60 * 60 * 1000
  );
  user.lastVerificationEmailSentAt = new Date();
  await user.save();

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${rawToken}`;
  const tpl = verificationEmail({
    fullName: user.fullName,
    verifyUrl,
    expiryHours: EXPIRY_HOURS,
  });

  if (deferEmail) {
    sendMail({ to: user.email, ...tpl }).catch((err) =>
      console.error("Deferred verification email failed:", err.message)
    );
  } else {
    await sendMail({ to: user.email, ...tpl });
  }

  return { previewUrl: null };
}

/** Find user by raw email-link token (hashes it for DB lookup). */
async function findUserByRawToken(rawToken) {
  const User = require("../models/User");
  const hash = hashToken(rawToken);
  return User.findOne({ verificationToken: hash }).select(
    "+verificationToken +verificationTokenExpiry +lastVerificationEmailSentAt"
  );
}

/** Returns true if the stored token has passed its expiry. */
function isTokenExpired(user) {
  if (!user.verificationTokenExpiry) return true;
  return user.verificationTokenExpiry < new Date();
}

/** Mark verified, clear token fields. Safe to call on already-verified users. */
async function markVerified(user) {
  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpiry = null;
  await user.save();
}

/** Remaining cooldown seconds before another resend is allowed, or 0. */
function getResendCooldownRemaining(user) {
  if (!user.lastVerificationEmailSentAt) return 0;
  const elapsed =
    Date.now() - new Date(user.lastVerificationEmailSentAt).getTime();
  const remaining = RESEND_COOLDOWN_MS - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/** One-time welcome email after successful verification. Caller catches errors. */
async function sendWelcomeEmail(user) {
  const loginUrl = `${process.env.CLIENT_URL}/login`;
  const tpl = welcomeEmail({ fullName: user.fullName, loginUrl });
  return sendMail({ to: user.email, ...tpl });
}

module.exports = {
  sendMail,
  issueVerificationToken,
  findUserByRawToken,
  isTokenExpired,
  markVerified,
  getResendCooldownRemaining,
  sendWelcomeEmail,
};