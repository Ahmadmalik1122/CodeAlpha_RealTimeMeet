const User = require("../models/User");
const {
  issueResetToken,
  findUserByRawResetToken,
  isResetTokenExpired,
  applyNewPassword,
  getResetCooldownRemaining,
  sendPasswordChangedEmail,
  MIN_PASSWORD_LENGTH,
} = require("../services/passwordResetService");

/**
 * Password reset endpoints.
 *
 * Kept in their own controller, alongside verificationController, so the
 * existing login/register/google code is untouched.
 *
 * Every failure response carries a machine-readable `reason` next to the
 * human `message`. The client branches on `reason` — an expired link gets a
 * "request a new one" affordance, a bogus one doesn't — and matching on
 * message strings would break the moment the copy changes.
 */

// POST /api/auth/forgot-password   { email }
const forgotPassword = async (req, res) => {
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

    // Cheap format guard so an obvious typo gets a useful answer instead of
    // the generic "check your inbox" for mail that will never arrive.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        reason: "INVALID_EMAIL",
        message: "Enter a valid email address.",
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+resetPasswordToken +resetPasswordExpiry +lastPasswordResetEmailSentAt"
    );

    // Generic success for unknown addresses. Returning "no such user" would
    // turn this open endpoint into an account-enumeration oracle, letting
    // anyone test whether an address is registered.
    const genericResponse = {
      success: true,
      message:
        "If an account exists for that email, a password reset link is on its way.",
    };

    if (!user) return res.status(200).json(genericResponse);

    // Google accounts have no local password to reset. Masked for the same
    // anti-enumeration reason — telling the caller "that's a Google account"
    // leaks both that the address is registered and how it signs in.
    if (user.authProvider === "google" || !user.password) {
      return res.status(200).json(genericResponse);
    }

    // Throttle. The 429 is intentionally NOT masked: the requester already
    // triggered a send for this address, and silently no-op'ing would make
    // the button look broken.
    const cooldown = getResetCooldownRemaining(user);
    if (cooldown > 0) {
      return res.status(429).json({
        success: false,
        reason: "COOLDOWN",
        retryAfter: cooldown,
        message: `Please wait ${cooldown}s before requesting another email.`,
      });
    }

    // Overwrites the stored hash, invalidating every earlier reset link.
    const { previewUrl } = await issueResetToken(user);

    return res.status(200).json({
      ...genericResponse,
      // Only ever present when running against the Ethereal dev inbox.
      ...(previewUrl ? { previewUrl } : {}),
    });
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(500).json({
      success: false,
      reason: "SERVER_ERROR",
      message: "Server Error",
    });
  }
};

// GET /api/auth/reset-password/:token
//
// Lets the reset page check the link before rendering the form, so an expired
// token shows a clear "request a new link" screen rather than letting the
// user type a new password twice and only then be told it was never going to
// work. Read-only — it does not consume the token.
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        reason: "MISSING_TOKEN",
        message: "Reset token is missing.",
      });
    }

    const user = await findUserByRawResetToken(token);

    // No hash match: the link is fake, or already used (the token is cleared
    // on a successful reset). The two are indistinguishable by design.
    if (!user) {
      return res.status(400).json({
        success: false,
        reason: "INVALID_TOKEN",
        message:
          "This password reset link is invalid or has already been used. Request a new one.",
      });
    }

    if (isResetTokenExpired(user)) {
      return res.status(400).json({
        success: false,
        reason: "TOKEN_EXPIRED",
        // Safe to echo: whoever holds this link already knows the address.
        // Lets the forgot-password form prefill without retyping.
        email: user.email,
        message: "This password reset link has expired. Request a new one below.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token is valid.",
    });
  } catch (error) {
    console.error("verifyResetToken error:", error);
    return res.status(500).json({
      success: false,
      reason: "SERVER_ERROR",
      message: "Server Error",
    });
  }
};

// POST /api/auth/reset-password/:token   { password, confirmPassword }
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        reason: "MISSING_TOKEN",
        message: "Reset token is missing.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        reason: "MISSING_PASSWORD",
        message: "Password is required.",
      });
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        reason: "PASSWORD_TOO_SHORT",
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    // Only enforced when the client actually sent the field. The client
    // validates this too; re-checking here keeps a direct API caller from
    // setting a password the user never confirmed.
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        reason: "PASSWORD_MISMATCH",
        message: "Passwords do not match.",
      });
    }

    const user = await findUserByRawResetToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        reason: "INVALID_TOKEN",
        message:
          "This password reset link is invalid or has already been used. Request a new one.",
      });
    }

    // Expiry is re-checked here, not just in verifyResetToken: a token can
    // lapse between the page loading and the form being submitted, and the
    // GET is only a courtesy — this is the check that actually guards.
    if (isResetTokenExpired(user)) {
      return res.status(400).json({
        success: false,
        reason: "TOKEN_EXPIRED",
        email: user.email,
        message: "This password reset link has expired. Request a new one.",
      });
    }

    // Burns the token and writes the hash in one save.
    await applyNewPassword(user, String(password));

    // Security receipt — never let a mail failure fail the reset itself. The
    // password is already changed at this point; throwing here would tell the
    // user it failed and send them round the loop again for nothing.
    sendPasswordChangedEmail(user).catch((err) =>
      console.error("Password-changed email failed:", err.message)
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({
      success: false,
      reason: "SERVER_ERROR",
      message: "Server Error",
    });
  }
};

module.exports = { forgotPassword, verifyResetToken, resetPassword };
