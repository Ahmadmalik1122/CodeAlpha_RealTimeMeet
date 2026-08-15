import { X } from "lucide-react";
import IconButton from "./IconButton";

/**
 * PanelShell
 * The chrome shared by every side panel (chat, people, security, waiting
 * room): full-height glass surface, a title row with an optional icon and
 * count, a close button, and a scrollable body.
 *
 * The panel's *width* is deliberately not set here — MeetingRoom's wrapper
 * decides that, because it differs between the desktop rail and the mobile
 * bottom sheet.
 */
function PanelShell({ title, icon, count, onClose, closeLabel = "Close", actions, children, bodyClassName = "" }) {
  return (
    <div className="w-full h-full glass-panel-strong sm:border-l border-white/8 flex flex-col animate-slide-in-right">
      <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-white/8 shrink-0">
        <h2 className="text-white font-semibold text-[15px] flex items-center gap-2 min-w-0">
          {icon}
          <span className="truncate">{title}</span>
          {count != null && <span className="text-slate-400 font-normal">({count})</span>}
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          <IconButton onClick={onClose} title={closeLabel}>
            <X size={18} />
          </IconButton>
        </div>
      </div>

      <div className={`flex-1 min-h-0 flex flex-col ${bodyClassName}`}>{children}</div>
    </div>
  );
}

export default PanelShell;
