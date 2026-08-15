const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { sendMail } = require("../config/mailer");
const { passwordResetEmail, passwordChangedEmail } = require("./emailTemplates");
const { hashToken, generateRawToken, getClientUrl } = require("../utils/tokenUtils");

/**
 * Password reset service — single owner of reset-token lifecycle.
 *
 * Same token security shape as verificationService (32 random bytes, SHA-256
 * hash stored, never the raw value), but different risk profile: a reset
 * token grants account takeover, so it expires in minutes rather than hours.
 * Single use — the hash is cleared the moment the new password is written.
 */

// Short by design. A reset link is effectively a bearer credential for the
// whole account; 60 minutes is the usual ceiling.
const EXPIRY_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES) || 60;
const EXPIRY_MS = EXPIRY_MINUTES * 60 * 1000;

const RESET_COOLDOWN_MS =
  (Number(process.env.PASSWORD_RESET_COOLDOWN_SECONDS) || 60) * 1000;

// Must match the client-side rule in ResetPassword.jsx.
const MIN_PASSWORD_LENGTH = 6;

function buildResetUrl(rawToken) {
  return `${getClientUrl()}/reset-password/${rawToken}`;
}

/**
 * Generate a fresh reset token, overwrite any previous one, persist, email it.
 * The overwrite turns every earlier reset link into a dead lookup.
 *
 * Returns { previewUrl, delivered, expiryMinutes }.
 */
async function issueResetToken(user) {
  const rawToken = generateRawToken();

  user.resetPasswordToken = hashToken(rawToken);
  user.resetPasswordExpiry = new Date(Date.now() + EXPIRY_MS);
  user.lastPasswordResetEmailSentAt = new Date();

  await user.save();

  const { subject, text, html } = passwordResetEmail({
    fullName: user.fullName,
    resetUrl: buildResetUrl(rawToken),
    expiryMinutes: EXPIRY_MINUTES,
  });

  const { delivered, previewUrl } = await sendMail({
    to: user.email,
    subject,
    text,
    html,
  });

  return { delivered, previewUrl, expiryMinutes: EXPIRY_MINUTES };
}

/**
 * Look up the user holding this raw reset token. Does NOT filter on expiry so
 * the client can distinguish "expired — request a new one" from "invalid".
 * The select() is required — all three reset fields are select:false.
 */
async function findUserByRawResetToken(rawToken) {
  return User.findOne({ resetPasswordToken: hashToken(rawToken) }).select(
    "+resetPasswordToken +resetPasswordExpiry +lastPasswordResetEmailSentAt +password"
  );
}

function isResetTokenExpired(user) {
  if (!user.resetPasswordExpiry) return true;
  return user.resetPasswordExpiry.getTime() < Date.now();
}

/**
 * Write the new password and burn the token in one save.
 * A successful reset also marks the account verified — reaching this point
 * required receiving mail at the address, which is what verification proves.
 */
async function applyNewPassword(user, plainPassword) {
  user.password = await bcrypt.hash(plainPassword, 10);

  user.resetPasswordToken = null;
  user.resetPasswordExpiry = null;

  if (user.isVerified !== true) {
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
  }

  await user.save();
}

/** Remaining cooldown in seconds, or 0 if a request is allowed right now. */
function getResetCooldownRemaining(user) {
  if (!user.lastPasswordResetEmailSentAt) return 0;

  const elapsed = Date.now() - user.lastPasswordResetEmailSentAt.getTime();
  if (elapsed >= RESET_COOLDOWN_MS) return 0;

  return Math.ceil((RESET_COOLDOWN_MS - elapsed) / 1000);
}

/** Fire-and-forget security receipt after a successful reset. */
async function sendPasswordChangedEmail(user) {
  const { subject, text, html } = passwordChangedEmail({
    fullName: user.fullName,
    loginUrl: `${getClientUrl()}/login`,
  });

  return sendMail({ to: user.email, subject, text, html });
}

module.exports = {
  issueResetToken,
  findUserByRawResetToken,
  isResetTokenExpired,
  applyNewPassword,
  getResetCooldownRemaining,
  sendPasswordChangedEmail,
  EXPIRY_MINUTES,
  MIN_PASSWORD_LENGTH,
};
