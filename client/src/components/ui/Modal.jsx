import { useEffect } from "react";
import { X } from "lucide-react";
import IconButton from "./IconButton";

/**
 * Modal
 * Centered dialog over a dimmed backdrop, dismissed by the close button,
 * a backdrop click, or Escape. Extracted from InviteModal so the device
 * settings dialog (and anything added later) doesn't re-implement the same
 * escape-key wiring and backdrop markup.
 */
function Modal({ title, subtitle, icon, onClose, children, footer, maxWidth = "max-w-md" }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        // Stop clicks inside the card from reaching the backdrop's close handler.
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} glass-panel-strong rounded-2xl shadow-2xl shadow-black/60 animate-scale-in max-h-[90dvh] flex flex-col`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/8 shrink-0">
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-[15px] flex items-center gap-2">
              {icon}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && <p className="text-slate-400 text-xs mt-1">{subtitle}</p>}
          </div>
          <IconButton onClick={onClose} title="Close">
            <X size={18} />
          </IconButton>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-5 py-4">{children}</div>

        {footer && <div className="px-5 py-3.5 border-t border-white/8 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
