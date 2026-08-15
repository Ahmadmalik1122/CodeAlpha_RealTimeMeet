import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useLocalMedia
 * Acquires the camera/microphone once and exposes mute/unmute controls.
 * The same MediaStream instance is reused for the pre-join lobby preview
 * and for the actual call, exactly like Google Meet's "green room".
 *
 * Switching devices mid-call (switchCamera/switchMicrophone) deliberately
 * keeps that *same* MediaStream object: the new track is swapped into it
 * with removeTrack/addTrack rather than replacing the stream wholesale.
 * That matters because useWebRTC's signaling effect is keyed on the stream
 * identity — handing it a brand-new object would tear down and rebuild
 * every peer connection in the call just to change microphone.
 *
 * @param {{ cameraId?: string, microphoneId?: string, joinWithCamera?: boolean, joinWithMicrophone?: boolean }} [preferred]
 *        device ids to acquire initially (from useMediaDevices), plus the
 *        Meeting Preferences (Part 2B #1/#2 — server/models/User.js's
 *        meetingPreferences) initial enabled-state for each track. Both
 *        default to true, matching this hook's previous always-on behavior
 *        for anyone who hasn't set a preference.
 * @param {(track: MediaStreamTrack) => void} [onTrackReplaced]
 *        called with the new track after a switch, so the caller can push
 *        it onto live peer connections via RTCRtpSender.replaceTrack
 */
export default function useLocalMedia(preferred = {}, onTrackReplaced) {
  const [stream, setStream] = useState(null);
  const [micOn, setMicOn] = useState(preferred.joinWithMicrophone !== false);
  const [cameraOn, setCameraOn] = useState(preferred.joinWithCamera !== false);
  const [error, setError] = useState(null);
  const [switching, setSwitching] = useState(false);

  const streamRef = useRef(null);
  // Current enabled-state, mirrored in refs so a freshly acquired track can
  // inherit it without the switch functions depending on the state values.
  const micOnRef = useRef(micOn);
  const cameraOnRef = useRef(cameraOn);
  const onTrackReplacedRef = useRef(onTrackReplaced);

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  useEffect(() => {
    cameraOnRef.current = cameraOn;
  }, [cameraOn]);

  useEffect(() => {
    onTrackReplacedRef.current = onTrackReplaced;
  }, [onTrackReplaced]);

  // Initial acquisition only. The device ids are read once (via a ref) so
  // that later selection changes go through switchCamera/switchMicrophone,
  // which patch the existing stream instead of re-running getUserMedia for
  // the whole thing.
  const preferredRef = useRef(preferred);
  // Mirrored the same way as micOnRef/cameraOnRef/onTrackReplacedRef above:
  // assigning ref.current during render is a react-hooks/refs violation, so
  // the sync happens in an effect (no deps array — it just needs to run
  // after every render, same as reading a fresh prop each time would).
  // preferredRef.current is only ever read once, inside init()'s one-time
  // mount effect below, so this doesn't change when/what gets read.
  useEffect(() => {
    preferredRef.current = preferred;
  });

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { cameraId, microphoneId, joinWithCamera, joinWithMicrophone } =
          preferredRef.current || {};
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          // `ideal` rather than `exact`: if the remembered device is gone,
          // the browser falls back to a working default instead of throwing
          // and leaving the user with no camera at all.
          video: cameraId ? { deviceId: { ideal: cameraId } } : true,
          audio: microphoneId ? { deviceId: { ideal: microphoneId } } : true,
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Meeting Preferences (Part 2B #1/#2): the track still has to be
        // *acquired* either way (so the lobby preview/mic-meter work and a
        // later toggle-on is instant), but if the saved preference says
        // "join muted"/"join with camera off" it's disabled immediately,
        // the same way toggleMic/toggleCamera do it — never left enabled
        // for even one frame.
        if (joinWithCamera === false) {
          mediaStream.getVideoTracks().forEach((track) => {
            track.enabled = false;
          });
        }
        if (joinWithMicrophone === false) {
          mediaStream.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
      } catch (err) {
        console.error("Failed to access camera/microphone:", err);
        if (!cancelled) {
          setError(
            "Could not access camera or microphone. Please check your browser permissions."
          );
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const toggleMic = useCallback(() => {
    if (!streamRef.current) return;
    setMicOn((current) => {
      const next = !current;
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    if (!streamRef.current) return;
    setCameraOn((current) => {
      const next = !current;
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, []);

  /**
   * Swap one kind of track on the existing stream.
   * Order matters: acquire the replacement *first*, and only stop the old
   * track once the new one is in hand — stopping first would drop the user
   * off the call entirely if the new device fails to open.
   */
  const switchTrack = useCallback(async (kind, deviceId) => {
    const currentStream = streamRef.current;
    if (!currentStream || !deviceId) return false;

    const isVideo = kind === "video";
    setSwitching(true);

    let replacement = null;
    try {
      const temp = await navigator.mediaDevices.getUserMedia(
        isVideo
          ? { video: { deviceId: { exact: deviceId } } }
          : { audio: { deviceId: { exact: deviceId } } }
      );
      replacement = isVideo ? temp.getVideoTracks()[0] : temp.getAudioTracks()[0];

      if (!replacement) {
        temp.getTracks().forEach((t) => t.stop());
        setSwitching(false);
        return false;
      }

      // Carry the current mute state onto the new track, so switching mic
      // while muted doesn't silently un-mute you.
      replacement.enabled = isVideo ? cameraOnRef.current : micOnRef.current;

      const old = isVideo ? currentStream.getVideoTracks() : currentStream.getAudioTracks();
      old.forEach((track) => {
        currentStream.removeTrack(track);
        track.stop();
      });
      currentStream.addTrack(replacement);

      // Push it onto every live peer connection. Same mechanism screen
      // sharing uses, so no renegotiation is needed.
      onTrackReplacedRef.current?.(replacement);

      setError(null);
      setSwitching(false);
      return true;
    } catch (err) {
      console.error(`Failed to switch ${kind} device:`, err);
      if (replacement) replacement.stop();
      setError(
        isVideo
          ? "Could not switch to that camera. It may be in use by another app."
          : "Could not switch to that microphone. It may be in use by another app."
      );
      setSwitching(false);
      return false;
    }
  }, []);

  const switchCamera = useCallback((deviceId) => switchTrack("video", deviceId), [switchTrack]);
  const switchMicrophone = useCallback((deviceId) => switchTrack("audio", deviceId), [switchTrack]);

  return {
    stream,
    micOn,
    cameraOn,
    toggleMic,
    toggleCamera,
    error,
    switching,
    switchCamera,
    switchMicrophone,
  };
}
