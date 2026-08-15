const mongoose = require("mongoose");

// One row per participant who was ever in a given meeting session. Kept as
// a lightweight sub-document (not a User ref-only array) so guests without
// an account are still represented, and so the display name is preserved
// even if the user later renames their account.
const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: {
      type: String,
      default: "Guest",
    },
  },
  { _id: false }
);

// A "session" = the span from the first person joining the live call to the
// last person leaving it. Reusing the same meetingId later (host starts the
// same room again) creates a new history row rather than mutating this one,
// mirroring how a fresh meeting/session actually starts.
const meetingHistorySchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      default: "Untitled Meeting",
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    participants: {
      type: [participantSchema],
      default: [],
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      default: null,
    },

    // Duration in seconds, computed once the session ends.
    duration: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["ongoing", "completed"],
      default: "ongoing",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MeetingHistory", meetingHistorySchema);
