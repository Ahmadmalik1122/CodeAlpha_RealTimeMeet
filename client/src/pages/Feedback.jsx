import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import API from "../services/api";
import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";
import FeedbackCard from "../components/settings/FeedbackCard";

/**
 * Feedback
 * Dedicated home for sending feedback, split out from Activity.jsx so
 * Activity is statistics-only. Reuses the existing FeedbackCard component
 * and the existing /feedback + /feedback/mine endpoints
 * (server/controllers/feedbackController.js — untouched) exactly as
 * Activity.jsx previously did; nothing about the form, the validation, or
 * the API was rewritten, only relocated onto its own route.
 */
function Feedback() {
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [feedbackHistoryLoading, setFeedbackHistoryLoading] = useState(true);

  // Loads this user's own past feedback submissions, same per-mount pattern
  // used throughout the app (see Activity.jsx's statistics fetch).
  useEffect(() => {
    let cancelled = false;

    const loadFeedbackHistory = async () => {
      try {
        setFeedbackHistoryLoading(true);
        const { data } = await API.get("/feedback/mine");
        if (cancelled) return;
        setFeedbackHistory(data.feedback || []);
      } catch {
        // Non-critical — the form itself still works without history, so
        // this fails silently rather than surfacing a second error banner.
      } finally {
        if (!cancelled) setFeedbackHistoryLoading(false);
      }
    };

    loadFeedbackHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackError("");
    setFeedbackSuccess("");

    if (rating === 0) {
      setFeedbackError("Please choose a star rating.");
      return;
    }
    if (!message.trim()) {
      setFeedbackError("Please add a short message with your feedback.");
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const { data } = await API.post("/feedback", { rating, category, message });
      setFeedbackSuccess(data.message || "Thanks — your feedback has been submitted.");
      setFeedbackHistory((prev) => [data.feedback, ...prev]);
      setRating(0);
      setHoverRating(0);
      setCategory("general");
      setMessage("");
    } catch (err) {
      setFeedbackError(
        err.response?.data?.message || "Couldn't submit your feedback. Please try again."
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative w-full max-w-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <BrandMark size="sm" />
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors focus-ring"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
        </div>

        <div className="mb-1 animate-slide-up">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Feedback
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Tell us what's working and what isn't.
          </p>
        </div>

        <FeedbackCard
          rating={rating}
          hoverRating={hoverRating}
          category={category}
          message={message}
          submitting={feedbackSubmitting}
          error={feedbackError}
          success={feedbackSuccess}
          history={feedbackHistory}
          historyLoading={feedbackHistoryLoading}
          onHoverRating={setHoverRating}
          onPickRating={setRating}
          onCategoryChange={setCategory}
          onMessageChange={setMessage}
          onSubmit={handleFeedbackSubmit}
        />
      </div>
    </div>
  );
}

export default Feedback;
