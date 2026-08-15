const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      required: true,
      unique: true,
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

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    // Host-only security controls (see server/socket/socket.js for the
    // Socket.IO handlers that read/write these in real time). Kept as a
    // sub-document so the whole thing can be sent to clients in one shot
    // via meetingSecurityPublicView, minus the passcode hash.
    security: {
      isLocked: {
        type: Boolean,
        default: false,
      },
      // bcrypt hash of the current passcode, or null when no passcode is
      // set. Never sent to clients - only `requiresPasscode` (derived from
      // whether this is set) is exposed.
      passcodeHash: {
        type: String,
        default: null,
      },
      chatDisabled: {
        type: Boolean,
        default: false,
      },
      screenShareDisabled: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Meeting", meetingSchema);