const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createMeeting,
  joinMeeting,
  getMeetingHistory,
  clearMeetingHistory,
} = require("../controllers/meetingController");

router.post("/create", protect, createMeeting);

router.post("/join", protect, joinMeeting);

router.get("/history", protect, getMeetingHistory);

router.delete("/history", protect, clearMeetingHistory);

module.exports = router;