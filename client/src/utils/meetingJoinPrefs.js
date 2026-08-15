const STORAGE_KEY = "meeting:join-state";

/**
 * meetingJoinPrefs
 * Tiny localStorage mirror of the Meeting Preferences (Part 2B #1)
 * `joinWithCamera` / `joinWithMicrophone` fields saved in MongoDB.
 *
 * Every other Part 2B meeting preference (device ids, layout) already had
 * an existing localStorage-backed hook to seed from
 * (useMediaDevices/useLayoutMode) — this is the one piece that didn't
 * (useLocalMedia previously always defaulted both to on). Settings.jsx
 * writes here right after a successful GET/PUT of
 * /api/users/preferences; MeetingRoom.jsx reads it synchronously on mount,
 * the same "read a local cache instantly, let the network update it for
 * next time" pattern ThemeProvider and the other meeting hooks already use
 * — so the join-with-camera/mic preference is available the instant
 * useLocalMedia acquires the stream, without adding a loading gate in
 * front of the lobby.
 *
 * Known limitation (shared with useMediaDevices/useLayoutMode/
 * useBrowserNotifications, not new to this file): this cache is scoped to
 * the browser, not the signed-in account, so on a shared computer the very
 * first meeting joined after switching accounts uses whatever was cached
 * last, until Settings has been visited (or this meeting has completed)
 * once on that browser.
 */
export const readJoinPrefs = () => {
  if (typeof window === "undefined") return null;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return null;
    return {
      joinWithCamera: saved.joinWithCamera !== false,
      joinWithMicrophone: saved.joinWithMicrophone !== false,
      // Notification Settings' master "Desktop notifications" switch
      // (Part 2B #4) rides along in the same cache for the same reason:
      // useBrowserNotifications needs it synchronously at mount, and it has
      // no localStorage key of its own to read from the way per-kind prefs
      // do (see useBrowserNotifications.js's STORAGE_KEY).
      desktopNotifications: saved.desktopNotifications !== false,
    };
  } catch {
    return null; // private mode / corrupt value
  }
};

export const writeJoinPrefs = ({ joinWithCamera, joinWithMicrophone, desktopNotifications }) => {
  try {
    const current = readJoinPrefs() || {};
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        joinWithCamera: joinWithCamera !== undefined ? joinWithCamera !== false : current.joinWithCamera !== false,
        joinWithMicrophone:
          joinWithMicrophone !== undefined ? joinWithMicrophone !== false : current.joinWithMicrophone !== false,
        desktopNotifications:
          desktopNotifications !== undefined
            ? desktopNotifications !== false
            : current.desktopNotifications !== false,
      })
    );
  } catch {
    // Non-fatal: the preference just won't survive a reload on this browser.
  }
};
