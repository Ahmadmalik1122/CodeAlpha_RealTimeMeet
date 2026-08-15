import { useState } from "react";
import { Bell, MessageSquare, Smile, Mail, Monitor, UserPlus2, AlertCircle } from "lucide-react";
import Toggle from "../ui/Toggle";

const ROWS = [
  {
    key: "meetingReminders",
    label: "Meeting reminders",
    description: "Persisted to your account. No reminder scheduler exists in the app yet, so this doesn't send anything on its own — see note below.",
    Icon: Bell,
  },
  {
    key: "chatNotifications",
    label: "Chat notifications",
    description: "Desktop alert for new in-call chat messages while the meeting tab is in the background.",
    Icon: MessageSquare,
  },
  {
    key: "reactionNotifications",
    label: "Reaction notifications",
    description: "Desktop alert when someone sends an emoji reaction while the meeting tab is in the background.",
    Icon: Smile,
  },
  {
    key: "emailNotifications",
    label: "Email notifications",
    description: "Persisted to your account. The app currently only sends account emails (verification, password reset/changed) — no meeting-related emails exist yet to gate on this.",
    Icon: Mail,
  },
  {
    key: "desktopNotifications",
    label: "Desktop notifications",
    description: "Master switch for the browser notifications above. Turning this off suppresses all of them, even if your OS permission is granted.",
    Icon: Monitor,
  },
  {
    key: "joinLeaveNotifications",
    label: "Join / leave notifications",
    description: "Desktop alert when someone joins or leaves a meeting while the tab is in the background.",
    Icon: UserPlus2,
  },
];

/**
 * NotificationSettingsCard
 * Part 2B #4. These are the account-level switches, distinct from (but the
 * seed for) the per-browser runtime prefs in useBrowserNotifications — see
 * MeetingRoom.jsx, which reads these from the server and passes them in as
 * that hook's initial state so there's a single source of truth rather than
 * two competing notification systems.
 *
 * chatNotifications / reactionNotifications / joinLeaveNotifications /
 * desktopNotifications are wired to something real (the existing
 * useBrowserNotifications desktop-notification pipeline). meetingReminders
 * and emailNotifications are honestly just persisted — the app has no
 * meeting-reminder scheduler and no meeting-related email sender to gate on
 * them yet, which is called out inline rather than implying they do
 * something they don't.
 */
function NotificationSettingsCard({ settings, saving, error, onToggle }) {
  const [pendingKey, setPendingKey] = useState(null);

  const handleToggle = async (key, value) => {
    setPendingKey(key);
    try {
      await onToggle(key, value);
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div className="glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl mt-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Bell size={20} className="text-indigo-400" />
        <h2 className="text-xl font-display font-bold text-white">Notifications</h2>
      </div>
      <p className="text-slate-400 text-sm mb-7">
        Choose what you're notified about during and around meetings.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="-mx-1.5">
        {ROWS.map(({ key, label, description, Icon }) => (
          <Toggle
            key={key}
            checked={!!settings[key]}
            onChange={(value) => handleToggle(key, value)}
            label={label}
            description={description}
            Icon={Icon}
            disabled={saving || pendingKey === key}
          />
        ))}
      </div>
    </div>
  );
}

export default NotificationSettingsCard;
