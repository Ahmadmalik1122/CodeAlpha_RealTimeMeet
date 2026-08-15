const Feedback = require("../models/Feedback");
const User = require("../models/User");
const { sendMail } = require("../config/mailer");
const { feedbackNotificationEmail } = require("../services/emailTemplates");

const VALID_CATEGORIES = ["general", "bug", "feature", "other"];

// POST /api/feedback
// Body: { rating: 1-5, category?: "general"|"bug"|"feature"|"other", message: string }
// req.user.id (from the JWT via `protect`) is the only source of the owning
// user — a client can never submit feedback attributed to someone else.
const submitFeedback = async (req, res) => {
  try {
    const { rating, category, message } = req.body;

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number between 1 and 5.",
      });
    }

    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: "Please add a short message with your feedback.",
      });
    }
    if (trimmedMessage.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Feedback message must be 1000 characters or fewer.",
      });
    }

    const resolvedCategory = VALID_CATEGORIES.includes(category) ? category : "general";

    const feedback = await Feedback.create({
      user: req.user.id,
      rating: numericRating,
      category: resolvedCategory,
      message: trimmedMessage,
    });

    // Best-effort: the feedback is already saved, so a mail outage must not
    // fail the submission. sendMail() resolves rather than rejects on failure.
    try {
      const submitter = await User.findById(req.user.id).select("fullName email");

      await sendMail({
        to: process.env.SMTP_USER,
        ...feedbackNotificationEmail({
          fullName: submitter?.fullName,
          email: submitter?.email,
          rating: numericRating,
          category: resolvedCategory,
          message: trimmedMessage,
          submittedAt: feedback.createdAt.toLocaleString(),
        }),
      });
    } catch (mailError) {
      console.error("❌ Failed to send feedback notification email:", mailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Thanks — your feedback has been submitted.",
      feedback,
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

// GET /api/feedback/mine
// Returns this user's own past submissions, most recent first. Scoped to
// req.user.id the same way every other account-scoped read in this app is
// (see preferencesController.js) — never a client-supplied user id.
const getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      feedback,
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
  submitFeedback,
  getMyFeedback,
};
