import { useState } from "react";
import { Plus, LogOut, Keyboard, ArrowRight, Users, ScreenShare, MessageSquare, Settings as SettingsIcon, BarChart3, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import useToast from "../hooks/useToast";
import useAuth from "../hooks/useAuth";
import Avatar from "../components/ui/Avatar";
import BrandMark from "../components/ui/BrandMark";
import MeetingHistoryPanel from "../components/dashboard/MeetingHistoryPanel";

const FEATURES = [
  { icon: Users, label: "Meet with anyone", detail: "Share a link, no downloads needed" },
  { icon: ScreenShare, label: "Present your screen", detail: "One click, HD quality" },
  { icon: MessageSquare, label: "Chat & whiteboard", detail: "Built into every call" },
];

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [joinMeetingId, setJoinMeetingId] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinError, setJoinError] = useState("");

  const createMeeting = async () => {
    try {
      setCreating(true);

      const { data } = await API.post("/meeting/create", {
        title: `${user?.fullName || "New"}'s Meeting`,
      });

      navigate(`/meeting/${data.meeting.meetingId}`);
    } catch (error) {
      showToast(error.response?.data?.message || "Meeting creation failed", { type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const joinMeeting = async (e) => {
    e.preventDefault();
    setJoinError("");

    if (!joinMeetingId.trim()) {
      setJoinError("Please enter a meeting ID");
      return;
    }

    try {
      await API.post("/meeting/join", { meetingId: joinMeetingId.trim() });
      navigate(`/meeting/${joinMeetingId.trim()}`);
    } catch (error) {
      setJoinError(error.response?.data?.message || "Meeting not found");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-surface-0 text-white flex flex-col relative overflow-hidden">
      <div
        className="fixed -top-56 left-1/2 -translate-x-1/2 w-[50rem] h-[50rem] rounded-full opacity-[0.12] blur-[130px] pointer-events-none"
        style={{ background: "linear-gradient(120deg, #6366f1, #8b5cf6, #22d3ee)" }}
        aria-hidden="true"
      />

      {/* Top bar */}
      <div className="relative flex justify-between items-center px-6 sm:px-8 py-4 border-b border-white/8">
        <BrandMark size="sm" />

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/activity")}
            className="flex items-center gap-2 text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors focus-ring"
            title="Your activity"
          >
            <BarChart3 size={16} />
            <span className="hidden sm:inline">Activity</span>
          </button>
          <button
            onClick={() => navigate("/feedback")}
            className="flex items-center gap-2 text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors focus-ring"
            title="Send feedback"
          >
            <MessageCircle size={16} />
            <span className="hidden sm:inline">Feedback</span>
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2 text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors focus-ring"
            title="Profile settings"
          >
            <SettingsIcon size={16} />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <Avatar
            name={user?.fullName}
            src={user?.profilePic}
            size="sm"
            ring="ring-2 ring-white/10"
            title={user?.fullName}
            className="cursor-pointer"
            onClick={() => navigate("/settings")}
          />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors focus-ring"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-16">
        <span className="text-xs font-semibold tracking-wide text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-6 animate-fade-in">
          Welcome back, {user?.fullName || "Guest"}
        </span>

        <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4 text-center tracking-tight animate-slide-up">
          Video calls, <span className="aurora-text">reimagined</span>
        </h2>
        <p className="text-slate-400 mb-11 text-center max-w-md text-[15px] animate-slide-up" style={{ animationDelay: "0.05s" }}>
          Start an instant meeting or join one with a meeting ID — everyone
          connects in real time, wherever they are.
        </p>

        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xl animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <button
            onClick={createMeeting}
            disabled={creating}
            className="btn-primary rounded-xl px-6 py-3.5 text-sm shrink-0"
          >
            <Plus size={18} />
            {creating ? "Creating…" : "New meeting"}
          </button>

          <div className="flex-1 flex items-stretch gap-2">
            <div className="flex-1 flex items-center gap-2 glass-panel rounded-xl px-3.5">
              <Keyboard size={17} className="text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Enter a meeting ID"
                value={joinMeetingId}
                onChange={(e) => setJoinMeetingId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinMeeting(e)}
                className="w-full bg-transparent py-3.5 outline-none text-white placeholder:text-slate-500 text-sm"
              />
            </div>

            <button
              onClick={joinMeeting}
              disabled={!joinMeetingId.trim()}
              className="flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200 disabled:text-slate-600 disabled:cursor-not-allowed font-medium px-4 text-sm transition-colors focus-ring rounded-xl"
            >
              Join
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {joinError && (
          <p className="text-red-400 text-sm mt-3 animate-slide-up">{joinError}</p>
        )}

        {/* Quiet feature strip — static, informational, no fabricated data */}
        <div
          className="grid sm:grid-cols-3 gap-3 w-full max-w-2xl mt-16 animate-slide-up"
          style={{ animationDelay: "0.15s" }}
        >
          {FEATURES.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="glass-panel rounded-2xl p-4 flex flex-col gap-2 hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg aurora-bg flex items-center justify-center opacity-90">
                <Icon size={16} className="text-white" />
              </div>
              <p className="text-white text-sm font-medium">{label}</p>
              <p className="text-slate-500 text-xs leading-snug">{detail}</p>
            </div>
          ))}
        </div>

        <MeetingHistoryPanel />
      </div>
    </div>
  );
}

export default Dashboard;
