const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getPreferences,
  updatePreferences,
  getStatistics,
} = require("../controllers/preferencesController");

// All three are account-scoped and read req.user.id off the JWT set by
// `protect` — never a client-supplied user id — so one user can never read
// or write another user's preferences/statistics.
router.get("/preferences", protect, getPreferences);
router.put("/preferences", protect, updatePreferences);
router.get("/statistics", protect, getStatistics);

module.exports = router;
