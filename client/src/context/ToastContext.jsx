import { useCallback, useMemo, useRef, useState } from "react";
import ToastContext from "./toastContextValue";

/**
 * ToastProvider
 * App-wide, lightweight toast queue (no external dependency). Used for
 * join/leave notifications and raise-hand alerts in the meeting room, but
 * intentionally generic so any page can call useToast().showToast(...).
 *
 * Each toast goes through three phases so the exit can animate instead of
 * popping out of existence:
 *   1. added             -> renders with the "toast-in" animation
 *   2. leaving: true      -> renders with the "toast-out" animation
 *   3. removed from list  -> once the exit animation finishes
 */
let toastIdSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timers = timersRef.current.get(id);
    if (timers) {
      timers.forEach(clearTimeout);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id) => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      const exitTimer = setTimeout(() => removeToast(id), 220);
      const existing = timersRef.current.get(id) || [];
      timersRef.current.set(id, [...existing, exitTimer]);
    },
    [removeToast]
  );

  const showToast = useCallback(
    (message, options = {}) => {
      const { type = "info", duration = 4000 } = options;
      const id = ++toastIdSeq;

      setToasts((prev) => [...prev, { id, message, type, leaving: false }]);

      if (duration > 0) {
        const autoTimer = setTimeout(() => dismissToast(id), duration);
        timersRef.current.set(id, [autoTimer]);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
