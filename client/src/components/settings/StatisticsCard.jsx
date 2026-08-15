import {
  BarChart3,
  Video,
  LogIn,
  Clock,
  Users2,
  ScreenShare,
  PenTool,
  Disc,
  MessageSquare,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";

/**
 * StatisticsCard
 * Part 2B #5. Four tiles show real numbers aggregated live from MongoDB
 * (server/controllers/preferencesController.js's getStatistics — see that
 * file for the exact aggregation queries). The other four requested metrics
 * (screen shares, whiteboards used, recordings created, chat messages sent)
 * have no backing data anywhere in the app — nothing about them is ever
 * written to the database — so rather than show a fake 0 that looks like a
 * real answer, they're rendered as explicitly "not tracked yet" with the
 * reason, straight from the server's `unavailable` payload.
 */
const AVAILABLE_TILES = [
  { key: "meetingsHosted", label: "Meetings hosted", Icon: Video, suffix: "" },
  { key: "meetingsJoined", label: "Meetings joined", Icon: LogIn, suffix: "" },
  { key: "totalMeetingHours", label: "Total meeting hours", Icon: Clock, suffix: "h" },
  { key: "totalParticipantsMet", label: "Participants met", Icon: Users2, suffix: "" },
];

const UNAVAILABLE_TILES = [
  { key: "screenSharesCount", label: "Screen shares", Icon: ScreenShare },
  { key: "whiteboardsUsedCount", label: "Whiteboards used", Icon: PenTool },
  { key: "recordingsCreatedCount", label: "Recordings created", Icon: Disc },
  { key: "chatMessagesSentCount", label: "Chat messages sent", Icon: MessageSquare },
];

function StatTile({ label, Icon, value, suffix }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-5 flex flex-col gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/6 flex items-center justify-center">
        <Icon size={16} className="text-indigo-300" />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-white leading-none">
          {value}
          {suffix}
        </p>
        <p className="text-slate-500 text-xs mt-1.5">{label}</p>
      </div>
    </div>
  );
}

function UnavailableTile({ label, Icon, reason }) {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-dashed border-white/10 p-5 flex flex-col gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
        <Icon size={16} className="text-slate-500" />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-slate-600 leading-none">—</p>
        <p className="text-slate-500 text-xs mt-1.5">{label}</p>
      </div>
      {reason && (
        <p className="flex items-start gap-1.5 text-slate-600 text-[11px] leading-snug">
          <Info size={12} className="shrink-0 mt-0.5" />
          {reason}
        </p>
      )}
    </div>
  );
}

function StatisticsCard({ loading, error, statistics, unavailable }) {
  return (
    <div className="glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl mt-6">
      <div className="flex items-center gap-2 mb-1.5">
        <BarChart3 size={20} className="text-indigo-400" />
        <h2 className="text-xl font-display font-bold text-white">Your activity</h2>
      </div>
      <p className="text-slate-400 text-sm mb-7">
        Pulled live from your meeting history — nothing here is estimated.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Loading your activity…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AVAILABLE_TILES.map(({ key, label, Icon, suffix }) => (
              <StatTile key={key} label={label} Icon={Icon} value={statistics?.[key] ?? 0} suffix={suffix} />
            ))}
          </div>

          <div className="h-px bg-white/10 my-6" />

          <p className="text-slate-500 text-xs mb-3">
            Not tracked yet — no data exists in the database for these:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {UNAVAILABLE_TILES.map(({ key, label, Icon }) => (
              <UnavailableTile key={key} label={label} Icon={Icon} reason={unavailable?.[key]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default StatisticsCard;
