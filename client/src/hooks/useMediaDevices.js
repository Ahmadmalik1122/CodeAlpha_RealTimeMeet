import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "meeting:devices";

const EMPTY = { cameras: [], microphones: [], speakers: [] };

/**
 * Persisted device choice. Stored as deviceIds, which are stable per-origin
 * once the user has granted permission, so picking "Jabra headset" once
 * keeps it selected on the next call.
 */
const readStored = () => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {}; // private mode / corrupt value
  }
};

const writeStored = (value) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Non-fatal: the choice just won't survive a reload.
  }
};

/**
 * Browsers only expose device *labels* once the page holds a media
 * permission. Before that, enumerateDevices() returns entries with empty
 * labels, so we substitute a positional name rather than showing blanks.
 */
const labelFor = (device, index, fallback) =>
  device.label || `${fallback} ${index + 1}`;

/**
 * useMediaDevices
 * Enumerates the available camera / microphone / speaker devices, keeps the
 * list current as hardware is plugged in or unplugged (devicechange), and
 * owns the user's selection.
 *
 * This hook is purely about *which* device is chosen — actually applying a
 * camera/mic choice to the live stream is useLocalMedia's job, and routing
 * output to the chosen speaker is done per <video> element via setSinkId.
 *
 * @param {boolean} ready  becomes true once a media permission has been
 *        granted; labels are meaningless before then, so we wait to enumerate.
 */
export default function useMediaDevices(ready = true) {
  const [devices, setDevices] = useState(EMPTY);
  const [selected, setSelected] = useState(() => {
    const stored = readStored();
    return {
      cameraId: stored.cameraId || "",
      microphoneId: stored.microphoneId || "",
      speakerId: stored.speakerId || "",
    };
  });

  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const refresh = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;

    try {
      const list = await navigator.mediaDevices.enumerateDevices();

      const pick = (kind, fallback) =>
        list
          .filter((d) => d.kind === kind && d.deviceId)
          .map((d, i) => ({ value: d.deviceId, label: labelFor(d, i, fallback) }));

      const next = {
        cameras: pick("videoinput", "Camera"),
        microphones: pick("audioinput", "Microphone"),
        speakers: pick("audiooutput", "Speaker"),
      };

      setDevices(next);

      // If a previously-selected device has been unplugged, drop the stale
      // id so the UI shows the browser default instead of an empty select.
      setSelected((current) => {
        const stillThere = (id, options) => !id || options.some((o) => o.value === id);
        if (
          stillThere(current.cameraId, next.cameras) &&
          stillThere(current.microphoneId, next.microphones) &&
          stillThere(current.speakerId, next.speakers)
        ) {
          return current;
        }
        return {
          cameraId: stillThere(current.cameraId, next.cameras) ? current.cameraId : "",
          microphoneId: stillThere(current.microphoneId, next.microphones) ? current.microphoneId : "",
          speakerId: stillThere(current.speakerId, next.speakers) ? current.speakerId : "",
        };
      });
    } catch (err) {
      console.error("Failed to enumerate media devices:", err);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    // Deferred by one microtask rather than calling refresh() directly: the
    // direct call's setDevices/setSelected happen before its first await,
    // i.e. synchronously within this effect, which is what
    // react-hooks/set-state-in-effect flags. Deferring still runs before the
    // next paint (imperceptible), it just no longer executes inside the
    // effect's own call frame. The exported `refresh` function itself is
    // untouched, so manual calls from consumers behave exactly as before.
    queueMicrotask(() => refresh());

    const handleChange = () => refresh();
    navigator.mediaDevices.addEventListener?.("devicechange", handleChange);
    return () => {
      navigator.mediaDevices.removeEventListener?.("devicechange", handleChange);
    };
  }, [ready, refresh]);

  const select = useCallback((patch) => {
    setSelected((current) => {
      const next = { ...current, ...patch };
      writeStored(next);
      return next;
    });
  }, []);

  // Not every browser can route audio to a chosen output device — Safari and
  // Firefox notably lack setSinkId. Callers use this to explain *why* the
  // speaker picker is disabled rather than silently ignoring it.
  const canChooseSpeaker =
    typeof window !== "undefined" &&
    typeof window.HTMLMediaElement !== "undefined" &&
    typeof window.HTMLMediaElement.prototype.setSinkId === "function";

  return { devices, selected, select, refresh, canChooseSpeaker };
}
