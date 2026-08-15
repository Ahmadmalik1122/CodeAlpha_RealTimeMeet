import { Bell, BellOff, BellRing } from "lucide-react";

import Toggle from "../ui/Toggle";
import { NOTIFICATION_KINDS, NOTIFICATION_LABELS } from "../../hooks/useBrowserNotifications";

const DESCRIPTIONS = {
  join: "When someone new enters the meeting",
  leave: "When someone leaves the meeting",
  chat: "When a message arrives in the in-call chat",
  reaction: "When a participant sends an emoji reaction",
  hand: "When a participant raises their hand",
};

/**
 * NotificationSettings
 * Desktop-notification controls, rendered inside the settings dialog.
 *
 * The permission prompt is deliberately behind an explicit button: browsers
 * penalise (and Chrome now auto-blocks) sites that fire requestPermission
 * on load, and an unprompted OS dialog the moment you open a meeting is
 * hostile anyway.
 */
function NotificationSettings({ supported, permission, onRequest, prefs, onSetPref }) {
  if (!supported) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-3.5 py-3">
        <BellOff size={16} className="text-slate-500 shrink-0 mt-0.5" />
        <p className="text-slate-400 text-xs leading-relaxed">
          This browser doesn&apos;t support desktop notifications. In-app toasts will still
          appear while you have the meeting open.
        </p>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3.5 py-3">
        <BellOff size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-amber-100/80 text-xs leading-relaxed">
          Notifications are blocked for this site. To turn them back on, allow notifications
          in your browser&apos;s site settings (the icon at the left of the address bar).
        </p>
      </div>
    );
  }

  if (permission !== "granted") {
    return (
      <div className="rounded-xl bg-white/[0.03] px-3.5 py-3.5">
        <div className="flex items-start gap-3">
          <BellRing size={16} className="text-indigo-300 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-white text-sm font-medium">Get notified when you&apos;re away</p>
            <p className="text-slate-500 text-xs leading-relaxed mt-1">
              Alerts for joins, leaves, chat messages, reactions and raised hands — shown only
              while this tab is in the background.
            </p>
          </div>
        </div>
        <button onClick={onRequest} className="btn-primary mt-3 w-full rounded-xl py-2.5 text-sm">
          Enable notifications
        </button>
      </div>
    );
  }

  return (
    <div className="-mx-1.5">
      <p className="flex items-center gap-2 text-slate-400 text-xs px-3.5 pb-1">
        <Bell size={13} className="text-emerald-400" />
        Shown only while this tab is in the background.
      </p>
      {NOTIFICATION_KINDS.map((kind) => (
        <Toggle
          key={kind}
          checked={!!prefs[kind]}
          onChange={(value) => onSetPref(kind, value)}
          label={NOTIFICATION_LABELS[kind]}
          description={DESCRIPTIONS[kind]}
        />
      ))}
    </div>
  );
}

export default NotificationSettings;
