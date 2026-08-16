const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Meeting = require("../models/Meeting");
const {
  recordParticipantJoin,
  closeHistoryIfEmpty,
} = require("../services/meetingHistoryService");

let io;

// meetingId -> Map<socketId, { userName, micOn, cameraOn, screenSharing, handRaised }>
// Using a Map (not array) so we can look participants up / remove them by id
// in O(1), which matters once a room has more than 2 people (mesh calls).
const rooms = new Map();

// meetingId -> array of whiteboard stroke/clear events, replayed in order to
// any client that joins after drawing has already started.
const whiteboardHistory = new Map();

// ===============================
// Meeting security (host controls)
// ===============================
// meetingId -> { isLocked, passcodeHash, chatDisabled, screenShareDisabled }
// This mirrors Meeting.security in Mongo. We keep a live copy here so every
// socket event (chat, screen-share, join gating) can check it synchronously
// without a DB round trip, while every mutation still writes through to
// Mongo so the settings survive a server restart / are visible to any
// REST-based reads.
const meetingSecurity = new Map();

// meetingId -> Set<userId> of people the host has kicked. Checked on
// "waiting-room:request" so a kicked user can't just rejoin. Best-effort
// only (keyed by userId, so a kicked guest with no account can still
// technically rejoin under a new session) but stops the common case.
const kickedUserIds = new Map();

const DEFAULT_SECURITY = Object.freeze({
  isLocked: false,
  passcodeHash: null,
  chatDisabled: false,
  screenShareDisabled: false,
});

// Loads (and caches) the live security state for a meeting, seeding the
// cache from Mongo on first touch.
const loadSecurity = async (meetingId) => {
  if (meetingSecurity.has(meetingId)) return meetingSecurity.get(meetingId);

  let sec = { ...DEFAULT_SECURITY };
  try {
    const meeting = await Meeting.findOne({ meetingId }).select("security");
    if (meeting?.security) {
      sec = {
        isLocked: !!meeting.security.isLocked,
        passcodeHash: meeting.security.passcodeHash || null,
        chatDisabled: !!meeting.security.chatDisabled,
        screenShareDisabled: !!meeting.security.screenShareDisabled,
      };
    }
  } catch (err) {
    console.error("Failed to load meeting security, using defaults:", err);
  }

  meetingSecurity.set(meetingId, sec);
  return sec;
};

// Never send passcodeHash to clients - only whether one is set.
const toPublicSecurity = (sec) => ({
  isLocked: !!sec.isLocked,
  requiresPasscode: !!sec.passcodeHash,
  chatDisabled: !!sec.chatDisabled,
  screenShareDisabled: !!sec.screenShareDisabled,
});

// Writes a partial patch to both the in-memory cache and Mongo.
const persistSecurity = async (meetingId, patch) => {
  const current = meetingSecurity.get(meetingId) || { ...DEFAULT_SECURITY };
  const next = { ...current, ...patch };
  meetingSecurity.set(meetingId, next);

  try {
    await Meeting.updateOne({ meetingId }, { $set: { security: next } });
  } catch (err) {
    console.error("Failed to persist meeting security:", err);
  }

  return next;
};

// ===============================
// Waiting room
// ===============================
// meetingId -> Map<socketId, { socketId, userId, userName }>
// Holds everyone who has asked to join a meeting they don't host and is
// currently waiting for the host to approve or reject them.
const pendingRequests = new Map();

// Socket.IO room name that only the verified host(s) of a meeting join, so
// pending-request updates and approve/reject broadcasts stay scoped to them.
const hostRoom = (meetingId) => `host:${meetingId}`;

const getRoom = (meetingId) => {
  if (!rooms.has(meetingId)) {
    rooms.set(meetingId, new Map());
  }
  return rooms.get(meetingId);
};

const getWhiteboardHistory = (meetingId) => {
  if (!whiteboardHistory.has(meetingId)) {
    whiteboardHistory.set(meetingId, []);
  }
  return whiteboardHistory.get(meetingId);
};

const getPendingRequests = (meetingId) => {
  if (!pendingRequests.has(meetingId)) {
    pendingRequests.set(meetingId, new Map());
  }
  return pendingRequests.get(meetingId);
};

const broadcastPendingList = (io, meetingId) => {
  const pending = Array.from(getPendingRequests(meetingId).values());
  io.to(hostRoom(meetingId)).emit("waiting-room:pending-list", pending);
};

const allowedOrigins = require("../config/corsOrigins");

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authenticate Socket.IO connections from the same JWT used by REST.
  // This prevents host detection from depending on a stale/missing client
  // userId and fixes the case where the meeting creator is incorrectly put
  // into the waiting room.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id ? String(decoded.id) : null;
      }
      next();
    } catch (error) {
      console.error("Socket JWT verification failed:", error.message);
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    // ===============================
    // Join Room (mesh: N participants)
    // ===============================
    socket.on("join-room", (payload) => {
      // Accept either a plain meetingId string (legacy) or { meetingId, userName }
      const meetingId = typeof payload === "string" ? payload : payload?.meetingId;
      const userName =
        (typeof payload === "object" && payload?.userName) || "Guest";

      if (!meetingId) return;

      socket.join(meetingId);

      const room = getRoom(meetingId);

      // Tell the newly joined user about everyone already in the room,
      // including their current mic/camera/screen-share/hand state.
      // NOTE: field names here (presenting, raised) must match exactly what
      // the client destructures in useWebRTC.js's handleAllUsers/handleUserJoined.
      const existingUsers = Array.from(room.entries()).map(([id, info]) => ({
        id,
        userName: info.userName,
        micOn: info.micOn,
        cameraOn: info.cameraOn,
        presenting: info.screenSharing,
        raised: info.handRaised,
        isHost: !!info.isHost,
      }));

      socket.emit("all-users", existingUsers);

      // Replay whiteboard history so a late joiner sees what's already drawn.
      socket.emit("whiteboard-history", getWhiteboardHistory(meetingId));

      // Register this user, then tell everyone else about them
      // socket.isHost was verified against the Meeting document back in
      // "waiting-room:request" — never a client-supplied flag. Storing it on
      // the room entry is what lets everyone else render a host badge.
      room.set(socket.id, {
        userName,
        micOn: true,
        cameraOn: true,
        screenSharing: false,
        handRaised: false,
        isHost: !!socket.isHost,
      });

      socket.to(meetingId).emit("user-joined", {
        id: socket.id,
        userName,
        micOn: true,
        cameraOn: true,
        presenting: false,
        raised: false,
        isHost: !!socket.isHost,
      });

      socket.meetingId = meetingId;
      socket.userName = userName;

      console.log(`${socket.id} (${userName}) joined room ${meetingId}`);

      // Meeting history (Mongo): best-effort, never blocks or breaks the
      // live join if it fails. socket.userId was set earlier during
      // "waiting-room:request", which every client (host included) goes
      // through before it ever reaches "join-room".
      recordParticipantJoin(meetingId, socket.userId, userName);
    });

    // ===============================
    // Waiting Room: join request
    // ===============================
    // Every client asks for entry through here first (host included). We
    // verify who the real host is by checking the Meeting document in Mongo
    // — never trust a client-supplied "isHost" flag — and either let the
    // host straight in or park everyone else in the pending queue until the
    // host approves/rejects them.
    socket.on("waiting-room:request", async ({ meetingId, userId, userName, passcode } = {}) => {
      if (!meetingId) return;

      socket.meetingId = meetingId;
      socket.userName = userName || "Guest";

      // Prefer the authenticated JWT identity. Fall back to the payload only
      // for backwards compatibility with older clients.
      const effectiveUserId = socket.userId || userId || null;
      socket.userId = effectiveUserId;

      try {
        const meeting = await Meeting.findOne({ meetingId }).select("host");

        if (!meeting) {
          socket.emit("waiting-room:error", { message: "Meeting not found." });
          return;
        }

        const isHost = !!(effectiveUserId && meeting.host.toString() === String(effectiveUserId));

        // The client socket is a long-lived singleton that can be reused
        // across multiple meetings in one browser session (leave meeting A,
        // join meeting B). Always recompute and overwrite the flag — never
        // leave a stale `true` from a previous meeting in place.
        socket.isHost = isHost;

        if (isHost) {
          if (socket.meetingId !== meetingId || !socket.rooms.has(hostRoom(meetingId))) {
            socket.join(hostRoom(meetingId));
          }
          const sec = await loadSecurity(meetingId);
          socket.emit("waiting-room:approved", { meetingId, isHost: true, security: toPublicSecurity(sec) });
          // Let a (re)connecting host immediately see whoever is already waiting.
          socket.emit("waiting-room:pending-list", Array.from(getPendingRequests(meetingId).values()));
          return;
        }

        // A previously-kicked user (tracked by userId) can't just walk back
        // in — never trust a client-supplied "let me back in" here either.
        if (effectiveUserId && kickedUserIds.get(meetingId)?.has(String(effectiveUserId))) {
          socket.emit("waiting-room:error", {
            message: "You were removed from this meeting by the host.",
          });
          return;
        }

        const sec = await loadSecurity(meetingId);

        if (sec.isLocked) {
          socket.emit("waiting-room:error", {
            message: "This meeting is locked by the host.",
          });
          return;
        }

        if (sec.passcodeHash) {
          const submitted = typeof passcode === "string" ? passcode : "";
          const valid = submitted && (await bcrypt.compare(submitted, sec.passcodeHash));

          if (!valid) {
            socket.emit("waiting-room:passcode-required", {
              meetingId,
              invalid: submitted.length > 0,
            });
            return;
          }
        }

        socket.leave(hostRoom(meetingId));

        const pending = getPendingRequests(meetingId);
        pending.set(socket.id, { socketId: socket.id, userId: effectiveUserId, userName: socket.userName });

        socket.emit("waiting-room:waiting", { meetingId });
        broadcastPendingList(io, meetingId);
      } catch (err) {
        console.error("waiting-room:request error:", err);
        socket.emit("waiting-room:error", { message: "Could not verify meeting. Please try again." });
      }
    });

    // ===============================
    // Waiting Room: host approves/rejects a pending request
    // ===============================
    socket.on("waiting-room:respond", async ({ meetingId, socketId, approve } = {}) => {
      if (!meetingId || !socketId) return;

      // Only a socket that this server itself verified as the host (above)
      // may approve or reject — this is enforced server-side, not by
      // trusting anything the client sends.
      if (!socket.isHost || socket.meetingId !== meetingId) return;

      const pending = getPendingRequests(meetingId);
      const entry = pending.get(socketId);
      if (!entry) return;

      pending.delete(socketId);

      if (approve) {
        const sec = await loadSecurity(meetingId);
        io.to(socketId).emit("waiting-room:approved", {
          meetingId,
          isHost: false,
          security: toPublicSecurity(sec),
        });
      } else {
        io.to(socketId).emit("waiting-room:rejected", {
          meetingId,
          message: "The host declined your request to join this meeting.",
        });
      }

      broadcastPendingList(io, meetingId);
    });

    // ===============================
    // Waiting Room: requester gives up before the host responds
    // ===============================
    socket.on("waiting-room:cancel", ({ meetingId } = {}) => {
      if (!meetingId) return;

      const pending = getPendingRequests(meetingId);
      if (pending.delete(socket.id)) {
        broadcastPendingList(io, meetingId);
      }
    });

    // ===============================
    // Meeting Security (host-only controls)
    // ===============================
    // Every handler below re-checks `socket.isHost && socket.meetingId ===
    // meetingId` — the same server-verified flag set in
    // "waiting-room:request" — so a non-host client emitting these events
    // directly (bypassing the UI) is a no-op, not just hidden in the UI.
    const isVerifiedHost = (meetingId) => socket.isHost && socket.meetingId === meetingId;

    socket.on("security:set-lock", async ({ meetingId, locked } = {}) => {
      if (!meetingId || !isVerifiedHost(meetingId)) return;

      const sec = await persistSecurity(meetingId, { isLocked: !!locked });
      io.to(meetingId).emit("security:state", toPublicSecurity(sec));
    });

    socket.on("security:set-passcode", async ({ meetingId, passcode } = {}) => {
      if (!meetingId || !isVerifiedHost(meetingId)) return;

      const trimmed = typeof passcode === "string" ? passcode.trim() : "";
      const passcodeHash = trimmed ? await bcrypt.hash(trimmed, 10) : null;

      const sec = await persistSecurity(meetingId, { passcodeHash });
      io.to(meetingId).emit("security:state", toPublicSecurity(sec));
    });

    socket.on("security:set-chat-disabled", async ({ meetingId, disabled } = {}) => {
      if (!meetingId || !isVerifiedHost(meetingId)) return;

      const sec = await persistSecurity(meetingId, { chatDisabled: !!disabled });
      io.to(meetingId).emit("security:state", toPublicSecurity(sec));
    });

    socket.on("security:set-screenshare-disabled", async ({ meetingId, disabled } = {}) => {
      if (!meetingId || !isVerifiedHost(meetingId)) return;

      const sec = await persistSecurity(meetingId, { screenShareDisabled: !!disabled });
      io.to(meetingId).emit("security:state", toPublicSecurity(sec));
    });

    socket.on("security:kick", ({ meetingId, socketId } = {}) => {
      if (!meetingId || !socketId || !isVerifiedHost(meetingId)) return;
      if (socketId === socket.id) return; // can't kick yourself

      const target = io.sockets.sockets.get(socketId);
      if (!target || target.meetingId !== meetingId) return;

      if (target.userId) {
        if (!kickedUserIds.has(meetingId)) kickedUserIds.set(meetingId, new Set());
        kickedUserIds.get(meetingId).add(String(target.userId));
      }

      target.emit("security:kicked", {
        message: "You were removed from this meeting by the host.",
      });

      // Drop them from the live room and let everyone else know, then
      // force-disconnect so their peer connections actually tear down
      // instead of lingering until they notice the kick event.
      handleLeave(target);
      target.disconnect(true);
    });

    // ===============================
    // WebRTC Offer (relay to a specific peer)
    // ===============================
    socket.on("sending-signal", (payload) => {
      io.to(payload.userToSignal).emit("user-signal", {
        signal: payload.signal,
        callerID: payload.callerID,
        callerName: payload.callerName,
      });
    });

    // ===============================
    // WebRTC Answer (relay back to the offerer)
    // ===============================
    socket.on("returning-signal", (payload) => {
      io.to(payload.callerID).emit("receiving-returned-signal", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    // ===============================
    // ICE Candidate (relay to a specific peer, tagged with sender)
    // ===============================
    socket.on("ice-candidate", (payload) => {
      io.to(payload.target).emit("ice-candidate", {
        candidate: payload.candidate,
        from: socket.id,
      });
    });

    // ===============================
    // Media state (mic/camera on-off) broadcast
    // ===============================
    socket.on("media-state-changed", (payload) => {
      if (!socket.meetingId) return;

      const room = rooms.get(socket.meetingId);
      if (room && room.has(socket.id)) {
        const info = room.get(socket.id);
        room.set(socket.id, {
          ...info,
          micOn: payload.micOn,
          cameraOn: payload.cameraOn,
        });
      }

      socket.to(socket.meetingId).emit("media-state-changed", {
        id: socket.id,
        micOn: payload.micOn,
        cameraOn: payload.cameraOn,
      });
    });

    // ===============================
    // Screen share status (who is currently presenting)
    // ===============================
    socket.on("screen-share-changed", async (payload) => {
      if (!socket.meetingId) return;

      // Only gate *starting* a share — always allow someone to stop, and
      // always allow the host regardless of the setting.
      if (payload.presenting && !socket.isHost) {
        const sec = await loadSecurity(socket.meetingId);
        if (sec.screenShareDisabled) {
          socket.emit("security:screenshare-blocked", {
            message: "Screen sharing has been disabled by the host.",
          });
          return;
        }
      }

      const room = rooms.get(socket.meetingId);
      if (room && room.has(socket.id)) {
        room.set(socket.id, {
          ...room.get(socket.id),
          screenSharing: payload.presenting,
        });
      }

      socket.to(socket.meetingId).emit("screen-share-changed", {
        id: socket.id,
        presenting: payload.presenting,
      });
    });

    // ===============================
    // Raise / lower hand
    // ===============================
    socket.on("raise-hand", (payload) => {
      if (!socket.meetingId) return;

      const room = rooms.get(socket.meetingId);
      if (room && room.has(socket.id)) {
        room.set(socket.id, {
          ...room.get(socket.id),
          handRaised: payload.raised,
        });
      }

      socket.to(socket.meetingId).emit("raise-hand", {
        id: socket.id,
        userName: socket.userName,
        raised: payload.raised,
      });
    });

    // ===============================
    // Emoji reactions (ephemeral, not stored)
    // ===============================
    socket.on("reaction", (payload) => {
      if (!socket.meetingId) return;

      io.to(socket.meetingId).emit("reaction", {
        id: socket.id,
        userName: socket.userName,
        emoji: payload.emoji,
      });
    });

    // ===============================
    // Whiteboard (shared drawing surface)
    // ===============================
    socket.on("whiteboard-draw", (stroke) => {
      if (!socket.meetingId) return;

      const history = getWhiteboardHistory(socket.meetingId);
      history.push({ type: "stroke", ...stroke });
      // Keep memory bounded for long sessions.
      if (history.length > 5000) history.shift();

      socket.to(socket.meetingId).emit("whiteboard-draw", stroke);
    });

    // Opening the whiteboard is a shared action: the drawing surface is
    // useless if only the person who opened it can see it. Tell everyone
    // else to open theirs too.
    socket.on("whiteboard-open", () => {
      if (!socket.meetingId) return;
      socket.to(socket.meetingId).emit("whiteboard-opened");
    });

    // The board's socket listeners only exist while the panel is mounted, so
    // a late opener has missed every "whiteboard-draw" broadcast so far.
    // They ask for the accumulated history on open and replay it.
    socket.on("whiteboard-request-history", () => {
      if (!socket.meetingId) return;
      socket.emit("whiteboard-history", getWhiteboardHistory(socket.meetingId));
    });

    socket.on("whiteboard-clear", () => {
      if (!socket.meetingId) return;

      whiteboardHistory.set(socket.meetingId, []);
      io.to(socket.meetingId).emit("whiteboard-clear");
    });

    // Undo: drop every segment belonging to one stroke (identified by the
    // strokeId the drawing client tagged each segment with) and send the
    // resulting history to everyone so all boards redraw in lockstep —
    // far simpler and drift-proof than trying to "erase" a stroke in place.
    socket.on("whiteboard-undo", (payload) => {
      if (!socket.meetingId || !payload?.strokeId) return;

      const history = getWhiteboardHistory(socket.meetingId);
      const filtered = history.filter((seg) => seg.strokeId !== payload.strokeId);
      whiteboardHistory.set(socket.meetingId, filtered);

      io.to(socket.meetingId).emit("whiteboard-redraw", filtered);
    });

    // Redo: re-append the previously-undone stroke's segments (the client
    // that undid it kept a local copy) and broadcast the updated history.
    socket.on("whiteboard-redo", (payload) => {
      if (!socket.meetingId || !Array.isArray(payload?.segments)) return;

      const history = getWhiteboardHistory(socket.meetingId);
      payload.segments.forEach((seg) => history.push({ type: "stroke", ...seg }));
      if (history.length > 5000) history.splice(0, history.length - 5000);

      io.to(socket.meetingId).emit("whiteboard-redraw", history);
    });

    // ===============================
    // Chat (text + optional file attachment)
    // ===============================
    socket.on("send-message", async (data) => {
      if (!data?.meetingId) return;

      if (!socket.isHost) {
        const sec = await loadSecurity(data.meetingId);
        if (sec.chatDisabled) {
          socket.emit("security:chat-blocked", {
            message: "Chat has been disabled by the host.",
          });
          return;
        }
      }

      io.to(data.meetingId).emit("receive-message", data);
    });

    // Typing indicator — ephemeral, never stored, just relayed to everyone
    // else currently in the room.
    socket.on("typing", (payload) => {
      if (!socket.meetingId) return;

      socket.to(socket.meetingId).emit("typing", {
        id: socket.id,
        userName: socket.userName,
        isTyping: !!payload?.isTyping,
      });
    });

    // Read receipts — a client reports "I've seen messages up to time X";
    // everyone else uses that to decide whether their own sent messages
    // show as seen. Not persisted: purely a live presence signal.
    socket.on("chat-read", (payload) => {
      if (!socket.meetingId) return;

      socket.to(socket.meetingId).emit("chat-read", {
        id: socket.id,
        userName: socket.userName,
        at: payload?.at || Date.now(),
      });
    });

    // ===============================
    // Explicit leave (navigating back to dashboard without closing the tab)
    // ===============================
    socket.on("leave-room", () => {
      handleLeave(socket);
    });

    // ===============================
    // Disconnect
    // ===============================
    socket.on("disconnect", () => {
      console.log("🔴 Disconnected:", socket.id);
      handleLeave(socket);
    });
  });

  return io;
};

function handleLeave(socket) {
  const meetingId = socket.meetingId;
  if (!meetingId) return;

  if (socket.isHost) {
    socket.leave(hostRoom(meetingId));
    socket.isHost = false;
  }

  // If this socket was still sitting in the waiting room (never admitted to
  // the actual meeting), drop its pending request and let the host know.
  if (pendingRequests.has(meetingId)) {
    const pending = pendingRequests.get(meetingId);
    if (pending.delete(socket.id)) {
      broadcastPendingList(io, meetingId);
    }
    if (pending.size === 0) {
      pendingRequests.delete(meetingId);
    }
  }

  if (!rooms.has(meetingId)) {
    socket.meetingId = null;
    return;
  }

  const room = rooms.get(meetingId);
  room.delete(socket.id);

  socket.to(meetingId).emit("user-left", socket.id);

  if (room.size === 0) {
    rooms.delete(meetingId);
    whiteboardHistory.delete(meetingId);
    pendingRequests.delete(meetingId);
    // Security settings themselves live in Mongo and survive this; drop
    // just the in-memory cache/kick-list so a fresh session reloads clean.
    meetingSecurity.delete(meetingId);
    kickedUserIds.delete(meetingId);
    // Meeting history: the last participant just left, so close out this
    // session's history row (sets endTime/duration/status). Best-effort,
    // same as recordParticipantJoin above.
    closeHistoryIfEmpty(meetingId);
  }

  socket.meetingId = null;
}

module.exports = {
  initializeSocket,
};
