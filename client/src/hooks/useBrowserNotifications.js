import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "meeting:notifications";

// "reaction" added for Part 2B's Notification Settings (account-level
// "Reaction notifications" toggle) — floating emoji reactions
// (useReactions.js) previously had no desktop-notification path at all;
// this is a new kind on the *existing* hook, not a second notification
// system. "hand" (raise-hand) is unrelated to Part 2B and is left as-is.
export const NOTIFICATION_KINDS = ["join", "leave", "chat", "reaction", "hand"];

export const NOTIFICATION_LABELS = {
  join: "Someone joins",
  leave: "Someone leaves",
  chat: "New chat message",
  reaction: "Someone sends a reaction",
  hand: "Someone raises their hand",
};

const DEFAULT_PREFS = { join: true, leave: true, chat: true, reaction: true, hand: true };

const readPrefs = () => {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return saved ? { ...DEFAULT_PREFS, ...saved } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS; // private mode / corrupt value
  }
};

/**
 * Maps the account-level Notification Settings saved in Mongo (Part 2B #4 —
 * see server/models/User.js's notificationSettings and
 * components/settings/NotificationSettingsCard.jsx) onto this hook's
 * per-kind prefs. Called once when MeetingRoom has the account settings in
 * hand, so a fresh session (no localStorage entry yet) starts from what the
 * person actually configured in Settings rather than the hardcoded
 * DEFAULT_PREFS above. An explicit local per-kind toggle (localStorage)
 * still wins after that — this only seeds, it doesn't override every call.
 */
export const mapAccountSettingsToPrefs = (accountSettings) => {
  if (!accountSettings) return null;
  return {
    join: accountSettings.joinLeaveNotifications !== false,
    leave: accountSettings.joinLeaveNotifications !== false,
    chat: accountSettings.chatNotifications !== false,
    reaction: accountSettings.reactionNotifications !== false,
    hand: true,
  };
};

/**
 * Lets Settings.jsx push a freshly-saved/loaded account notificationSettings
 * object straight into this hook's own localStorage key, merging only the
 * account-covered kinds (join/leave/chat/reaction) over whatever's already
 * stored — "hand" (raise-hand), which has no account-level equivalent, is
 * left untouched so a local-only choice for it is never silently
 * overwritten. Mirrors writeStoredLayoutMode in useLayoutMode.js: the
 * account settings seed this hook's own storage rather than MeetingRoom
 * having to thread a prop through for a value that already has a
 * localStorage-backed hook of its own.
 */
export const syncAccountNotificationPrefs = (accountSettings) => {
  const mapped = mapAccountSettingsToPrefs(accountSettings);
  if (!mapped) return;
  try {
    const current = readPrefs();
    const next = { ...current, join: mapped.join, leave: mapped.leave, chat: mapped.chat, reaction: mapped.reaction };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal: the defaults just won't be pre-applied on this browser.
  }
};

const supported = () => typeof window !== "undefined" && "Notification" in window;

/**
 * useBrowserNotifications
 * Desktop notifications for the events you'd otherwise miss while the
 * meeting tab is in the background: joins, leaves, chat messages and
 * raised hands.
 *
 * Two rules shape the whole design:
 *
 *  1. Nothing fires while the tab is actually visible. An in-app toast has
 *     already told you (see ToastContext) — a second OS-level popup on top
 *     of it is just noise. This is what Meet and Zoom do too.
 *
 *  2. Permission is never requested on mount. Browsers increasingly ignore
 *     (or permanently block) permission prompts that aren't tied to a user
 *     gesture, so `request()` is only called from an explicit click in the
 *     notification settings.
 *
 * Each kind reuses one notification tag, so ten messages arriving while
 * you're away collapse into one entry instead of burying the desktop.
 *
 * @param {{ accountSettings?: object|null, desktopMasterEnabled?: boolean }} [options]
 *        accountSettings: Part 2B account-level notificationSettings from
 *        Mongo (via GET /api/users/preferences), used only the first time
 *        this hook runs in a browser that has no local override yet — see
 *        mapAccountSettingsToPrefs above.
 *        desktopMasterEnabled: the account's `desktopNotifications` switch.
 *        When explicitly false, notify() is suppressed entirely regardless
 *        of per-kind prefs or OS permission — this is Notification
 *        Settings' master toggle (Part 2B #4).
 */
export default function useBrowserNotifications({
  accountSettings = null,
  desktopMasterEnabled = true,
} = {}) {
  const [permission, setPermission] = useState(() =>
    supported() ? Notification.permission : "unsupported"
  );
  const [prefs, setPrefs] = useState(() => {
    // Only fall back to the account's saved settings when this browser has
    // never stored a local preference before — an explicit local choice
    // (someone muted chat pings on this laptop specifically) should not be
    // silently overwritten by the account default on every load.
    if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) {
      return readPrefs();
    }
    const seeded = mapAccountSettingsToPrefs(accountSettings);
    return seeded ? { ...DEFAULT_PREFS, ...seeded } : readPrefs();
  });

  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const masterEnabledRef = useRef(desktopMasterEnabled);
  useEffect(() => {
    masterEnabledRef.current = desktopMasterEnabled;
  }, [desktopMasterEnabled]);

  // Track visibility in a ref so `notify` stays referentially stable and
  // doesn't invalidate the callbacks that useWebRTC/useChat hold onto.
  const hiddenRef = useRef(typeof document !== "undefined" && document.hidden);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => {
      hiddenRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  // Close anything still on screen when the user leaves the meeting, so a
  // stale "X joined" doesn't linger after the call has ended.
  const openRef = useRef(new Set());

  useEffect(() => {
    const open = openRef.current;
    return () => {
      open.forEach((n) => {
        try {
          n.close();
        } catch {
          // already dismissed by the user or the OS
        }
      });
      open.clear();
    };
  }, []);

  const request = useCallback(async () => {
    if (!supported()) return "unsupported";
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      console.error("Notification permission request failed:", err);
      return Notification.permission;
    }
  }, []);

  const setPref = useCallback((kind, enabled) => {
    setPrefs((current) => {
      const next = { ...current, [kind]: enabled };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal: preferences just won't persist.
      }
      return next;
    });
  }, []);

  const notify = useCallback((kind, title, body) => {
    if (!supported() || Notification.permission !== "granted") return;
    if (!masterEnabledRef.current) return; // Notification Settings master switch
    if (!prefsRef.current[kind]) return;
    // Rule 1: the in-app toast already covers the foreground case.
    if (!hiddenRef.current) return;

    try {
      const notification = new Notification(title, {
        body,
        tag: `meeting-${kind}`,
        renotify: false,
        silent: kind === "join" || kind === "leave",
      });

      openRef.current.add(notification);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      notification.onclose = () => openRef.current.delete(notification);
    } catch (err) {
      // Some browsers throw here when the page is inside an iframe or the
      // Notification constructor is unavailable despite the API existing.
      console.error("Could not show notification:", err);
    }
  }, []);

  return {
    supported: supported(),
    permission,
    request,
    prefs,
    setPref,
    notify,
  };
}
