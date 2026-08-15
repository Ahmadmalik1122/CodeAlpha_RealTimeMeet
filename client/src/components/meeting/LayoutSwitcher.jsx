import { useEffect, useRef, useState } from "react";
import { LayoutGrid, Presentation, Columns2, PictureInPicture2, Check, ChevronDown } from "lucide-react";
import { LAYOUT_LABELS } from "../../hooks/useLayoutMode";

const ICONS = {
  grid: LayoutGrid,
  speaker: Presentation,
  sidebar: Columns2,
  pip: PictureInPicture2,
};

/**
 * LayoutSwitcher
 * Dropdown for choosing the video layout. Lives in the meeting top bar on
 * desktop/tablet; on mobile the same options are reachable from the
 * floating control bar's overflow menu.
 *
 * `availableModes` comes from useLayoutMode and already excludes anything
 * that doesn't fit the current screen (e.g. Sidebar on a phone), so this
 * component never has to know about breakpoints itself.
 */
function LayoutSwitcher({ mode, availableModes, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close on outside click / Escape — standard menu dismissal.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ActiveIcon = ICONS[mode] || LayoutGrid;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={`Layout: ${LAYOUT_LABELS[mode]}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1.5 text-xs sm:text-sm rounded-full transition-colors focus-ring ${
          compact ? "p-2" : "px-2.5 sm:px-3 py-1.5"
        } ${open ? "bg-white/14 text-white" : "text-slate-300 hover:text-white bg-white/6 hover:bg-white/10"}`}
      >
        <ActiveIcon size={15} />
        {!compact && (
          <>
            <span className="hidden lg:inline">{LAYOUT_LABELS[mode]}</span>
            <ChevronDown size={13} className="hidden lg:inline opacity-60" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 glass-panel-strong rounded-xl shadow-2xl shadow-black/50 p-1.5 z-50 animate-scale-in"
        >
          {availableModes.map((m) => {
            const Icon = ICONS[m] || LayoutGrid;
            const active = m === mode;
            return (
              <button
                key={m}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors focus-ring ${
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/6 hover:text-white"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1 text-left">{LAYOUT_LABELS[m]}</span>
                {active && <Check size={14} className="text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LayoutSwitcher;
