import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../socket/socket";

const DEFAULT_SECURITY = {
  isLocked: false,
  requiresPasscode: false,
  chatDisabled: false,
  screenShareDisabled: false,
};

/**
 * useMeetingSecurity
 * Host-only controls for meeting-wide security settings, plus the live
 * synced state everyone in the call reads from (lock indicator, whether
 * chat/screen-share are currently disabled). All mutation events are
 * host-gated again server-side — this hook just calls them and reflects
 * whatever the server broadcasts back on "security:state".
 *
 * Wired to: security:state, security:kicked, security:chat-blocked,
 * security:screenshare-blocked, security:set-lock, security:set-passcode,
 * security:set-chat-disabled, security:set-screenshare-disabled, security:kick
 *
 * @param {string} meetingId
 * @param {object|null} [initialSecurity] snapshot delivered with
 *        "waiting-room:approved", used as the starting state before any
 *        live "security:state" update arrives.
 * @param {() => void} [onKicked] fired when the host removes this user
 * @param {(message: string) => void} [onChatBlocked]
 * @param {(message: string) => void} [onScreenShareBlocked]
 */
export default function useMeetingSecurity({
  meetingId,
  initialSecurity,
  onKicked,
  onChatBlocked,
  onScreenShareBlocked,
}) {
  const [security, setSecurity] = useState(initialSecurity || DEFAULT_SECURITY);

  const onKickedRef = useRef(onKicked);
  const onChatBlockedRef = useRef(onChatBlocked);
  const onScreenShareBlockedRef = useRef(onScreenShareBlocked);

  useEffect(() => {
    onKickedRef.current = onKicked;
    onChatBlockedRef.current = onChatBlocked;
    onScreenShareBlockedRef.current = onScreenShareBlocked;
  }, [onKicked, onChatBlocked, onScreenShareBlocked]);

  // Seed from whatever snapshot the waiting-room hand-off gave us — only
  // meaningful the moment it first arrives (going from null -> a value).
  // Synced during render (React's documented "adjusting state when a prop
  // changes" pattern) instead of in a useEffect, so this doesn't trigger an
  // extra render-then-effect-then-render cycle and satisfies
  // react-hooks/set-state-in-effect.
  const [prevInitialSecurity, setPrevInitialSecurity] = useState(initialSecurity);
  if (initialSecurity && initialSecurity !== prevInitialSecurity) {
    setPrevInitialSecurity(initialSecurity);
    setSecurity(initialSecurity);
  }

  useEffect(() => {
    if (!meetingId) return;

    const handleState = (state) => {
      if (state) setSecurity(state);
    };

    const handleKicked = ({ message } = {}) => {
      onKickedRef.current?.(message || "You were removed from this meeting by the host.");
    };

    const handleChatBlocked = ({ message } = {}) => {
      onChatBlockedRef.current?.(message || "Chat has been disabled by the host.");
    };

    const handleScreenShareBlocked = ({ message } = {}) => {
      onScreenShareBlockedRef.current?.(message || "Screen sharing has been disabled by the host.");
    };

    socket.on("security:state", handleState);
    socket.on("security:kicked", handleKicked);
    socket.on("security:chat-blocked", handleChatBlocked);
    socket.on("security:screenshare-blocked", handleScreenShareBlocked);

    return () => {
      socket.off("security:state", handleState);
      socket.off("security:kicked", handleKicked);
      socket.off("security:chat-blocked", handleChatBlocked);
      socket.off("security:screenshare-blocked", handleScreenShareBlocked);
    };
  }, [meetingId]);

  const setLocked = useCallback(
    (locked) => {
      if (!meetingId) return;
      socket.emit("security:set-lock", { meetingId, locked });
    },
    [meetingId]
  );

  // Pass an empty string / null to remove the passcode.
  const setPasscode = useCallback(
    (passcode) => {
      if (!meetingId) return;
      socket.emit("security:set-passcode", { meetingId, passcode: passcode || "" });
    },
    [meetingId]
  );

  const setChatDisabled = useCallback(
    (disabled) => {
      if (!meetingId) return;
      socket.emit("security:set-chat-disabled", { meetingId, disabled });
    },
    [meetingId]
  );

  const setScreenShareDisabled = useCallback(
    (disabled) => {
      if (!meetingId) return;
      socket.emit("security:set-screenshare-disabled", { meetingId, disabled });
    },
    [meetingId]
  );

  const kickParticipant = useCallback(
    (socketId) => {
      if (!meetingId || !socketId) return;
      socket.emit("security:kick", { meetingId, socketId });
    },
    [meetingId]
  );

  return {
    security,
    setLocked,
    setPasscode,
    setChatDisabled,
    setScreenShareDisabled,
    kickParticipant,
  };
}
