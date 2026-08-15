const mongoose = require("mongoose");
const User = require("../models/User");
const MeetingHistory = require("../models/MeetingHistory");

// GET /api/users/preferences
// Returns the three Part 2B preference groups for the authenticated user.
// Sensitive/auth-only fields are never selected here (same "-password"
// discipline as authController.getProfile).
const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "meetingPreferences appearanceSettings notificationSettings"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      meetingPreferences: user.meetingPreferences,
      appearanceSettings: user.appearanceSettings,
      notificationSettings: user.notificationSettings,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Whitelisted keys per group — merged onto the existing sub-document rather
// than replaced wholesale, so a client that only sends one changed field
// (e.g. just `theme`) never wipes out the rest of the group.
const MEETING_PREF_KEYS = [
  "cameraId",
  "microphoneId",
  "speakerId",
  "joinWithCamera",
  "joinWithMicrophone",
  "layout",
];
const APPEARANCE_KEYS = ["theme", "accentColor", "fontSize", "language"];
const NOTIFICATION_KEYS = [
  "meetingReminders",
  "chatNotifications",
  "reactionNotifications",
  "emailNotifications",
  "desktopNotifications",
  "joinLeaveNotifications",
];

const pickKeys = (source, keys) => {
  const out = {};
  if (!source || typeof source !== "object") return out;
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
};

// PUT /api/users/preferences
// Body: { meetingPreferences?, appearanceSettings?, notificationSettings? }
// Any subset of the three groups may be sent; only recognized keys within
// each group are accepted, and validation is delegated to the schema's own
// enums (an invalid `theme`/`layout` value fails Mongoose validation rather
// than being silently accepted).
const updatePreferences = async (req, res) => {
  try {
    const { meetingPreferences, appearanceSettings, notificationSettings } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (meetingPreferences !== undefined) {
      Object.assign(
        user.meetingPreferences,
        pickKeys(meetingPreferences, MEETING_PREF_KEYS)
      );
    }

    if (appearanceSettings !== undefined) {
      Object.assign(
        user.appearanceSettings,
        pickKeys(appearanceSettings, APPEARANCE_KEYS)
      );
    }

    if (notificationSettings !== undefined) {
      Object.assign(
        user.notificationSettings,
        pickKeys(notificationSettings, NOTIFICATION_KEYS)
      );
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      meetingPreferences: user.meetingPreferences,
      appearanceSettings: user.appearanceSettings,
      notificationSettings: user.notificationSettings,
    });
  } catch (error) {
    console.error(error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// GET /api/users/statistics
// Four stats are computable from MeetingHistory. The remaining four
// (screen shares, whiteboard sessions, recordings, chat messages) have no
// persistence — they're live Socket.IO events or client-only. Those are
// returned in the `unavailable` block so the UI can explain the gap
// rather than show a fabricated zero.
const getStatistics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const scope = {
      $or: [{ host: userId }, { "participants.userId": userId }],
    };

    const [agg] = await MeetingHistory.aggregate([
      { $match: scope },
      {
        $group: {
          _id: null,
          meetingsJoined: { $sum: 1 },
          meetingsHosted: {
            $sum: { $cond: [{ $eq: ["$host", userId] }, 1, 0] },
          },
          totalDurationSeconds: { $sum: "$duration" },
        },
      },
    ]);

    // Distinct *other* registered users met across every session this user
    // was part of. $unwind + $group on participants.userId is preferred
    // over pulling every document into memory (see spec: "prefer
    // aggregation queries over loading all documents into memory").
    const [metAgg] = await MeetingHistory.aggregate([
      { $match: scope },
      { $unwind: "$participants" },
      {
        $match: {
          "participants.userId": { $ne: null, $ne: userId },
        },
      },
      { $group: { _id: "$participants.userId" } },
      { $count: "distinctParticipants" },
    ]);

    const totalDurationSeconds = agg?.totalDurationSeconds || 0;

    const statistics = {
      meetingsHosted: agg?.meetingsHosted || 0,
      meetingsJoined: agg?.meetingsJoined || 0,
      totalMeetingHours: Math.round((totalDurationSeconds / 3600) * 10) / 10,
      totalParticipantsMet: metAgg?.distinctParticipants || 0,
    };

    res.status(200).json({
      success: true,
      statistics,
      // Explicitly surfaced (not silently omitted) so the Statistics card
      // can tell the person why these four are missing instead of showing
      // a fabricated 0 that looks like a real answer.
      unavailable: {
        screenSharesCount:
          "Not tracked: screen-share toggles are a live Socket.IO event only, never persisted to MongoDB.",
        whiteboardsUsedCount:
          "Not tracked: whiteboard strokes live in an in-memory server Map for the life of the room and are never saved.",
        recordingsCreatedCount:
          "Not tracked: recording happens entirely client-side (canvas capture downloaded as .webm) and the server is never notified.",
        chatMessagesSentCount:
          "Not tracked: chat messages are relayed over Socket.IO between participants and are never written to a database collection.",
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

module.exports = {
  getPreferences,
  updatePreferences,
  getStatistics,
};
