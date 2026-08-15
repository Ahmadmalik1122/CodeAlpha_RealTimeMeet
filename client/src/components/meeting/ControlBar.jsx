import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Users,
  Hand,
  ScreenShare,
  ScreenShareOff,
  Smile,
  PenSquare,
  Disc,
  Square,
  Shield,
  Lock,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import LayoutSwitcher from "./LayoutSwitcher";

const REACTION_EMOJIS = ["👍", "❤️", "👏", "😂", "🔥", "😮"];

function ControlButton({ active, danger, disabled, onClick, title, children, badge, compact }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`relative rounded-full flex items-center justify-center transition-all duration-200 focus-ring active:scale-95 ${
        compact ? "w-10 h-10" : "w-11 h-11 sm:w-12 sm:h-12"
      } ${
        disabled
          ? "bg-white/5 opacity-40 cursor-not-allowed"
          : danger
          ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
          : active
          ? "aurora-bg shadow-lg shadow-indigo-500/25"
          : "bg-white/8 hover:bg-white/14"
      }`}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-[10px] text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-semibold shadow">
          {badge}
        </span>
      )}
    </button>
  );
}

function ControlBar({
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  onLeave,
  onToggleChat,
  onToggleParticipants,
  chatOpen,
  participantsOpen,
  unreadMessages = 0,
  participantCount = 1,
  raised,
  onToggleRaiseHand,
  isScreenSharing,
  onToggleScreenShare,
  onSendReaction,
  whiteboardOpen,
  onToggleWhiteboard,
  isRecording,
  onToggleRecording,
  isHost = false,
  securityOpen = false,
  onToggleSecurity,
  isLocked = false,
  screenShareDisabled = false,
  compact = false,
  floating = false,
  layoutMode,
  availableLayouts = [],
  onChangeLayout,
  onOpenSettings,
}) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const screenShareDisabledForMe = screenShareDisabled && !isHost && !isScreenSharing;

  const pickReaction = (emoji) => {
    onSendReaction(emoji);
    setReactionsOpen(false);
  };

  // Dismiss the mobile overflow menu on any outside tap / Escape.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // Secondary actions collapse into an overflow menu on small screens so
  // the bar stays one row instead of wrapping over the video.
  const secondaryActions = [
    {
      key: "raise",
      label: raised ? "Lower hand" : "Raise hand",
      Icon: Hand,
      active: raised,
      onClick: onToggleRaiseHand,
    },
    {
      key: "whiteboard",
      label: whiteboardOpen ? "Close whiteboard" : "Whiteboard",
      Icon: PenSquare,
      active: whiteboardOpen,
      onClick: onToggleWhiteboard,
    },
    {
      key: "record",
      label: isRecording ? "Stop recording" : "Start recording",
      Icon: isRecording ? Square : Disc,
      active: isRecording,
      onClick: onToggleRecording,
    },
    ...(isHost
      ? [
          {
            key: "security",
            label: "Security",
            Icon: isLocked ? Lock : Shield,
            active: securityOpen,
            onClick: onToggleSecurity,
          },
        ]
      : []),
    ...(onOpenSettings
      ? [
          {
            key: "settings",
            label: "Settings",
            Icon: Settings,
            active: false,
            onClick: onOpenSettings,
          },
        ]
      : []),
  ];

  return (
    <div
      className={`relative z-40 flex items-center justify-center px-3 shrink-0 ${
        floating
          ? // Mobile/landscape-phone: overlay the video instead of taking a
            // row of its own, and clear the notch / home indicator.
            "absolute inset-x-0 bottom-0 z-30 pointer-events-none pt-8 safe-bottom bg-gradient-to-t from-black/70 via-black/25 to-transparent"
          : "relative py-3 sm:py-4"
      }`}
    >
      <div className={`relative flex items-center justify-center ${floating ? "pointer-events-auto" : ""}`}>
      {reactionsOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 glass-panel-strong rounded-full px-3 py-2 flex items-center gap-1 shadow-2xl animate-scale-in z-10">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => pickReaction(emoji)}
              className="text-2xl hover:scale-125 transition-transform p-1 focus-ring rounded-full"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div
        className={`flex items-center justify-center glass-panel-strong rounded-full shadow-2xl shadow-black/40 ${
          compact
            ? "gap-1.5 px-2 py-1.5"
            : "flex-wrap gap-2 sm:gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5"
        }`}
      >
        <ControlButton
          compact={compact}
          onClick={onToggleMic}
          title={micOn ? "Turn off microphone" : "Turn on microphone"}
          danger={!micOn}
        >
          {/* key={micOn} remounts the icon on every toggle so the "pop"
              animation replays — a still icon swap doesn't read as live. */}
          {micOn ? (
            <Mic key="mic-on" size={compact ? 17 : 19} className="text-white animate-icon-pop" />
          ) : (
            <MicOff key="mic-off" size={compact ? 17 : 19} className="text-white animate-icon-pop" />
          )}
        </ControlButton>

        <ControlButton
          compact={compact}
          onClick={onToggleCamera}
          title={cameraOn ? "Turn off camera" : "Turn on camera"}
          danger={!cameraOn}
        >
          {cameraOn ? (
            <Video key="cam-on" size={compact ? 17 : 19} className="text-white animate-icon-pop" />
          ) : (
            <VideoOff key="cam-off" size={compact ? 17 : 19} className="text-white animate-icon-pop" />
          )}
        </ControlButton>

        <ControlButton
          compact={compact}
          onClick={onToggleScreenShare}
          title={
            screenShareDisabledForMe
              ? "Screen sharing disabled by host"
              : isScreenSharing
              ? "Stop presenting"
              : "Present screen"
          }
          active={isScreenSharing}
          disabled={screenShareDisabledForMe}
        >
          {isScreenSharing ? (
            <ScreenShareOff size={compact ? 17 : 19} className="text-white" />
          ) : (
            <ScreenShare size={compact ? 17 : 19} className="text-white" />
          )}
        </ControlButton>

        {/* Reactions stay on the bar at every size — they're the most-used
            lightweight action in a call. */}
        <ControlButton
          compact={compact}
          onClick={() => setReactionsOpen((open) => !open)}
          title="Send a reaction"
          active={reactionsOpen}
        >
          <Smile size={compact ? 17 : 19} className="text-white" />
        </ControlButton>

        {compact ? (
          // Everything secondary folds into one overflow button so the bar
          // stays a single row on a phone.
          <div ref={moreRef} className="relative">
            <ControlButton
              compact={compact}
              onClick={() => setMoreOpen((o) => !o)}
              title="More options"
              active={moreOpen}
              badge={isRecording ? 1 : 0}
            >
              <MoreHorizontal size={17} className="text-white" />
            </ControlButton>

            {moreOpen && (
              <div className="absolute bottom-full right-0 mb-3 w-52 glass-panel-strong rounded-xl shadow-2xl shadow-black/50 p-1.5 z-50 animate-scale-in">
                {secondaryActions.map(({ key, label, Icon, active, onClick }) => (
                  <button
                    key={key}
                    onClick={() => {
                      onClick?.();
                      setMoreOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors focus-ring ${
                      active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                  </button>
                ))}

                {/* Layout options live here on mobile, since the top-bar
                    switcher is hidden at this width. */}
                {availableLayouts.length > 0 && onChangeLayout && (
                  <div className="border-t border-white/8 mt-1.5 pt-1.5">
                    <p className="text-slate-500 text-[11px] font-medium px-2.5 pb-1">Layout</p>
                    <div className="px-1 pb-0.5">
                      <LayoutSwitcher
                        mode={layoutMode}
                        availableModes={availableLayouts}
                        onChange={(m) => {
                          onChangeLayout(m);
                          setMoreOpen(false);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <ControlButton
              onClick={onToggleRaiseHand}
              title={raised ? "Lower hand" : "Raise hand"}
              active={raised}
            >
              <Hand size={19} className={`text-white ${raised ? "animate-hand-wave" : ""}`} />
            </ControlButton>

            <ControlButton
              onClick={onToggleWhiteboard}
              title={whiteboardOpen ? "Close whiteboard" : "Open whiteboard"}
              active={whiteboardOpen}
            >
              <PenSquare size={19} className="text-white" />
            </ControlButton>

            <ControlButton
              onClick={onToggleRecording}
              title={isRecording ? "Stop recording" : "Start recording"}
              danger={isRecording}
            >
              {isRecording ? (
                <Square size={17} className="text-white" fill="currentColor" />
              ) : (
                <Disc size={19} className="text-white" />
              )}
            </ControlButton>

            {isHost && (
              <ControlButton onClick={onToggleSecurity} title="Security" active={securityOpen}>
                {isLocked ? (
                  <Lock size={19} className="text-white" />
                ) : (
                  <Shield size={19} className="text-white" />
                )}
              </ControlButton>
            )}
          </>
        )}

        {!compact && <div className="w-px h-7 bg-white/10 mx-0.5" />}

        <ControlButton
          compact={compact}
          onClick={onToggleParticipants}
          title="People"
          active={participantsOpen}
          badge={participantCount}
        >
          <Users size={compact ? 17 : 19} className="text-white" />
        </ControlButton>

        <ControlButton
          compact={compact}
          onClick={onToggleChat}
          title="Chat"
          active={chatOpen}
          badge={!chatOpen ? unreadMessages : 0}
        >
          <MessageSquare size={compact ? 17 : 19} className="text-white" />
        </ControlButton>

        {!compact && <div className="w-px h-7 bg-white/10 mx-0.5" />}

        <button
          onClick={onLeave}
          title="Leave call"
          className={`rounded-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/25 focus-ring ${
            compact ? "h-10 px-4 ml-0.5" : "h-11 sm:h-12 px-5 sm:px-6"
          }`}
        >
          <PhoneOff size={compact ? 17 : 19} className="text-white" />
        </button>
      </div>
      </div>
    </div>
  );
}

export default ControlBar;
