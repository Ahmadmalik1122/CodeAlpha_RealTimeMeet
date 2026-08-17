import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Copy, Check, Clock, Maximize, Minimize, Users2, Clock3, UserPlus, Lock, Settings, Loader2,
} from "lucide-react";

import PreJoinLobby from "../components/meeting/PreJoinLobby";
import WaitingRoom from "../components/meeting/WaitingRoom";
import PasscodeGate from "../components/meeting/PasscodeGate";
import VideoGrid from "../components/meeting/VideoGrid";
import ControlBar from "../components/meeting/ControlBar";
import BrandMark from "../components/ui/BrandMark";
import LayoutSwitcher from "../components/meeting/LayoutSwitcher";
import { AudioOutputProvider } from "../context/AudioOutputContext";

import useAuth from "../hooks/useAuth";
import useLocalMedia from "../hooks/useLocalMedia";
import useMediaDevices from "../hooks/useMediaDevices";
import useWebRTC from "../hooks/useWebRTC";
import useWaitingRoom from "../hooks/useWaitingRoom";
import useMeetingSecurity from "../hooks/useMeetingSecurity";
import useChat from "../hooks/useChat";
import useReactions from "../hooks/useReactions";
import useRecorder from "../hooks/useRecorder";
import useToast from "../hooks/useToast";
import useActiveSpeaker from "../hooks/useActiveSpeaker";
import useBreakpoint from "../hooks/useBreakpoint";
import useLayoutMode, { writeStoredLayoutMode } from "../hooks/useLayoutMode";
import useBrowserNotifications, {
  syncAccountNotificationPrefs,
} from "../hooks/useBrowserNotifications";
import usePanels from "../hooks/usePanels";
import socket from "../socket/socket";
import API from "../services/api";
import { copyToClipboard } from "../utils/clipboard";
import { formatDuration } from "../utils/formatDuration";
import { readJoinPrefs, writeJoinPrefs } from "../utils/meetingJoinPrefs";

/**
 * Panels, the whiteboard and the modals are all code-split. None of them is
 * on the path to a first frame of video — the thing that actually has to be
 * fast — and several drag real weight along with them (the whiteboard's
 * canvas layer, InviteModal's QR-code dependency). Splitting them keeps the
 * initial meeting bundle to the call itself.
 */
const ChatPanel = lazy(() => import("../components/meeting/ChatPanel"));
const ParticipantsPanel = lazy(() => import("../components/meeting/ParticipantsPanel"));
const SecurityPanel = lazy(() => import("../components/meeting/SecurityPanel"));
const WaitingRoomPanel = lazy(() => import("../components/meeting/WaitingRoomPanel"));
const Whiteboard = lazy(() => import("../components/meeting/Whiteboard"));
const InviteModal = lazy(() => import("../components/meeting/InviteModal"));
const SettingsModal = lazy(() => import("../components/meeting/SettingsModal"));

const PANEL_NAMES = ["chat", "participants", "whiteboard", "waitingRoom", "security"];

/** Neutral placeholder while a split chunk arrives — usually imperceptible. */
function PanelFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center glass-panel-strong">
      <Loader2 size={18} className="text-slate-500 animate-spin" />
    </div>
  );
}

function MeetingRoom() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userName = user?.fullName || "Guest";
  const userId = user?.id || user?._id || null;

  // Exactly one panel is open at a time; usePanels makes that a property of
  // the state itself rather than five booleans kept in sync by hand.
  const panels = usePanels(PANEL_NAMES);
  const { isOpen, toggle: togglePanel, open: openPanel, closeAll: closeAllPanels } = panels;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [raised, setRaised] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [screenStream, setScreenStream] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Manually spotlighted tile (click a thumbnail / double-click a grid
  // tile). null = fall back to automatic active-speaker selection.
  const [pinnedId, setPinnedId] = useState(null);

  const breakpoint = useBreakpoint();
  const { isCompact } = breakpoint;
  const { mode: layoutMode, setMode: setLayoutMode, availableModes } = useLayoutMode(breakpoint);

  const roomRef = useRef(null);
  const copyTimerRef = useRef(null);

  const { showToast } = useToast();

  // Meeting Preferences (Part 2B #1/#2): join-with-camera/mic and the
  // Notification Settings desktop master switch, read synchronously from
  // the localStorage cache Settings.jsx keeps in sync with MongoDB (see
  // utils/meetingJoinPrefs.js for why these two specifically need a cache
  // rather than reusing an existing hook's own storage the way device
  // selection and layout do). Read once — this only needs to be right
  // *before* useLocalMedia acquires the stream a few lines down.
  //
  // A lazy useState initializer (not useRef) so this value can be read
  // straight from render — reading ref.current during render is a
  // react-hooks/refs violation. readJoinPrefs() only runs once, on the
  // very first render, exactly like the ref's one-time construction did;
  // the setter is simply never called again, so this behaves identically
  // to the original ref for the rest of the component's life.
  const [joinPrefs] = useState(() => readJoinPrefs());

  // Desktop notifications. These only fire while the tab is in the
  // background — the toasts below already cover the foreground case.
  // desktopMasterEnabled is Notification Settings' account-level "Desktop
  // notifications" switch (Part 2B #4) — when off, nothing here fires
  // regardless of the individual join/leave/chat/reaction toggles.
  const notifications = useBrowserNotifications({
    desktopMasterEnabled: joinPrefs?.desktopNotifications ?? true,
  });
  const { notify } = notifications;

  // Connect the socket now that we know the user is authenticated. We use
  // autoConnect:false in socket.js so the socket never opens an anonymous
  // connection before auth is ready. The auth callback reads the JWT from
  // localStorage at connection time, so the server can verify identity
  // during the handshake rather than trusting a client-supplied userId.
  // Disconnect on unmount so the next meeting gets a fresh handshake with
  // an up-to-date token (important after a token refresh or re-login).
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    return () => {
      socket.disconnect();
    };
  }, []);


  // Best-effort background refresh of the account's saved preferences, so
  // the *next* meeting joined in this browser reflects any change made in
  // Settings from a different browser/device. Deliberately does not
  // retroactively alter this already-in-progress join (e.g. flip a camera
  // that's already been acquired) — see utils/meetingJoinPrefs.js's
  // "Known limitation" note; that would risk a jarring mid-lobby device
  // change for a case the primary Settings -> Save -> Join flow doesn't
  // even hit, since that flow already writes these caches directly (see
  // Settings.jsx).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await API.get("/users/preferences");
        if (cancelled) return;
        const mp = data.meetingPreferences || {};
        const ns = data.notificationSettings || {};
        writeJoinPrefs({
          joinWithCamera: mp.joinWithCamera,
          joinWithMicrophone: mp.joinWithMicrophone,
          desktopNotifications: ns.desktopNotifications,
        });
        if (mp.layout) writeStoredLayoutMode(mp.layout);
        syncAccountNotificationPrefs(ns);
      } catch (err) {
        // Non-fatal: this join already has a usable cached/default value.
        console.error("Failed to refresh account preferences:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Host-approval gate. Everyone (host included) asks to enter through this
  // hook; the server verifies who the real host is. `joined` only flips to
  // true once the host has approved the request (instant for the host).
  const handleRequestReceived = useCallback(
    (name) => {
      showToast(`${name} wants to join the meeting`, { type: "join", duration: 6000 });
      notify("join", "Someone wants to join", `${name} is waiting to be let in.`);
    },
    [showToast, notify]
  );

  const {
    status: waitingStatus,
    isHost,
    rejectMessage,
    errorMessage: waitingErrorMessage,
    passcodeInvalid,
    initialSecurity,
    pendingRequests,
    requestToJoin,
    cancelRequest,
    approve: approveWaiting,
    reject: rejectWaiting,
  } = useWaitingRoom({
    meetingId,
    userId,
    userName,
    onRequestReceived: handleRequestReceived,
  });

  const joined = waitingStatus === "approved";

  // Host-only security controls (lock/passcode/disable chat & screen-share/
  // kick), plus the live-synced security state everyone reads from.
  const handleKicked = useCallback(
    (message) => {
      showToast(message, { type: "leave", duration: 6000 });
      navigate("/dashboard");
    },
    [showToast, navigate]
  );

  const handleChatBlocked = useCallback(
    (message) => showToast(message, { type: "info" }),
    [showToast]
  );

  // Declared as a ref-backed callback because it needs isScreenSharing /
  // stopScreenShare, which useWebRTC only returns further down.
  const screenShareBlockedRef = useRef(null);
  const handleScreenShareBlocked = useCallback((message) => {
    screenShareBlockedRef.current?.(message);
  }, []);

  const {
    security,
    setLocked,
    setPasscode,
    setChatDisabled,
    setScreenShareDisabled,
    kickParticipant,
  } = useMeetingSecurity({
    meetingId,
    initialSecurity,
    onKicked: handleKicked,
    onChatBlocked: handleChatBlocked,
    onScreenShareBlocked: handleScreenShareBlocked,
  });

  // Device selection (camera/mic/speaker). Enumerated only once we hold a
  // media permission, since device labels are empty strings before that.
  const { devices, selected, select, refresh: refreshDevices, canChooseSpeaker } =
    useMediaDevices(true);

  // Forward-declared so useLocalMedia can hand a newly switched track
  // straight to useWebRTC, which is initialised after it.
  const replaceTrackRef = useRef(null);
  const handleTrackReplaced = useCallback((track) => {
    replaceTrackRef.current?.(track);
  }, []);

  // A lazy useState initializer rather than useMemo: reading joinPrefs (now
  // state, not a ref) inside a useMemo body would still need to be listed
  // as a dependency, but this value is only ever meant to be computed once
  // — useLocalMedia reads it once, on mount, and every later change goes
  // through switchCamera/switchMicrophone (or, for on/off, toggleMic/
  // toggleCamera) instead. A lazy useState initializer runs exactly once,
  // on the very first render, which matches that "compute once" intent
  // precisely and needs no dependency array (and therefore no
  // eslint-disable) at all.
  const [initialDevices] = useState(() => ({
    cameraId: selected.cameraId,
    microphoneId: selected.microphoneId,
    // Meeting Preferences (Part 2B #1/#2) — see joinPrefs above.
    // Defaulting to true matches useLocalMedia's own default, so a
    // browser with no cached preference yet still joins camera/mic-on,
    // the pre-Part-2B behavior.
    joinWithCamera: joinPrefs?.joinWithCamera ?? true,
    joinWithMicrophone: joinPrefs?.joinWithMicrophone ?? true,
  }));

  // Camera/mic are acquired once here (lobby) and reused for the whole call.
  const {
    stream,
    micOn,
    cameraOn,
    toggleMic,
    toggleCamera,
    error,
    switching,
    switchCamera,
    switchMicrophone,
  } = useLocalMedia(initialDevices, handleTrackReplaced);

  // Browsers report empty device *labels* until the page holds a media
  // permission, so the first enumeration (at mount, before getUserMedia
  // resolves) yields "Camera 1"-style placeholders. Re-enumerate once the
  // stream exists and the real names are available.
  useEffect(() => {
    if (stream) refreshDevices();
  }, [stream, refreshDevices]);

  const handleUserJoined = useCallback(
    (name) => {
      showToast(`${name} joined the meeting`, { type: "join" });
      notify("join", "Someone joined", `${name} joined the meeting.`);
    },
    [showToast, notify]
  );

  const handleUserLeft = useCallback(
    (name) => {
      showToast(`${name} left the meeting`, { type: "leave" });
      notify("leave", "Someone left", `${name} left the meeting.`);
    },
    [showToast, notify]
  );

  const handleHandRaised = useCallback(
    (name, isRaised) => {
      if (!isRaised) return;
      showToast(`${name} raised their hand`, { type: "hand", duration: 5000 });
      notify("hand", "Hand raised", `${name} raised their hand.`);
    },
    [showToast, notify]
  );

  // Signaling/mesh only actually starts once `joined` flips to true.
  const {
    participants,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    replaceLocalTrack,
  } = useWebRTC({
    meetingId,
    userName,
    localStream: stream,
    enabled: joined,
    micOn,
    cameraOn,
    raised,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onHandRaised: handleHandRaised,
  });

  // Close the two forward references now that both sides exist.
  useEffect(() => {
    replaceTrackRef.current = replaceLocalTrack;
  }, [replaceLocalTrack]);

  useEffect(() => {
    screenShareBlockedRef.current = (message) => {
      showToast(message, { type: "info" });
      if (isScreenSharing) {
        stopScreenShare();
        setScreenStream(null);
      }
    };
  }, [showToast, isScreenSharing, stopScreenShare]);

  const chatOpen = isOpen("chat");

  const handleChatMessage = useCallback(
    (msg) => {
      // Our own message coming back off the broadcast isn't news, and if the
      // chat panel is already open the message is right there on screen.
      if (msg.sender === userName) return;
      notify("chat", `Message from ${msg.sender}`, msg.type === "file" ? "Sent a file" : msg.message);
    },
    [notify, userName]
  );

  const {
    messages,
    unreadCount,
    sendMessage,
    sendFile,
    markAsRead,
    fileError,
    typingUsers,
    sendTyping,
    readReceipts,
  } = useChat(meetingId, userName, handleChatMessage);

  const { reactions, sendReaction } = useReactions(joined ? meetingId : null);

  // Reaction notifications (Part 2B #4 — "Reaction notifications" toggle).
  // useReactions' floating emoji overlay previously had no desktop-
  // notification path at all; this adds one using the same notify() the
  // join/leave/chat/hand handlers above already use, gated by the new
  // "reaction" kind in useBrowserNotifications (which itself respects the
  // account's reactionNotifications setting via syncAccountNotificationPrefs
  // and the desktopNotifications master switch).
  const seenReactionIdsRef = useRef(new Set());
  useEffect(() => {
    for (const r of reactions) {
      if (seenReactionIdsRef.current.has(r.id)) continue;
      seenReactionIdsRef.current.add(r.id);
      if (r.tileId === "local") continue; // our own reaction isn't news
      notify("reaction", `${r.name} reacted`, r.emoji);
    }
  }, [reactions, notify]);

  const {
    isRecording,
    elapsedMs: recordingElapsedMs,
    error: recordingError,
    startRecording,
    stopRecording,
    updateTiles,
  } = useRecorder();

  // Meeting timer: starts counting the moment you actually join the call.
  useEffect(() => {
    if (!joined) return;
    const start = Date.now();
    const interval = setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => clearInterval(interval);
  }, [joined]);

  // Someone else opened the whiteboard — open ours so the drawing is
  // actually visible to everyone, matching how screen-share behaves.
  useEffect(() => {
    if (!joined) return;

    const handleOpened = () => openPanel("whiteboard");

    socket.on("whiteboard-opened", handleOpened);
    return () => socket.off("whiteboard-opened", handleOpened);
  }, [joined, openPanel]);

  // Purely presentational: track native fullscreen state so the toolbar
  // icon/label stays accurate even if the user exits with Esc.
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // Any pending "Link copied" reset must not fire into an unmounted tree.
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      roomRef.current?.requestFullscreen?.();
    }
  }, []);

  const handleLeave = useCallback(() => {
    if (isRecording) stopRecording();
    if (isScreenSharing) stopScreenShare();
    // Unmounting MeetingRoom triggers useWebRTC's and useLocalMedia's cleanup:
    // peer connections close, "leave-room" is emitted, camera/mic stop.
    navigate("/dashboard");
  }, [isRecording, stopRecording, isScreenSharing, stopScreenShare, navigate]);

  const handleCopyInviteLink = useCallback(async () => {
    const link = `${window.location.origin}/meeting/${meetingId}`;
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [meetingId]);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      setScreenStream(null);
      return;
    }
    // Front-end guard so a non-host doesn't even get the OS screen-picker
    // prompt when the host has disabled it — the server enforces this
    // too (see socket.js's "screen-share-changed" handler), this just
    // avoids the wasted permission dialog in the common case.
    if (security.screenShareDisabled && !isHost) {
      showToast("Screen sharing has been disabled by the host.", { type: "info" });
      return;
    }
    const display = await startScreenShare();
    if (display) setScreenStream(display);
  }, [
    isScreenSharing,
    stopScreenShare,
    security.screenShareDisabled,
    isHost,
    showToast,
    startScreenShare,
  ]);

  const openChat = useCallback(() => {
    if (!chatOpen) markAsRead();
    togglePanel("chat");
  }, [chatOpen, markAsRead, togglePanel]);

  const openParticipants = useCallback(() => togglePanel("participants"), [togglePanel]);
  const openWaitingRoom = useCallback(() => togglePanel("waitingRoom"), [togglePanel]);
  const openSecurity = useCallback(() => togglePanel("security"), [togglePanel]);

  const toggleWhiteboard = useCallback(() => {
    // Opening is a shared action — a drawing surface nobody else can see
    // isn't collaborative. Closing stays local, so anyone can dismiss
    // their own board without yanking it away from everyone else.
    if (!isOpen("whiteboard")) socket.emit("whiteboard-open");
    togglePanel("whiteboard");
  }, [isOpen, togglePanel]);

  // Applying a device choice: persist it, then push it onto the live stream.
  // The speaker needs no stream work at all — it's applied per <video>
  // element through the AudioOutputProvider below.
  const handleSelectDevice = useCallback(
    (kind, deviceId) => {
      if (!deviceId) return;
      if (kind === "camera") {
        select({ cameraId: deviceId });
        switchCamera(deviceId);
      } else if (kind === "microphone") {
        select({ microphoneId: deviceId });
        switchMicrophone(deviceId);
      } else {
        select({ speakerId: deviceId });
      }
    },
    [select, switchCamera, switchMicrophone]
  );

  // Voice-activity detection over every audio stream in the call. The local
  // stream is included so you can see your own speaking indicator (useful
  // for noticing you're talking while muted).
  const audioSources = useMemo(
    () => [
      { id: "local", stream, micOn },
      ...participants.map((p) => ({ id: p.id, stream: p.stream, micOn: p.micOn })),
    ],
    [stream, micOn, participants]
  );

  const { speakingIds, activeSpeakerId } = useActiveSpeaker(audioSources, joined);

  // A pinned tile that leaves the call shouldn't strand the spotlight.
  // Synced during render (React's documented "adjusting state when a prop
  // changes" pattern) instead of in a useEffect, so this doesn't trigger an
  // extra render-then-effect-then-render cycle and satisfies
  // react-hooks/set-state-in-effect. Tracking `participants` (rather than
  // `pinnedId`) as the "did something change" signal, since the whole point
  // is to react to *participants* changing out from under an existing pin.
  const [prevParticipants, setPrevParticipants] = useState(participants);
  if (participants !== prevParticipants) {
    setPrevParticipants(participants);
    if (pinnedId && pinnedId !== "local" && !participants.some((p) => p.id === pinnedId)) {
      setPinnedId(null);
    }
  }

  // Clicking the already-spotlighted tile un-pins it, handing control back
  // to automatic active-speaker tracking.
  const handlePin = useCallback(
    (id) => setPinnedId((current) => (current === id ? null : id)),
    []
  );

  // Tiles are memoized because VideoGrid and every ParticipantTile below it
  // are memo()'d: rebuilding this array on each render would defeat that and
  // re-render the whole call tree whenever the speaking set changes.
  const videoTiles = useMemo(() => {
    const forTile = (tileId) => reactions.filter((r) => r.tileId === tileId);

    return [
      {
        id: "local",
        name: userName,
        stream: isScreenSharing ? screenStream : stream,
        muted: true,
        micOn,
        cameraOn,
        raised,
        presenting: isScreenSharing,
        isLocal: true,
        isHost,
        reactions: forTile("local"),
      },
      ...participants.map((p) => ({
        id: p.id,
        name: p.name,
        stream: p.stream,
        micOn: p.micOn,
        cameraOn: p.cameraOn,
        raised: p.raised,
        presenting: p.presenting,
        isHost: p.isHost,
        reactions: forTile(p.id),
      })),
    ];
  }, [
    userName, stream, screenStream, isScreenSharing, micOn, cameraOn, raised, isHost,
    participants, reactions,
  ]);

  const peopleList = useMemo(
    () => [
      {
        id: "local",
        name: userName,
        micOn,
        cameraOn,
        raised,
        presenting: isScreenSharing,
        isLocal: true,
        isHost,
      },
      ...participants.map((p) => ({
        id: p.id,
        name: p.name,
        micOn: p.micOn,
        cameraOn: p.cameraOn,
        raised: p.raised,
        presenting: p.presenting,
        isHost: p.isHost,
      })),
    ],
    [userName, micOn, cameraOn, raised, isScreenSharing, isHost, participants]
  );

  // Keep the recorder's canvas compositor in sync with who's currently
  // visible. This must run unconditionally (before the early "not joined
  // yet" returns below) so the Hooks call order never changes between
  // renders — otherwise React throws once `joined` flips to true.
  useEffect(() => {
    updateTiles(videoTiles);
  }, [updateTiles, videoTiles]);

  // Rendered in the lobby and in-call alike, so it's built once here.
  const settingsModal = settingsOpen && (
    <Suspense fallback={null}>
      <SettingsModal
        devices={devices}
        selected={selected}
        onSelect={handleSelectDevice}
        canChooseSpeaker={canChooseSpeaker}
        stream={stream}
        micOn={micOn}
        cameraOn={cameraOn}
        switching={switching}
        error={error}
        notifications={notifications}
        onClose={() => setSettingsOpen(false)}
      />
    </Suspense>
  );

  if (waitingStatus === "passcode") {
    return (
      <PasscodeGate
        meetingId={meetingId}
        invalid={passcodeInvalid}
        onSubmit={(passcode) => requestToJoin(passcode)}
        onCancel={() => navigate("/dashboard")}
      />
    );
  }

  if (waitingStatus === "waiting" || waitingStatus === "rejected" || waitingStatus === "error") {
    return (
      <WaitingRoom
        status={waitingStatus}
        meetingId={meetingId}
        message={waitingStatus === "rejected" ? rejectMessage : waitingErrorMessage}
        onCancel={() => {
          cancelRequest();
          navigate("/dashboard");
        }}
      />
    );
  }

  if (!joined) {
    return (
      <AudioOutputProvider speakerId={selected.speakerId}>
        <PreJoinLobby
          meetingId={meetingId}
          userName={userName}
          stream={stream}
          micOn={micOn}
          cameraOn={cameraOn}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onJoin={requestToJoin}
          onOpenSettings={() => setSettingsOpen(true)}
          error={error}
        />
        {settingsModal}
      </AudioOutputProvider>
    );
  }

  const participantsOpen = isOpen("participants");
  const whiteboardOpen = isOpen("whiteboard");
  const waitingRoomOpen = isOpen("waitingRoom");
  const securityOpen = isOpen("security");

  const anyPanelOpen =
    chatOpen || participantsOpen || (waitingRoomOpen && isHost) || (securityOpen && isHost);

  // Bottom sheet on phones (capped so the video stays visible behind it),
  // docked rail on tablet/desktop.
  const panelWrapperClass = isCompact
    ? "absolute inset-x-0 bottom-0 z-40 h-[68vh] max-h-[68vh] rounded-t-2xl overflow-hidden animate-slide-up-sheet shadow-2xl shadow-black/60"
    : "w-80 lg:w-96 shrink-0 h-full";

  return (
    <AudioOutputProvider speakerId={selected.speakerId}>
    <div
      ref={roomRef}
      className="h-[100dvh] bg-surface-0 text-white flex flex-col overflow-hidden"
    >
      {/* Top bar */}
      <div
        className={`relative z-50 flex items-center justify-between gap-2 sm:gap-3 border-b border-white/8 shrink-0 glass-panel ${
          isCompact ? "px-3 py-2" : "px-4 sm:px-6 py-3"
        }`}
      >
        <BrandMark size="sm" className="hidden sm:flex" />

        <div
          className={`flex items-center gap-2 sm:gap-3 min-w-0 ${
            isCompact ? "flex-nowrap overflow-x-auto scrollbar-thin" : "flex-wrap"
          }`}
        >
          {isRecording && (
            <span className="flex items-center gap-1.5 text-red-300 text-xs sm:text-sm bg-red-500/15 border border-red-500/25 px-2.5 sm:px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC {formatDuration(recordingElapsedMs)}
            </span>
          )}

          <span className="flex items-center gap-1.5 text-slate-300 text-xs sm:text-sm">
            <Clock size={13} />
            {formatDuration(elapsedMs)}
          </span>

          <span className="hidden sm:flex items-center gap-1.5 text-slate-400 text-sm">
            <Users2 size={13} />
            {participants.length + 1}
          </span>

          {isHost && (
            <button
              onClick={openWaitingRoom}
              className={`relative flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-full transition-colors focus-ring ${
                waitingRoomOpen
                  ? "bg-amber-500/20 text-amber-200"
                  : "text-slate-300 hover:text-white bg-white/6 hover:bg-white/10"
              }`}
              title="Waiting room"
            >
              <Clock3 size={14} />
              <span className="hidden sm:inline">Waiting room</span>
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-[10px] text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-semibold shadow">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}

          {security.isLocked && (
            <span
              className="flex items-center gap-1.5 text-amber-200 text-xs sm:text-sm bg-amber-500/15 border border-amber-500/25 px-2.5 sm:px-3 py-1.5 rounded-full"
              title="This meeting is locked — no new participants can join"
            >
              <Lock size={13} />
              <span className="hidden sm:inline">Locked</span>
            </span>
          )}

          <button
            onClick={handleCopyInviteLink}
            className="flex items-center gap-1.5 text-slate-300 text-xs sm:text-sm hover:text-white bg-white/6 hover:bg-white/10 px-2.5 sm:px-3 py-1.5 rounded-full transition-colors focus-ring"
            title="Copy invite link"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span className="max-w-[8rem] sm:max-w-none truncate">
              {copied ? "Link copied" : meetingId}
            </span>
          </button>

          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 text-slate-300 text-xs sm:text-sm hover:text-white bg-white/6 hover:bg-white/10 px-2.5 sm:px-3 py-1.5 rounded-full transition-colors focus-ring"
            title="Invite people"
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">Invite</span>
          </button>

          {!isCompact && (
            <LayoutSwitcher
              mode={layoutMode}
              availableModes={availableModes}
              onChange={setLayoutMode}
            />
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center text-slate-300 hover:text-white bg-white/6 hover:bg-white/10 p-2 rounded-full transition-colors focus-ring"
            title="Settings"
          >
            <Settings size={15} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex items-center justify-center text-slate-300 hover:text-white bg-white/6 hover:bg-white/10 p-2 rounded-full transition-colors focus-ring"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {recordingError && (
        <div className="bg-red-500/15 border-b border-red-500/25 text-red-200 text-sm px-6 py-2">
          {recordingError}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`flex-1 relative overflow-hidden ${
            isCompact ? "p-2 pb-20" : "p-3 sm:p-4"
          }`}
        >
          <VideoGrid
            tiles={videoTiles}
            mode={layoutMode}
            activeSpeakerId={activeSpeakerId}
            speakingIds={speakingIds}
            pinnedId={pinnedId}
            onPin={handlePin}
          />
          {whiteboardOpen && (
            <Suspense fallback={null}>
              <Whiteboard
                meetingId={meetingId}
                active={joined}
                onClose={() => closeAllPanels()}
              />
            </Suspense>
          )}
        </div>

        {/* Side panels. On desktop/tablet they dock as a right-hand rail;
            on phones and landscape phones they become a bottom sheet
            overlaying the video, since an 80px-wide rail is unusable. Only
            one is ever open at a time (usePanels enforces that). */}
        {anyPanelOpen && (
          <>
            {isCompact && (
              // Tap-outside-to-close backdrop, mobile only.
              <div
                className="absolute inset-0 bg-black/50 z-30 animate-fade-in"
                onClick={closeAllPanels}
              />
            )}

            <div className={panelWrapperClass}>
              <Suspense fallback={<PanelFallback />}>
                {chatOpen && (
                  <ChatPanel
                    messages={messages}
                    onSend={sendMessage}
                    onSendFile={sendFile}
                    fileError={fileError}
                    onClose={closeAllPanels}
                    currentUser={userName}
                    typingUsers={typingUsers}
                    onTyping={sendTyping}
                    readReceipts={readReceipts}
                    chatDisabled={security.chatDisabled}
                    isHost={isHost}
                  />
                )}

                {participantsOpen && (
                  <ParticipantsPanel
                    participants={peopleList}
                    onClose={closeAllPanels}
                    isHost={isHost}
                    onKick={kickParticipant}
                    speakingIds={speakingIds}
                  />
                )}

                {waitingRoomOpen && isHost && (
                  <WaitingRoomPanel
                    requests={pendingRequests}
                    onApprove={approveWaiting}
                    onReject={rejectWaiting}
                    onClose={closeAllPanels}
                  />
                )}

                {securityOpen && isHost && (
                  <SecurityPanel
                    security={security}
                    onSetLocked={setLocked}
                    onSetPasscode={setPasscode}
                    onSetChatDisabled={setChatDisabled}
                    onSetScreenShareDisabled={setScreenShareDisabled}
                    onClose={closeAllPanels}
                  />
                )}
              </Suspense>
            </div>
          </>
        )}
      </div>

      <ControlBar
        micOn={micOn}
        cameraOn={cameraOn}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onLeave={handleLeave}
        onToggleChat={openChat}
        onToggleParticipants={openParticipants}
        chatOpen={chatOpen}
        participantsOpen={participantsOpen}
        unreadMessages={unreadCount}
        participantCount={participants.length + 1}
        raised={raised}
        onToggleRaiseHand={() => setRaised((r) => !r)}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={handleToggleScreenShare}
        onSendReaction={sendReaction}
        whiteboardOpen={whiteboardOpen}
        onToggleWhiteboard={toggleWhiteboard}
        isRecording={isRecording}
        onToggleRecording={isRecording ? stopRecording : startRecording}
        isHost={isHost}
        securityOpen={securityOpen}
        onToggleSecurity={openSecurity}
        isLocked={security.isLocked}
        screenShareDisabled={security.screenShareDisabled}
        compact={isCompact}
        floating={isCompact}
        layoutMode={layoutMode}
        availableLayouts={availableModes}
        onChangeLayout={setLayoutMode}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {inviteOpen && (
        <Suspense fallback={null}>
          <InviteModal
            meetingId={meetingId}
            title={`${userName}'s meeting`}
            onClose={() => setInviteOpen(false)}
          />
        </Suspense>
      )}

      {settingsModal}
    </div>
    </AudioOutputProvider>
  );
}

export default MeetingRoom;
