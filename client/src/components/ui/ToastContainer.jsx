import { LogIn, LogOut, Hand, Info, X } from "lucide-react";
import useToast from "../../hooks/useToast";

const ICONS = {
  join: LogIn,
  leave: LogOut,
  hand: Hand,
  info: Info,
};

const ACCENTS = {
  join: "text-emerald-400 bg-emerald-500/15 ring-emerald-400/25",
  leave: "text-slate-300 bg-white/8 ring-white/15",
  hand: "text-amber-400 bg-amber-500/15 ring-amber-400/25",
  info: "text-indigo-300 bg-indigo-500/15 ring-indigo-400/25",
};

/**
 * ToastContainer
 * Fixed, top-center stack of ephemeral notifications (join/leave/raise-hand).
 * Mount once near the root (see App.jsx) — reads from ToastContext so any
 * page/hook can push a toast via useToast().showToast(...).
 */
function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none px-3 w-full sm:w-auto"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || Info;
        const accent = ACCENTS[toast.type] || ACCENTS.info;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 glass-panel-strong rounded-full pl-2 pr-3.5 py-2 shadow-2xl shadow-black/40 max-w-[92vw] sm:max-w-sm ${
              toast.leaving ? "animate-toast-out" : "animate-toast-in"
            }`}
          >
            <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ring-1 ${accent}`}>
              <Icon size={14} />
            </span>
            <span className="text-white text-sm truncate">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 text-slate-500 hover:text-white transition-colors p-0.5 rounded-full focus-ring"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
