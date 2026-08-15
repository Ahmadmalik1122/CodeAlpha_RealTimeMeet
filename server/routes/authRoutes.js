const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  googleLogin, 
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const {
  verifyEmail,
  resendVerification,
} = require("../controllers/verificationController");

const {
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require("../controllers/passwordResetController");

router.post("/register", register);
router.post("/login", login);
router.post("/google-login", googleLogin);

// ---- Email verification (public: the user has no JWT yet) ----
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerification);

// ---- Password reset (public: the user can't sign in, that's the point) ----
// GET checks a link without consuming it, so the reset page can show an
// "expired" state before the user fills in the form. POST performs the reset.
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", verifyResetToken);
router.post("/reset-password/:token", resetPassword);

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;