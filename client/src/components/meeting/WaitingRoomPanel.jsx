import { Check, UserRoundX, Clock3 } from "lucide-react";
import PanelShell from "../ui/PanelShell";
import Avatar from "../ui/Avatar";
import IconButton from "../ui/IconButton";
import EmptyState from "../ui/EmptyState";

/**
 * WaitingRoomPanel
 * Host-only panel listing everyone currently parked in the waiting room,
 * with per-person Approve/Reject actions. Realtime — driven entirely by
 * the "waiting-room:pending-list" events useWaitingRoom subscribes to.
 */
function WaitingRoomPanel({ requests, onApprove, onReject, onClose }) {
  return (
    <PanelShell
      title="Waiting room"
      icon={<Clock3 size={16} className="text-amber-400" />}
      count={requests.length}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1">
        {requests.map((r) => (
          <div
            key={r.socketId}
            className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors"
          >
            <Avatar name={r.userName} size="sm" className="shrink-0" />

            <span className="text-white text-sm flex-1 truncate">{r.userName}</span>

            <div className="flex items-center gap-1.5 shrink-0">
              <IconButton onClick={() => onReject(r.socketId)} title="Reject" variant="ghost" size="md"
                className="hover:text-red-300 hover:bg-red-500/15">
                <UserRoundX size={16} />
              </IconButton>
              <IconButton onClick={() => onApprove(r.socketId)} title="Admit" variant="success" size="md">
                <Check size={16} />
              </IconButton>
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <EmptyState
            icon={<Clock3 size={22} className="text-slate-500" />}
            title="No one is waiting"
            description="You'll see people here as they ask to join."
          />
        )}
      </div>
    </PanelShell>
  );
}

export default WaitingRoomPanel;
