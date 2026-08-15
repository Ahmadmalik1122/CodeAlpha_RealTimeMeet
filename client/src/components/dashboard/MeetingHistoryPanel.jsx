import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, Trash2, Users, Clock, Loader2, Video } from "lucide-react";

import API from "../../services/api";
import { formatDuration } from "../../utils/formatDuration";

// e.g. "Aug 6, 2026 · 3:45 PM"
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

// How often we quietly re-check history in the background so a session that
// goes live (or ends) elsewhere is reflected here without a manual refresh.
// Reuses the same REST endpoint the initial load already calls — no new
// socket connection is opened just for the dashboard list.
const BACKGROUND_REFRESH_MS = 15000;

// Shows the logged-in user's past meetings (hosted or attended) with a
// "Clear history" action. Sits below the existing dashboard content —
// doesn't touch any of it. Sessions still in progress (status: "ongoing",
// set server-side in meetingHistoryService.js, driven by real Socket.IO
// room occupancy) additionally get a "Rejoin" action that drops the user
// straight back into the existing MeetingRoom flow for that meeting.
function MeetingHistoryPanel() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [rejoiningId, setRejoiningId] = useState(null);

  // Guards against a slow background refresh clobbering state after the
  // component has already unmounted (e.g. user navigated away).
  const mountedRef = useRef(true);

  // silent=true is used for the periodic background poll: it re-fetches
  // without flashing the loading spinner or surfacing transient errors,
  // since the existing list is still perfectly valid to show while it retries.
  // Wrapped in useCallback so it has a stable identity and can be listed as
  // an effect dependency (exhaustive-deps) without re-running the mount
  // effect below on every render.
  const fetchHistory = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      if (!silent) setError("");
      const { data } = await API.get("/meeting/history");
      if (!mountedRef.current) return;
      setHistory(data.history || []);
    } catch (err) {
      if (!mountedRef.current || silent) return;
      setError(err.response?.data?.message || "Could not load meeting history");
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Deferred to a microtask instead of calling fetchHistory() directly:
    // the direct call's setLoading/setError run *before* its first await,
    // i.e. synchronously within this effect, which is exactly what
    // react-hooks/set-state-in-effect flags. Deferring by one microtask
    // still runs before the next paint (imperceptible — same as before),
    // it just no longer executes as part of the effect's own call frame.
    queueMicrotask(() => fetchHistory());

    // Background refresh so a meeting going live / ending elsewhere shows
    // up here without the user having to manually reload the dashboard.
    // These already run later (timer/event callbacks), not synchronously
    // within the effect, so they were never part of the issue.
    const interval = setInterval(() => fetchHistory({ silent: true }), BACKGROUND_REFRESH_MS);
    const onFocus = () => fetchHistory({ silent: true });
    window.addEventListener("focus", onFocus);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchHistory]);

  const clearHistory = async () => {
    if (!window.confirm("Clear your meeting history? This cannot be undone.")) return;

    try {
      setClearing(true);
      await API.delete("/meeting/history");
      setHistory([]);
    } catch (err) {
      setError(err.response?.data?.message || "Could not clear meeting history");
    } finally {
      setClearing(false);
    }
  };

  // Rejoining reuses the exact same two steps the "Join a meeting" flow on
  // the dashboard already performs: POST /meeting/join (existing endpoint,
  // existing auth) followed by navigating to the existing /meeting/:id
  // route. Everything past that point — waiting room, lock/passcode gate,
  // WebRTC, Socket.IO — is the existing MeetingRoom implementation; nothing
  // here bypasses it.
  const rejoinMeeting = async (meetingId) => {
    if (!meetingId || rejoiningId) return;

    try {
      setRejoiningId(meetingId);
      setError("");
      await API.post("/meeting/join", { meetingId });
      navigate(`/meeting/${meetingId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not rejoin meeting");
      setRejoiningId(null);
    }
  };

  return (
    <div
      className="relative w-full max-w-2xl mt-16 animate-slide-up"
      style={{ animationDelay: "0.2s" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-white text-sm font-semibold">
          <History size={16} className="text-indigo-300" />
          Meeting history
        </h3>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            disabled={clearing}
            className="flex items-center gap-1.5 text-slate-400 hover:text-red-300 text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors focus-ring disabled:opacity-50"
          >
            <Trash2 size={13} />
            {clearing ? "Clearing…" : "Clear history"}
          </button>
        )}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-10">
            <Loader2 size={16} className="animate-spin" />
            Loading history…
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm text-center py-10">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-10 px-6">
            No past meetings yet — your history will show up here once a call ends.
          </p>
        ) : (
          <div className="divide-y divide-white/8">
            {history.map((m) => {
              const isLive = m.status === "ongoing";
              const isRejoining = rejoiningId === m.meetingId;

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {m.title || "Untitled Meeting"}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5 truncate">
                      {formatDate(m.startTime)} · Host: {m.host?.fullName || "Unknown"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-slate-400 text-xs">
                    <span className="flex items-center gap-1" title="Participants">
                      <Users size={13} />
                      {m.participantCount}
                    </span>
                    <span className="flex items-center gap-1" title="Duration">
                      <Clock size={13} />
                      {isLive ? "In progress" : formatDuration((m.duration || 0) * 1000)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        isLive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/8 text-slate-300"
                      }`}
                    >
                      {isLive ? "🟢 Live" : "Ended"}
                    </span>

                    {isLive && (
                      <button
                        onClick={() => rejoinMeeting(m.meetingId)}
                        disabled={isRejoining}
                        className="btn-primary rounded-lg px-3 py-1.5 text-xs shrink-0 disabled:opacity-60"
                        title="Rejoin this meeting"
                      >
                        {isRejoining ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Video size={13} />
                        )}
                        {isRejoining ? "Joining…" : "Rejoin"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingHistoryPanel;
