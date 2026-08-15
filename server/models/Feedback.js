const mongoose = require("mongoose");

// One row per feedback submission. Kept intentionally simple — a star
// rating, an optional category, and a message — mirroring the rest of the
// app's "only persist what's actually collected" approach (see
// preferencesController.js's getStatistics comments for the same
// philosophy applied to usage stats).
const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    category: {
      type: String,
      enum: ["general", "bug", "feature", "other"],
      default: "general",
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
