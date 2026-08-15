import { memo, useMemo, useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, Hand, ScreenShare, Search, UserX, Crown, Users2,
} from "lucide-react";
import PanelShell from "../ui/PanelShell";
import Avatar from "../ui/Avatar";
import IconButton from "../ui/IconButton";
import EmptyState from "../ui/EmptyState";

/**
 * SpeakingBars
 * Three animated bars shown next to whoever is currently talking. Purely
 * decorative (the ring on the tile is the primary signal) but it makes the
 * list scannable at a glance when several people are in the call.
 */
function SpeakingBars() {
  return (
    <span className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] bg-emerald-400 rounded-full animate-speaking-bar"
          style={{ animationDelay: `${i * 140}ms`, height: "100%" }}
        />
      ))}
    </span>
  );
}

/**
 * ParticipantsPanel
 * The people list for a meeting: who is here, their live mic/camera/hand
 * state, who is speaking right now, who hosts the call, and — for the host —
 * per-person mute and remove actions.
 *
 * @param {Array} participants  [{ id, name, micOn, cameraOn, raised, presenting, isLocal, isHost }]
 * @param {Set<string>} speakingIds  ids currently detected as speaking
 * @param {boolean} isHost      whether *the local user* hosts this meeting
 * @param {(id: string) => void} onKick
 */
function ParticipantsPanel({
  participants,
  onClose,
  isHost = false,
  onKick,
  speakingIds,
}) {
  const [query, setQuery] = useState("");
  const [confirmKickId, setConfirmKickId] = useState(null);

  const speaking = speakingIds || new Set();

  // Raised hands float to the top, like Meet's participants list.
  const sorted = useMemo(
    () => [...participants].sort((a, b) => (b.raised ? 1 : 0) - (a.raised ? 1 : 0)),
    [participants]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.trim().toLowerCase();
    return sorted.filter((p) => p.name.toLowerCase().includes(q));
  }, [sorted, query]);

  return (
    <PanelShell title="People" count={participants.length} onClose={onClose}>
      {participants.length > 4 && (
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 glass-panel rounded-lg px-3 py-2">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search participants"
              className="w-full bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1">
        {filtered.map((p) => {
          const isSpeaking = speaking.has(p.id) && p.micOn !== false;
          const confirming = confirmKickId === p.id;

          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors ${
                confirming ? "bg-red-500/10" : "hover:bg-white/[0.05]"
              }`}
            >
              {/* Avatar doubles as the speaking indicator: a green ring
                  tracks live voice activity without adding another element. */}
              <div className="relative shrink-0">
                <Avatar
                  name={p.name}
                  size="sm"
                  ring={
                    isSpeaking
                      ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-surface-1"
                      : "ring-1 ring-white/10"
                  }
                  className="transition-all duration-200"
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-white text-sm flex items-center gap-1.5">
                  <span className="truncate">
                    {p.name} {p.isLocal && <span className="text-slate-400">(You)</span>}
                  </span>
                  {p.isHost && (
                    <span
                      title="Meeting host"
                      className="shrink-0 inline-flex items-center gap-1 bg-amber-400/15 text-amber-300 border border-amber-400/25 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    >
                      <Crown size={9} />
                      Host
                    </span>
                  )}
                </span>
                {isSpeaking && (
                  <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] mt-0.5">
                    <SpeakingBars />
                    Speaking
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-slate-500 shrink-0">
                {p.raised && <Hand key="raised" size={15} className="text-amber-400 animate-hand-wave" />}
                {p.presenting && <ScreenShare size={15} className="text-indigo-400" />}
                {p.micOn ? (
                  <Mic key="mic-on" size={15} className="animate-icon-pop" />
                ) : (
                  <MicOff key="mic-off" size={15} className="text-red-400 animate-icon-pop" />
                )}
                {p.cameraOn ? (
                  <Video key="cam-on" size={15} className="animate-icon-pop" />
                ) : (
                  <VideoOff key="cam-off" size={15} className="text-red-400 animate-icon-pop" />
                )}
              </div>

              {isHost && !p.isLocal && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {confirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onKick?.(p.id);
                          setConfirmKickId(null);
                        }}
                        className="text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg transition-colors focus-ring"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirmKickId(null)}
                        className="text-[11px] text-slate-400 hover:text-white px-1.5 py-1 rounded-lg transition-colors focus-ring"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    // Removal is irreversible for the person being removed
                    // (the server blocks them rejoining), so it asks first.
                    <IconButton
                      onClick={() => setConfirmKickId(p.id)}
                      title={`Remove ${p.name}`}
                      className="text-slate-500 hover:text-red-300 hover:bg-red-500/15"
                    >
                      <UserX size={15} />
                    </IconButton>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon={<Users2 size={22} className="text-slate-500" />}
            title={`No one matches “${query}”.`}
          />
        )}
      </div>
    </PanelShell>
  );
}

export default memo(ParticipantsPanel);
