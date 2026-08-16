const { getAuth } = require("firebase-admin/auth");
require("../config/firebaseAdmin");

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { issueVerificationToken } = require("../services/verificationService");
const {
  sendPasswordChangedEmail,
  MIN_PASSWORD_LENGTH,
} = require("../services/passwordResetService");
const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      // Explicit for readability; the schema default is false too.
      isVerified: false,
    });

    // Generate + persist the token and send the email. Wrapped because a mail
    // outage must not fail the registration — the account exists, and the
    // user can recover with "resend verification".
    let previewUrl = null;
    try {
      ({ previewUrl } = await issueVerificationToken(user, { deferEmail: true }));
    } catch (mailError) {
      console.error("Verification email failed at registration:", mailError.message);
    }

    // No JWT returned — the client routes to "check your inbox" instead of
    // auto-logging in, so unverified accounts can't skip the verification check.
    res.status(201).json({
      success: true,
      requiresVerification: true,
      message:
        "Registration successful. Check your email for a verification link to activate your account.",
      email: user.email,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isVerified: user.isVerified,
      },
      // Only ever present when running against the Ethereal dev inbox.
      ...(previewUrl ? { previewUrl } : {}),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Google-created accounts have password: null. bcrypt.compare(x, null)
    // throws, which surfaced as a 500 — treat it as a normal auth failure.
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google Sign-In. Continue with Google instead.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    // Verification gate is placed AFTER the password check to avoid confirming
    // account existence on a wrong password. Strict === false (not !user.isVerified)
    // so legacy rows with isVerified: undefined are treated as verified — run
    // scripts/backfillVerified.js to make that explicit.
    if (user.isVerified === false) {
      return res.status(403).json({
        success: false,
        reason: "EMAIL_NOT_VERIFIED",
        needsVerification: true,
        email: user.email,
        message: "Please verify your email before logging in.",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
// Email is never accepted here — it's read-only and tied to the verification flow.
const PHONE_REGEX = /^[+\d][\d\s\-()]{5,19}$/;

const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, bio, profilePic } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (fullName !== undefined) {
      const trimmedName = fullName.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Full name cannot be empty",
        });
      }

      if (trimmedName.length > 80) {
        return res.status(400).json({
          success: false,
          message: "Full name must be 80 characters or fewer",
        });
      }

      user.fullName = trimmedName;
    }

    if (phone !== undefined) {
      const trimmedPhone = phone.trim();

      if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid phone number",
        });
      }

      user.phone = trimmedPhone;
    }

    if (bio !== undefined) {
      if (bio.length > 300) {
        return res.status(400).json({
          success: false,
          message: "Bio must be 300 characters or fewer",
        });
      }

      user.bio = bio;
    }

    // Picture itself is uploaded separately through the existing
    // /api/upload endpoint (disk storage under server/uploads — no new
    // storage provider). This just persists the URL it returned.
    if (profilePic !== undefined) {
      user.profilePic = profilePic;
    }

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// PUT /api/auth/change-password   { currentPassword, newPassword, confirmNewPassword }
// Requires the current password (signed-in user). Google accounts can't use this.
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        reason: "MISSING_FIELDS",
        message: "Current password, new password, and confirmation are all required.",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        reason: "PASSWORD_MISMATCH",
        message: "New password and confirmation do not match.",
      });
    }

    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        reason: "PASSWORD_TOO_SHORT",
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        reason: "PASSWORD_UNCHANGED",
        message: "New password must be different from your current password.",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Google-authenticated users have no local password to verify against —
    // bcrypt.compare(x, null) would throw. Tell them plainly instead of
    // surfacing a generic server error.
    if (user.authProvider === "google" || !user.password) {
      return res.status(400).json({
        success: false,
        reason: "GOOGLE_ACCOUNT",
        message:
          "This account signs in with Google and has no local password to change.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        reason: "INCORRECT_PASSWORD",
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Fire-and-forget security receipt — never let a mail hiccup fail a
    // change that already succeeded.
    sendPasswordChangedEmail(user).catch((err) =>
      console.error("Password-changed email failed:", err.message)
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

   const decoded = await getAuth().verifyIdToken(idToken);

    const {
      uid,
      email,
      name,
      picture,
    } = decoded;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullName: name,
        email,
        password: null,
        profilePic: picture,
        googleId: uid,
        authProvider: "google",
        // Google has already proven the user controls this address, so there
        // is nothing for us to verify — send them straight through.
        isVerified: true,
      });
    } else if (user.isVerified !== true) {
      // Covers two cases:
      //  1. Someone registered locally, never clicked the link, then signed in
      //     with Google on the same address — Google's proof supersedes our
      //     pending link, so verify them and drop the dangling token.
      //  2. A legacy row from before this feature (isVerified undefined).
      user.isVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpiry = null;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        authProvider: user.authProvider,
        isVerified: user.isVerified,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(401).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};
module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  googleLogin,
};
