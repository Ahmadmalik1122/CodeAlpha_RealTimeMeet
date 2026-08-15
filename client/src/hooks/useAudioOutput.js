import { useContext, useEffect } from "react";
import AudioOutputContext from "../context/audioOutputContextValue";

/**
 * useAudioOutput
 * Routes one media element's audio to the speaker the user chose in Device
 * Settings, via HTMLMediaElement.setSinkId.
 *
 * Only Chromium-based browsers implement setSinkId today; everywhere else
 * this is a no-op and audio keeps playing through the system default, which
 * is the correct graceful degradation (the picker is disabled in the UI in
 * that case, see useMediaDevices.canChooseSpeaker).
 *
 * @param {React.RefObject<HTMLMediaElement>} elementRef
 */
export default function useAudioOutput(elementRef) {
  const speakerId = useContext(AudioOutputContext);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !speakerId) return;
    if (typeof el.setSinkId !== "function") return;

    let cancelled = false;
    el.setSinkId(speakerId).catch((err) => {
      // Most commonly the device was unplugged between selection and here.
      if (!cancelled) console.error("Failed to set audio output device:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [elementRef, speakerId]);

  return speakerId;
}
