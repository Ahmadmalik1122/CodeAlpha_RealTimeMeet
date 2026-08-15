const MeetingHistory = require("../models/MeetingHistory");
const Meeting = require("../models/Meeting");

// meetingId -> _id of the currently-open ("ongoing") MeetingHistory doc for
// that room. Lets repeat joins/leaves in the same live session skip an extra
// "is there already an ongoing doc" lookup.
const activeHistoryByMeeting = new Map();

// Opens a new "ongoing" history row for a meeting the first time someone
// actually joins the live call, or returns the one already open. Never
// throws — callers treat history-tracking as best-effort.
const startOrGetHistory = async (meetingId) => {
  if (activeHistoryByMeeting.has(meetingId)) {
    return activeHistoryByMeeting.get(meetingId);
  }

  try {
    // Guard against a server restart mid-meeting leaving an "ongoing" row
    // behind with nothing in memory pointing at it.
    let doc = await MeetingHistory.findOne({ meetingId, status: "ongoing" }).sort({
      createdAt: -1,
    });

    if (!doc) {
      const meeting = await Meeting.findOne({ meetingId }).select("host title");
      if (!meeting) return null;

      doc = await MeetingHistory.create({
        meetingId,
        title: meeting.title || "Untitled Meeting",
        host: meeting.host,
        startTime: new Date(),
        status: "ongoing",
      });
    }

    activeHistoryByMeeting.set(meetingId, doc._id);
    return doc._id;
  } catch (err) {
    console.error("Failed to start/get meeting history:", err);
    return null;
  }
};

// Adds a participant to the open session's participant list, de-duplicated
// by userId (or by name for guests without an account). Safe to call once
// per "join-room" event.
const recordParticipantJoin = async (meetingId, userId, userName) => {
  try {
    const historyId = await startOrGetHistory(meetingId);
    if (!historyId) return;

    const alreadyPresent = {
      $elemMatch: userId ? { userId } : { userId: null, userName: userName || "Guest" },
    };

    await MeetingHistory.updateOne(
      { _id: historyId, participants: { $not: alreadyPresent } },
      { $push: { participants: { userId: userId || null, userName: userName || "Guest" } } }
    );
  } catch (err) {
    console.error("Failed to record participant join:", err);
  }
};

// Closes out the open session once the last participant has left the room.
// Called from socket.js's handleLeave right after it detects the in-memory
// room is empty.
const closeHistoryIfEmpty = async (meetingId) => {
  const historyId = activeHistoryByMeeting.get(meetingId);
  activeHistoryByMeeting.delete(meetingId);
  if (!historyId) return;

  try {
    const doc = await MeetingHistory.findById(historyId);
    if (!doc || doc.status === "completed") return;

    const endTime = new Date();
    doc.endTime = endTime;
    doc.duration = Math.max(0, Math.round((endTime - doc.startTime) / 1000));
    doc.status = "completed";
    await doc.save();
  } catch (err) {
    console.error("Failed to close meeting history:", err);
  }
};

module.exports = {
  recordParticipantJoin,
  closeHistoryIfEmpty,
};
