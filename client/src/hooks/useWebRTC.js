import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../socket/socket";
import { createPeerConnection } from "../utils/peerConnection";

/**
 * useWebRTC
 * Full mesh Native WebRTC (RTCPeerConnection) for a meeting room: every
 * participant opens a direct RTCPeerConnection to every other participant.
 * Wired to the Socket.IO signaling events exposed by the server:
 *   join-room, all-users, user-joined, sending-signal, user-signal,
 *   returning-signal, receiving-returned-signal, ice-candidate,
 *   media-state-changed, raise-hand, screen-share-changed, user-left,
 *   leave-room
 *
 * Also exposes startScreenShare/stopScreenShare, which swap the outgoing
 * video track on every existing peer connection via RTCRtpSender.replaceTrack
 * — no renegotiation needed, and remote <video> elements pick up the new
 * frames automatically since they're bound to the same MediaStream/track.
 *
 * replaceLocalTrack uses that same mechanism to push a newly selected
 * camera/microphone (see useLocalMedia's device switching) onto every live
 * peer connection, again without renegotiating.
 *
 * @param {string} meetingId
 * @param {string} userName        display name broadcast to other peers
 * @param {MediaStream} localStream local camera/mic stream (from useLocalMedia)
 * @param {boolean} enabled        only start signaling once the user has
 *                                  actually clicked "Join now" (post-lobby)
 * @param {boolean} micOn
 * @param {boolean} cameraOn
 * @param {boolean} raised         local "hand raised" state, broadcast to peers
 * @param {(name: string) => void} [onUserJoined]   fired when a remote peer joins
 * @param {(name: string) => void} [onUserLeft]      fired when a remote peer leaves
 * @param {(name: string, raised: boolean) => void} [onHandRaised] fired on any
 *        remote participant's raise/lower-hand event
 */
export default function useWebRTC({
  meetingId,
  userName,
  localStream,
  enabled,
  micOn,
  cameraOn,
  raised,
  onUserJoined,
  onUserLeft,
  onHandRaised,
}) {
  // participants: [{ id, name, stream, micOn, cameraOn, raised, presenting, isHost }]
  const [participants, setParticipants] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnectionsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const pendingCandidatesRef = useRef(new Map()); // peerId -> RTCIceCandidateInit[]
  const screenStreamRef = useRef(null);
  const localStreamRef = useRef(localStream);
  const participantsRef = useRef([]); // mirrors `participants`, readable from event handlers

  // Latest-callback refs so the join/leave/hand notification handlers below
  // always call the current function without needing to be in the main
  // effect's dependency array (which would tear down/rebuild every peer
  // connection whenever a parent re-renders with a new inline callback).
  const onUserJoinedRef = useRef(onUserJoined);
  const onUserLeftRef = useRef(onUserLeft);
  const onHandRaisedRef = useRef(onHandRaised);

  useEffect(() => {
    onUserJoinedRef.current = onUserJoined;
    onUserLeftRef.current = onUserLeft;
    onHandRaisedRef.current = onHandRaised;
  }, [onUserJoined, onUserLeft, onHandRaised]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // ---------------------------------------------------------------
  // Main signaling lifecycle
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!enabled || !meetingId || !localStream) return;

    let cancelled = false;

    const peerConnections = peerConnectionsRef.current;
    const pendingCandidates = pendingCandidatesRef.current;

    const upsertParticipant = (id, patch) => {
      setParticipants((prev) => {
        const idx = prev.findIndex((p) => p.id === id);
        if (idx === -1) {
          return [
            ...prev,
            {
              id,
              name: "Guest",
              micOn: true,
              cameraOn: true,
              raised: false,
              presenting: false,
              isHost: false,
              stream: null,
              ...patch,
            },
          ];
        }
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        return next;
      });
    };

    const removeParticipant = (id) => {
      setParticipants((prev) => {
        const leaving = prev.find((p) => p.id === id);
        if (leaving) onUserLeftRef.current?.(leaving.name);
        return prev.filter((p) => p.id !== id);
      });

      const pc = peerConnections.get(id);
      if (pc) {
        pc.close();
        peerConnections.delete(id);
      }
      pendingCandidates.delete(id);
    };

    const flushPendingCandidates = async (peerId, pc) => {
      const queued = pendingCandidates.get(peerId) || [];
      pendingCandidates.delete(peerId);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed to flush ICE candidate:", err);
        }
      }
    };

    const createPeer = (peerId, peerName) => {
      const pc = createPeerConnection();
      peerConnections.set(peerId, pc);

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Remote audio/video rendering. Note: if the remote side later swaps
      // its video track for a screen share (replaceTrack), this event does
      // NOT fire again — the existing <video srcObject={stream}> just
      // starts rendering the new track's frames automatically.
      pc.ontrack = (event) => {
        upsertParticipant(peerId, { stream: event.streams[0] });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            target: peerId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "closed"].includes(pc.connectionState)) {
          console.warn(`Peer ${peerId} connection state: ${pc.connectionState}`);
        }
      };

      upsertParticipant(peerId, { name: peerName });

      return pc;
    };

    const handleAllUsers = async (existingUsers) => {
      if (cancelled || !existingUsers) return;

      for (const {
        id,
        userName: name,
        micOn: theirMic,
        cameraOn: theirCam,
        raised: theirRaised,
        presenting: theirPresenting,
        isHost: theirIsHost,
      } of existingUsers) {
        if (cancelled) return;

        const pc = createPeer(id, name);
        upsertParticipant(id, {
          micOn: theirMic,
          cameraOn: theirCam,
          raised: theirRaised,
          presenting: theirPresenting,
          isHost: !!theirIsHost,
        });

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("sending-signal", {
            userToSignal: id,
            callerID: socket.id,
            callerName: userName,
            signal: offer,
          });
        } catch (err) {
          console.error("Failed to create/send offer:", err);
        }
      }
    };

    const handleUserJoined = ({
      id,
      userName: name,
      micOn: theirMic,
      cameraOn: theirCam,
      raised: theirRaised,
      presenting: theirPresenting,
      isHost: theirIsHost,
    }) => {
      upsertParticipant(id, {
        name,
        micOn: theirMic,
        cameraOn: theirCam,
        raised: theirRaised,
        presenting: theirPresenting,
        isHost: !!theirIsHost,
      });

      // Only remote joins fire this (handleAllUsers covers the initial
      // roster when you're the one joining), so no self-toast on entry.
      onUserJoinedRef.current?.(name);
    };

    const handleUserSignal = async ({ signal, callerID, callerName }) => {
      if (cancelled) return;

      let pc = peerConnections.get(callerID);
      if (!pc) pc = createPeer(callerID, callerName);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        await flushPendingCandidates(callerID, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("returning-signal", { callerID, signal: answer });
      } catch (err) {
        console.error("Failed to handle incoming offer:", err);
      }
    };

    const handleReceivingReturnedSignal = async ({ signal, id }) => {
      if (cancelled) return;

      const pc = peerConnections.get(id);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        await flushPendingCandidates(id, pc);
      } catch (err) {
        console.error("Failed to handle returned answer:", err);
      }
    };

    const handleIceCandidate = async ({ candidate, from }) => {
      const pc = peerConnections.get(from);
      if (!pc) return;

      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          const queue = pendingCandidates.get(from) || [];
          queue.push(candidate);
          pendingCandidates.set(from, queue);
        }
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    };

    const handleMediaStateChanged = ({ id, micOn: theirMic, cameraOn: theirCam }) => {
      upsertParticipant(id, { micOn: theirMic, cameraOn: theirCam });
    };

    const handleHandRaised = ({ id, userName: raiserName, raised: theirRaised }) => {
      upsertParticipant(id, { raised: theirRaised });
      const name = raiserName || participantsRef.current.find((p) => p.id === id)?.name || "Someone";
      onHandRaisedRef.current?.(name, theirRaised);
    };

    const handleScreenShareChanged = ({ id, presenting }) => {
      upsertParticipant(id, { presenting });
    };

    const handleUserLeft = (id) => {
      removeParticipant(id);
    };

    // Socket.IO transparently reconnects after a network blip, but the
    // server's room membership is per-socket and is gone by then: we were
    // removed from `rooms` on disconnect. Re-emitting "join-room" rebuilds
    // the roster and re-runs the whole offer/answer dance, so a dropped
    // connection recovers into a working call instead of a frozen grid.
    const handleReconnect = () => {
      peerConnections.forEach((pc) => pc.close());
      peerConnections.clear();
      pendingCandidates.clear();
      setParticipants([]);
      socket.emit("join-room", { meetingId, userName });
    };

    socket.on("all-users", handleAllUsers);
    socket.on("user-joined", handleUserJoined);
    socket.io.on("reconnect", handleReconnect);
    socket.on("user-signal", handleUserSignal);
    socket.on("receiving-returned-signal", handleReceivingReturnedSignal);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("media-state-changed", handleMediaStateChanged);
    socket.on("raise-hand", handleHandRaised);
    socket.on("screen-share-changed", handleScreenShareChanged);
    socket.on("user-left", handleUserLeft);

    socket.emit("join-room", { meetingId, userName });

    return () => {
      cancelled = true;

      socket.off("all-users", handleAllUsers);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-signal", handleUserSignal);
      socket.off("receiving-returned-signal", handleReceivingReturnedSignal);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("media-state-changed", handleMediaStateChanged);
      socket.off("raise-hand", handleHandRaised);
      socket.off("screen-share-changed", handleScreenShareChanged);
      socket.off("user-left", handleUserLeft);
      socket.io.off("reconnect", handleReconnect);

      socket.emit("leave-room");

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      peerConnections.forEach((pc) => pc.close());
      peerConnections.clear();
      pendingCandidates.clear();

      setParticipants([]);
      setIsScreenSharing(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, meetingId, localStream]);

  // ---------------------------------------------------------------
  // Broadcast my own mic/camera/raised-hand state to everyone else
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!enabled) return;
    socket.emit("media-state-changed", { micOn, cameraOn });
  }, [enabled, micOn, cameraOn]);

  useEffect(() => {
    if (!enabled) return;
    socket.emit("raise-hand", { raised });
  }, [enabled, raised]);

  // ---------------------------------------------------------------
  // Screen sharing: capture the display, swap it onto every existing
  // peer connection's outgoing video track (no renegotiation required).
  // ---------------------------------------------------------------
  /**
   * Push a freshly acquired local track (new camera / new microphone) onto
   * every live peer connection.
   *
   * While a screen share is running the video sender is deliberately left
   * alone: it currently carries the display track, and stomping it with the
   * camera would silently kill the presentation. stopScreenShare already
   * restores whatever track the local stream holds at that point, which by
   * then is the newly chosen camera.
   */
  const replaceLocalTrack = useCallback((track) => {
    if (!track) return;
    if (track.kind === "video" && screenStreamRef.current) return;

    peerConnectionsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track).catch((err) => {
          console.error("Failed to replace outgoing track:", err);
        });
      }
    });
  }, []);

  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      screenStreamRef.current = displayStream;

      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      // If the user stops sharing via the browser's own "Stop sharing" bar
      // (rather than our button), fall back to the camera automatically.
      screenTrack.onended = () => stopScreenShare();

      setIsScreenSharing(true);
      socket.emit("screen-share-changed", { presenting: true });
      return displayStream;
    } catch (err) {
      // User cancelled the picker, or permission denied — not a real error.
      console.warn("Screen share not started:", err.message);
      return null;
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack) {
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
      });
    }

    setIsScreenSharing(false);
    socket.emit("screen-share-changed", { presenting: false });
  };

  return {
    participants,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    replaceLocalTrack,
  };
}
