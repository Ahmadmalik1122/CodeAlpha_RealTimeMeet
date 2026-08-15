const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const { submitFeedback, getMyFeedback } = require("../controllers/feedbackController");

// Both scoped to the authenticated user via req.user.id set by `protect` —
// same discipline as routes/userRoutes.js.
router.post("/", protect, submitFeedback);
router.get("/mine", protect, getMyFeedback);

module.exports = router;
