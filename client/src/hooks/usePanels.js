import { useCallback, useMemo, useState } from "react";

/**
 * usePanels
 * Exclusive open/close state for the meeting room's side panels.
 *
 * MeetingRoom previously carried one boolean per panel plus five nearly
 * identical `openX` handlers, each of which had to remember to set the other
 * four to false — a list that had to be edited every time a panel was added,
 * and the exact shape of bug where one handler quietly forgets one panel.
 * Here "only one at a time" is a property of the data (a single string), so
 * it can't drift.
 *
 * @param {string[]} names
 * @returns {{
 *   active: string|null,
 *   isOpen: (name: string) => boolean,
 *   toggle: (name: string) => void,
 *   open: (name: string) => void,
 *   closeAll: () => void,
 *   anyOpen: boolean,
 * }}
 */
export default function usePanels(names = []) {
  const [active, setActive] = useState(null);

  const toggle = useCallback((name) => {
    setActive((current) => (current === name ? null : name));
  }, []);

  const open = useCallback((name) => setActive(name), []);
  const closeAll = useCallback(() => setActive(null), []);
  const isOpen = useCallback((name) => active === name, [active]);

  return useMemo(
    () => ({
      active,
      isOpen,
      toggle,
      open,
      closeAll,
      anyOpen: active != null && names.includes(active),
    }),
    [active, isOpen, toggle, open, closeAll, names]
  );
}
