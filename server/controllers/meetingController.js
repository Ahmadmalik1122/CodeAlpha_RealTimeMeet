const Meeting = require("../models/Meeting");
const MeetingHistory = require("../models/MeetingHistory");
const { v4: uuidv4 } = require("uuid");

const createMeeting = async (req, res) => {
  try {
    const { title } = req.body;

    const meeting = await Meeting.create({
      meetingId: uuidv4(),
      title: title || "Untitled Meeting",
      host: req.user.id,
      participants: [req.user.id],
    });

    res.status(201).json({
      success: true,
      message: "Meeting Created Successfully",
      meeting,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const joinMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting Not Found",
      });
    }

    // User already joined?
    const alreadyJoined = meeting.participants.some(
      (id) => id.toString() === req.user.id
    );

    if (!alreadyJoined) {
      meeting.participants.push(req.user.id);
      await meeting.save();
    }

    res.status(200).json({
      success: true,
      message: "Joined Meeting Successfully",
      meeting,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Returns every meeting session the current user hosted or took part in,
// most recent first, shaped for the dashboard's history table.
const getMeetingHistory = async (req, res) => {
  try {
    const scope = {
      $or: [{ host: req.user.id }, { "participants.userId": req.user.id }],
    };

    const sessions = await MeetingHistory.find(scope)
      .sort({ startTime: -1 })
      .populate("host", "fullName email")
      .lean();

    const history = sessions.map((session) => ({
      id: session._id,
      meetingId: session.meetingId,
      title: session.title,
      host: session.host
        ? { id: session.host._id, fullName: session.host.fullName }
        : null,
      participantCount: session.participants.length,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      status: session.status,
    }));

    res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Deletes only the sessions visible to the current user (hosted by them or
// they participated in), so clearing history never touches other users'
// records of the same shared meetings.
const clearMeetingHistory = async (req, res) => {
  try {
    await MeetingHistory.deleteMany({
      $or: [{ host: req.user.id }, { "participants.userId": req.user.id }],
    });

    res.status(200).json({
      success: true,
      message: "Meeting history cleared",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createMeeting,
  joinMeeting,
  getMeetingHistory,
  clearMeetingHistory,
};