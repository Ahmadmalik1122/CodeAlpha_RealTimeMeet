import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../socket/socket";

const AUTO_DISMISS_MS = 3000;

/**
 * useReactions
 * Ephemeral floating emoji reactions (👍❤️👏😂🔥😮), broadcast to everyone
 * in the room via the "reaction" socket event. Each reaction auto-removes
 * itself after a few seconds — nothing is persisted.
 *
 * Every reaction is tagged with `tileId`, matching the same `id` used for
 * video tiles elsewhere (VideoGrid/ParticipantTile): "local" for our own
 * reaction, or the sender's socket id for everyone else's. That lets the
 * UI anchor each reaction above the sender's own video instead of showing
 * it in one generic overlay.
 */
export default function useReactions(meetingId) {
  const [reactions, setReactions] = useState([]);
  const nextId = useRef(0);
  // Every auto-dismiss timer, so unmounting mid-flight can't leave a
  // setState scheduled against a torn-down component.
  const timersRef = useRef(new Set());

  useEffect(() => {
    if (!meetingId) return;

    // Captured once up front so the cleanup below reads the same Set
    // instance it worked with all along (react-hooks/exhaustive-deps wants
    // ref reads inside a cleanup to go through a local variable, not
    // `.current` directly). timersRef's Set is never reassigned — only
    // mutated via .add/.delete/.clear — so `timers` and `timersRef.current`
    // are always the same object for the lifetime of this effect.
    const timers = timersRef.current;

    const handleReaction = ({ id: senderId, userName, emoji }) => {
      const reactionId = nextId.current++;
      const tileId = senderId === socket.id ? "local" : senderId;

      setReactions((prev) => [
        ...prev,
        { id: reactionId, tileId, senderId, name: userName, emoji },
      ]);

      const timer = setTimeout(() => {
        timers.delete(timer);
        setReactions((prev) => prev.filter((r) => r.id !== reactionId));
      }, AUTO_DISMISS_MS);
      timers.add(timer);
    };

    socket.on("reaction", handleReaction);
    return () => {
      socket.off("reaction", handleReaction);
      timers.forEach(clearTimeout);
      timers.clear();
      setReactions([]);
    };
  }, [meetingId]);

  const sendReaction = useCallback(
    (emoji) => {
      if (!meetingId) return;
      // The server broadcasts to the whole room (io.to), which includes us,
      // so our own reaction plays via the same "reaction" listener above.
      socket.emit("reaction", { emoji });
    },
    [meetingId]
  );

  return { reactions, sendReaction };
}
