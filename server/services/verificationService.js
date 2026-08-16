const User = require("../models/User");
const { sendMail } = require("../config/mailer");
const { verificationEmail, welcomeEmail } = require("./emailTemplates");
const { hashToken, generateRawToken, getClientUrl } = require("../utils/tokenUtils");

/**
 * Verification service — single owner of verification token lifecycle.
 *
 * Security shape: raw token is 32 random bytes (256 bits), only its SHA-256
 * hash is stored. Read access to the DB therefore can't be replayed to verify
 * an account — plain SHA-256 (not bcrypt) is correct here because the input
 * is already high-entropy random, so lookup can be one indexed query.
 */

const EXPIRY_HOURS = Number(process.env.VERIFICATION_TOKEN_EXPIRY_HOURS) || 24;
const EXPIRY_MS = EXPIRY_HOURS * 60 * 60 * 1000;

const RESEND_COOLDOWN_MS = (Number(process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS) || 60) * 1000;

function buildVerifyUrl(rawToken) {
  return `${getClientUrl()}/verify-email/${rawToken}`;
}

/**
 * Generate a fresh token, overwrite any previous one, persist, and email it.
 * The overwrite invalidates every earlier link — a user document holds
 * exactly one token hash.
 *
 * Returns { previewUrl, delivered, expiryHours }.
 */
async function issueVerificationToken(user, { deferEmail = false } = {}) {
  const rawToken = generateRawToken();

  user.verificationToken = hashToken(rawToken);
  user.verificationTokenExpiry = new Date(Date.now() + EXPIRY_MS);
  user.lastVerificationEmailSentAt = new Date();

  await user.save();

  const { subject, text, html } = verificationEmail({
    fullName: user.fullName,
    verifyUrl: buildVerifyUrl(rawToken),
    expiryHours: EXPIRY_HOURS,
  });

  // Registration should not wait for the SMTP round-trip. The token is
  // already persisted above, so the account can safely be acknowledged while
  // the verification email is sent in the background. Resend still awaits
  // delivery because that endpoint is specifically about sending the email.
  if (deferEmail) {
    setImmediate(() => {
      sendMail({
        to: user.email,
        subject,
        text,
        html,
      }).catch((error) => {
        console.error("Background verification email failed:", error.message);
      });
    });

    return { delivered: false, previewUrl: null, expiryHours: EXPIRY_HOURS };
  }

  const { delivered, previewUrl } = await sendMail({
    to: user.email,
    subject,
    text,
    html,
  });

  return { delivered, previewUrl, expiryHours: EXPIRY_HOURS };
}

/**
 * Look up the user holding this raw token. Does NOT filter on expiry so the
 * client can distinguish "expired — resend?" from "bogus link".
 * The select() is required: verification fields are select:false on the schema.
 */
async function findUserByRawToken(rawToken) {
  return User.findOne({ verificationToken: hashToken(rawToken) }).select(
    "+verificationToken +verificationTokenExpiry +lastVerificationEmailSentAt"
  );
}

function isTokenExpired(user) {
  if (!user.verificationTokenExpiry) return true;
  return user.verificationTokenExpiry.getTime() < Date.now();
}

/** Clear token fields and flip the account to verified. */
async function markVerified(user) {
  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpiry = null;
  await user.save();
}

/** Remaining cooldown in seconds, or 0 if a resend is allowed right now. */
function getResendCooldownRemaining(user) {
  if (!user.lastVerificationEmailSentAt) return 0;

  const elapsed = Date.now() - user.lastVerificationEmailSentAt.getTime();
  if (elapsed >= RESEND_COOLDOWN_MS) return 0;

  return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
}

/** Fire-and-forget confirmation after successful verification. */
async function sendWelcomeEmail(user) {
  const { subject, text, html } = welcomeEmail({
    fullName: user.fullName,
    loginUrl: `${getClientUrl()}/login`,
  });

  return sendMail({ to: user.email, subject, text, html });
}

module.exports = {
  issueVerificationToken,
  findUserByRawToken,
  isTokenExpired,
  markVerified,
  getResendCooldownRemaining,
  sendWelcomeEmail,
  EXPIRY_HOURS,
};
