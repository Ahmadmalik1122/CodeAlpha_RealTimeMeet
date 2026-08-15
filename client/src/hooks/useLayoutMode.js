import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Layout modes for the video area.
 *   grid    — everyone the same size, columns adapt to headcount
 *   speaker — one large spotlight tile + a thumbnail strip
 *   sidebar — spotlight with a vertical rail of thumbnails beside it
 *   pip     — one full-bleed tile with small draggable overlay tiles
 */
export const LAYOUT_MODES = ["grid", "speaker", "sidebar", "pip"];

export const LAYOUT_LABELS = {
  grid: "Grid",
  speaker: "Speaker",
  sidebar: "Sidebar",
  pip: "Picture in picture",
};

const STORAGE_KEY = "meeting:layout-mode";
export const LAYOUT_STORAGE_KEY = STORAGE_KEY;

/**
 * Lets Settings.jsx write the saved Meeting Preferences (Part 2B #1)
 * default layout straight into the same localStorage key this hook reads
 * synchronously on mount — so a layout saved in Settings is picked up the
 * next time MeetingRoom mounts in this browser, without MeetingRoom having
 * to thread a prop through just for that. Exported rather than inlining the
 * raw key elsewhere, so the storage format stays owned by this file.
 */
export const writeStoredLayoutMode = (mode) => {
  if (!LAYOUT_MODES.includes(mode)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Non-fatal: the default just won't be pre-applied on this browser.
  }
};

/**
 * useLayoutMode
 * Owns the current layout, persists the user's choice across meetings, and
 * narrows the available options to what actually fits the current screen.
 *
 * Sidebar is desktop/tablet-only: a vertical thumbnail rail next to a
 * spotlight needs horizontal room that a phone doesn't have. When someone
 * picks Sidebar on a laptop then reloads on a phone, `mode` transparently
 * falls back to Speaker — but we keep the stored preference untouched so
 * their choice comes back on a wider screen.
 *
 * @param {{ isMobile?: boolean, isPortrait?: boolean, accountDefault?: string|null }} breakpoint
 *        accountDefault: the saved Meeting Preferences (Part 2B #1) default
 *        layout from Mongo. Only used the first time this hook runs in a
 *        browser that has no localStorage entry yet — an explicit local
 *        choice always wins after that, same seed-not-override rule as
 *        useBrowserNotifications' accountSettings param.
 */
export default function useLayoutMode({
  isMobile = false,
  isPortrait = false,
  accountDefault = null,
} = {}) {
  const [stored, setStored] = useState(() => {
    if (typeof window === "undefined") return "grid";
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (LAYOUT_MODES.includes(saved)) return saved;
      if (LAYOUT_MODES.includes(accountDefault)) return accountDefault;
      return "grid";
    } catch {
      return "grid"; // private mode / storage disabled
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, stored);
    } catch {
      // Non-fatal: the layout just won't persist.
    }
  }, [stored]);

  // A vertical thumbnail rail needs horizontal room. Allow it on tablets in
  // landscape and on desktop; hide it on phones and portrait tablets.
  const sidebarAllowed = !isMobile && !isPortrait;

  const availableModes = useMemo(
    () => LAYOUT_MODES.filter((m) => (m === "sidebar" ? sidebarAllowed : true)),
    [sidebarAllowed]
  );

  const mode = availableModes.includes(stored) ? stored : "speaker";

  const setMode = useCallback((next) => {
    if (LAYOUT_MODES.includes(next)) setStored(next);
  }, []);

  const cycleMode = useCallback(() => {
    setStored((current) => {
      const list = LAYOUT_MODES.filter((m) => (m === "sidebar" ? sidebarAllowed : true));
      const idx = list.indexOf(list.includes(current) ? current : "speaker");
      return list[(idx + 1) % list.length];
    });
  }, [sidebarAllowed]);

  return { mode, setMode, cycleMode, availableModes };
}
