import { Star, MessageCircle, AlertCircle, Loader2, Send, Clock } from "lucide-react";
import SelectField from "../ui/SelectField";

const CATEGORY_OPTIONS = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
];

const RATING_LABELS = {
  0: "Tap a star to rate",
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

function StarPicker({ rating, hoverRating, onHover, onPick }) {
  const active = hoverRating || rating;

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => onHover(0)}
        role="radiogroup"
        aria-label="Rate your experience"
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            onMouseEnter={() => onHover(value)}
            onClick={() => onPick(value)}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors focus-ring"
          >
            <Star
              size={22}
              className={
                value <= active
                  ? "fill-amber-400 text-amber-400 transition-colors"
                  : "text-slate-600 transition-colors"
              }
            />
          </button>
        ))}
      </div>
      <span className="text-slate-400 text-xs">{RATING_LABELS[active]}</span>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * FeedbackCard
 * Lets a person rate their experience and send a short message straight to
 * the team (server/controllers/feedbackController.js -> Feedback collection
 * in MongoDB — a real write, not a mailto: or a no-op). Below the form, it
 * lists their own past submissions so a sent piece of feedback doesn't just
 * vanish into a form's void.
 *
 * All state and the actual API calls live in Activity.jsx, exactly like
 * StatisticsCard/ProfileCard elsewhere in the app — this component stays
 * purely presentational.
 */
function FeedbackCard({
  rating,
  hoverRating,
  category,
  message,
  submitting,
  error,
  success,
  history,
  historyLoading,
  onHoverRating,
  onPickRating,
  onCategoryChange,
  onMessageChange,
  onSubmit,
}) {
  return (
    <div className="glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl mt-6">
      <div className="flex items-center gap-2 mb-1.5">
        <MessageCircle size={20} className="text-indigo-400" />
        <h2 className="text-xl font-display font-bold text-white">Feedback</h2>
      </div>
      <p className="text-slate-400 text-sm mb-7">
        Tell us how RealTimeMeet is working for you — it goes straight to the team.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
          <Send size={16} className="shrink-0 mt-0.5 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <span className="block text-xs font-medium text-slate-400 mb-2">
            How's your experience been?
          </span>
          <StarPicker
            rating={rating}
            hoverRating={hoverRating}
            onHover={onHoverRating}
            onPick={onPickRating}
          />
        </div>

        <SelectField
          label="Category"
          value={category}
          onChange={onCategoryChange}
          options={CATEGORY_OPTIONS}
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="feedback-message" className="block text-xs font-medium text-slate-400">
              Message
            </label>
            <span className="text-xs text-slate-500">{message.length}/1000</span>
          </div>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(e) => onMessageChange(e.target.value.slice(0, 1000))}
            placeholder="What's working well? What isn't? Anything you'd like to see next…"
            rows={4}
            required
            className="input-field rounded-xl px-4 py-3 text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || rating === 0 || !message.trim()}
          className="btn-primary w-full py-3 rounded-xl text-sm"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send size={16} />
              Send feedback
            </>
          )}
        </button>
      </form>

      {(historyLoading || history.length > 0) && (
        <>
          <div className="h-px bg-white/10 my-7" />
          <p className="text-slate-500 text-xs mb-3">Your past submissions</p>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <ul className="space-y-2.5">
              {history.map((item) => (
                <li
                  key={item._id}
                  className="rounded-2xl bg-white/[0.03] p-4 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                          key={value}
                          size={13}
                          className={
                            value <= item.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-700"
                          }
                        />
                      ))}
                    </div>
                    <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                      <Clock size={11} />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm leading-snug break-words">
                    {item.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default FeedbackCard;
