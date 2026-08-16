import { useCallback, useEffect, useRef, useState } from "react";
import socket, { connectAuthenticatedSocket } from "../socket/socket";

/**
 * Waiting-room gate. The server verifies the current user from the JWT carried
 * by the Socket.IO connection; the client userId is kept as a compatibility
 * fallback for older deployments.
 */
export default function useWaitingRoom({ meetingId, userId, userName, onRequestReceived }) {
  const [status, setStatus] = useState("idle");
  const [rejectMessage, setRejectMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [passcodeInvalid, setPasscodeInvalid] = useState(false);
  const [initialSecurity, setInitialSecurity] = useState(null);
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

  const requestToJoin = useCallback(
    (passcode) => {
      if (!meetingId) return;

      setRejectMessage("");
      setErrorMessage("");
      setStatus("waiting");

      // Refresh the JWT on every join attempt. This is important after login:
      // the old socket module could connect before the token existed.
      connectAuthenticatedSocket();

      socket.emit("waiting-room:request", {
        meetingId,
        userId,
        userName,
        passcode,
      });
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
    approve: (socketId) => respond(socketId, true),
    reject: (socketId) => respond(socketId, false),
  };
}
