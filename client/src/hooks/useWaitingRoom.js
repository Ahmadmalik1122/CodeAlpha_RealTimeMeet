import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../socket/socket";

/**
 * useWaitingRoom
 * Host-approval gate that sits in front of the actual meeting (useWebRTC).
 * Every user — host included — asks to enter through "waiting-room:request".
 * The server is the source of truth for who the host is (it checks the
 * Meeting document in Mongo), so:
 *   - the host is let straight in ("waiting-room:approved" fires almost
 *     instantly, with isHost: true)
 *   - anyone else sits in "waiting" until the host approves or rejects them
 *
 * Wired to: waiting-room:request, waiting-room:waiting, waiting-room:approved,
 * waiting-room:rejected, waiting-room:error, waiting-room:pending-list,
 * waiting-room:respond, waiting-room:cancel
 *
 * @param {string} meetingId
 * @param {string} userId     current user's id (used server-side to verify host)
 * @param {string} userName
 * @param {(name: string) => void} [onRequestReceived] fired (host only) when
 *        a new person shows up in the pending queue
 */
export default function useWaitingRoom({ meetingId, userId, userName, onRequestReceived }) {
  // idle -> waiting -> approved | rejected | passcode (or "error" on a bad meeting id)
  const [status, setStatus] = useState("idle");
  const [rejectMessage, setRejectMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isHost, setIsHost] = useState(false);
  // Whether the last passcode attempt was a wrong guess (vs. never asked yet).
  const [passcodeInvalid, setPasscodeInvalid] = useState(false);
  // Security state as it stood the moment we were admitted. MeetingRoom
  // seeds its live security state from this; useMeetingSecurity keeps it
  // current afterwards via "security:state" broadcasts.
  const [initialSecurity, setInitialSecurity] = useState(null);

  // Host-only: everyone currently sitting in the waiting room.
  const [pendingRequests, setPendingRequests] = useState([]);

  const pendingRequestsRef = useRef(pendingRequests);
  useEffect(() => {
    pendingRequestsRef.current = pendingRequests;
  }, [pendingRequests]);

  const onRequestReceivedRef = useRef(onRequestReceived);
  useEffect(() => {
    onRequestReceivedRef.current = onRequestReceived;
  }, [onRequestReceived]);

  useEffect(() => {
    if (!meetingId) return;

    const handleWaiting = () => setStatus("waiting");

    const handleApproved = ({ isHost: hostFlag, security } = {}) => {
      setIsHost(!!hostFlag);
      setInitialSecurity(security || null);
      setStatus("approved");
    };

    const handleRejected = ({ message } = {}) => {
      setRejectMessage(message || "The host declined your request to join.");
      setStatus("rejected");
    };

    const handleError = ({ message } = {}) => {
      setErrorMessage(message || "Something went wrong. Please try again.");
      setStatus("error");
    };

    const handlePasscodeRequired = ({ invalid } = {}) => {
      setPasscodeInvalid(!!invalid);
      setStatus("passcode");
    };

    const handlePendingList = (list = []) => {
      const prevIds = new Set(pendingRequestsRef.current.map((r) => r.socketId));
      const incoming = list.find((r) => !prevIds.has(r.socketId));
      if (incoming) onRequestReceivedRef.current?.(incoming.userName);
      setPendingRequests(list);
    };

    socket.on("waiting-room:waiting", handleWaiting);
    socket.on("waiting-room:approved", handleApproved);
    socket.on("waiting-room:rejected", handleRejected);
    socket.on("waiting-room:error", handleError);
    socket.on("waiting-room:passcode-required", handlePasscodeRequired);
    socket.on("waiting-room:pending-list", handlePendingList);

    return () => {
      socket.off("waiting-room:waiting", handleWaiting);
      socket.off("waiting-room:approved", handleApproved);
      socket.off("waiting-room:rejected", handleRejected);
      socket.off("waiting-room:error", handleError);
      socket.off("waiting-room:passcode-required", handlePasscodeRequired);
      socket.off("waiting-room:pending-list", handlePendingList);
    };
  }, [meetingId]);

  // `passcode` is optional — omitted on the first attempt, then re-sent once
  // the person types one in after a "waiting-room:passcode-required" reply.
  const requestToJoin = useCallback(
    (passcode) => {
      if (!meetingId) return;
      setRejectMessage("");
      setErrorMessage("");
      setStatus("waiting");
      socket.emit("waiting-room:request", { meetingId, userId, userName, passcode });
    },
    [meetingId, userId, userName]
  );

  const cancelRequest = useCallback(() => {
    if (!meetingId) return;
    socket.emit("waiting-room:cancel", { meetingId });
    setStatus("idle");
  }, [meetingId]);

  const respond = useCallback(
    (socketId, approve) => {
      if (!meetingId || !socketId) return;
      socket.emit("waiting-room:respond", { meetingId, socketId, approve });
    },
    [meetingId]
  );

  const approve = useCallback((socketId) => respond(socketId, true), [respond]);
  const reject = useCallback((socketId) => respond(socketId, false), [respond]);

  return {
    status,
    isHost,
    rejectMessage,
    errorMessage,
    passcodeInvalid,
    initialSecurity,
    pendingRequests,
    requestToJoin,
    cancelRequest,
    approve,
    reject,
  };
}
