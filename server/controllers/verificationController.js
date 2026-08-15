const User = require("../models/User");
const {
  issueVerificationToken,
  findUserByRawToken,
  isTokenExpired,
  markVerified,
  getResendCooldownRemaining,
  sendWelcomeEmail,
} = require("../services/verificationService");

/**
 * Verification endpoints.
 *
 * Kept in their own controller rather than bolted onto authController so the
 * existing login/register/google code stays as it was.
 *
 * Every failure response carries a machine-readable `reason` alongside the
 * human `message`. The client branches on `reason` — an expired link gets a
 * resend form, a bogus one doesn't — and matching on message strings would be
 * brittle the moment the copy changes.
 */

// GET /api/auth/verify-email/:token
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        reason: "MISSING_TOKEN",
        message: "Verification token is missing.",
      });
    }

    const user = await findUserByRawToken(token);

    // No hash match. Either the link is fake, or — much more likely — it's an
    // already-used link whose token was cleared on the first click. We can't
    // distinguish the two (the token is gone either way), so we report it as
    // already-verified-or-invalid and let the client offer "go to login".
    // This is also what makes double-clicking the email link harmless.
    if (!user) {
      return res.status(400).json({
        success: false,
        reason: "INVALID_TOKEN",
        message:
          "This verification link is invalid or has already been used. Try signing in — your account may already be verified.",
      });
    }

    // Token matched a user who is somehow already verified: treat as success
    // so a double click reads as "you're done", not as an error.
    if (user.isVerified) {
      await markVerified(user); // clears any lingering token fields
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: "Your email is already verified. You can sign in.",
      });
    }

    if (isTokenExpired(user)) {
      return res.status(400).json({
        success: false,
        reason: "TOKEN_EXPIRED",
        // Echoed back so the resend form can prefill without the user
        // retyping. Safe: whoever holds this link already knows the address.
        email: user.email,
        message: "This verification link has expired. Request a new one below.",
      });
    }

    await markVerified(user);

    // Confirmation mail is a nicety — never let it fail the request.
    sendWelcomeEmail(user).catch((err) =>
      console.error("Welcome email failed:", err.message)
    );

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("verifyEmail error:", error);
    return res.status(500).json({
      success: false,
      reason: "SERVER_ERROR",
      message: "Server Error",
    });
  }
};

// POST /api/auth/resend-verification   { email }
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        reason: "MISSING_EMAIL",
        message: "Email is required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+verificationToken +verificationTokenExpiry +lastVerificationEmailSentAt"
    );

    // Generic success for unknown addresses. Returning "no such user" here
    // would turn this open endpoint into an account-enumeration oracle,
    // letting anyone test whether an address is registered.
    const genericResponse = {
      success: true,
      message:
        "If an unverified account exists for that email, a new verification link is on its way.",
    };

    if (!user) return res.status(200).json(genericResponse);

    // Same reasoning for already-verified and Google accounts: don't leak
    // account state. Google users have no verification flow at all.
    if (user.isVerified || user.authProvider === "google") {
      return res.status(200).json(genericResponse);
    }

    // Throttle. 429 is intentionally NOT masked — the requester has already
    // proven this address is theirs by triggering a send, and a silent
    // no-op would look like the resend button is broken.
    const cooldown = getResendCooldownRemaining(user);
    if (cooldown > 0) {
      return res.status(429).json({
        success: false,
        reason: "COOLDOWN",
        retryAfter: cooldown,
        message: `Please wait ${cooldown}s before requesting another email.`,
      });
    }

    // Overwrites the stored hash, which invalidates every earlier link.
    const { previewUrl } = await issueVerificationToken(user);

    return res.status(200).json({
      ...genericResponse,
      ...(previewUrl ? { previewUrl } : {}),
    });
  } catch (error) {
    console.error("resendVerification error:", error);
    return res.status(500).json({
      success: false,
      reason: "SERVER_ERROR",
      message: "Server Error",
    });
  }
};

module.exports = { verifyEmail, resendVerification };
