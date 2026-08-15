import { useEffect, useRef, useState } from "react";
import { Settings, Video, Mic, Volume2, Loader2, AlertCircle, Bell } from "lucide-react";

import Modal from "../ui/Modal";
import SelectField from "../ui/SelectField";
import NotificationSettings from "./NotificationSettings";
import useAudioOutput from "../../hooks/useAudioOutput";

/**
 * MicMeter
 * Live input-level bar for the selected microphone, so the user can confirm
 * they picked the right one without having to join and ask "can you hear me".
 *
 * It builds its own tiny analyser rather than reusing useActiveSpeaker: that
 * hook is a whole-call, threshold-and-hysteresis affair returning who is
 * speaking, whereas this needs one raw continuous level for one stream.
 */
function MicMeter({ stream, micOn }) {
  const barRef = useRef(null);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    let ctx;
    let source;
    let analyser;
    let raf = null;
    let cancelled = false;

    try {
      ctx = new AudioCtx();
      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      // Not connected to ctx.destination on purpose — routing the mic to the
      // speakers here would echo the user straight back at themselves.
      source.connect(analyser);
    } catch (err) {
      console.error("Could not build the mic meter:", err);
      return;
    }

    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (cancelled) return;
      analyser.getByteTimeDomainData(data);

      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const sample = (data[i] - 128) / 128;
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / data.length);

      // Written straight to the DOM instead of through state: this runs on
      // every animation frame, and re-rendering the modal 60x a second to
      // move a bar would be wasteful.
      if (barRef.current) {
        barRef.current.style.width = `${Math.min(100, rms * 320)}%`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // already torn down
      }
      if (ctx.state !== "closed") ctx.close().catch(() => {});
    };
  }, [stream]);

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
        <div
          ref={barRef}
          className={`h-full rounded-full transition-[width] duration-75 ${
            micOn ? "aurora-bg" : "bg-white/20"
          }`}
          style={{ width: "0%" }}
        />
      </div>
      <p className="text-slate-500 text-[11px] mt-1.5">
        {micOn ? "Speak to test your microphone" : "Your microphone is muted"}
      </p>
    </div>
  );
}

/** Small camera preview so the chosen camera is verified before joining. */
function CameraPreview({ stream, cameraOn }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden bg-surface-3 ring-1 ring-white/8 flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover -scale-x-100 ${cameraOn ? "block" : "hidden"}`}
      />
      {!cameraOn && <p className="text-slate-500 text-xs">Camera is off</p>}
    </div>
  );
}

/**
 * SettingsModal
 * One dialog, two tabs — devices and notifications — mirroring how Meet and
 * Zoom consolidate every call preference behind a single gear icon rather
 * than scattering them across separate menus.
 *
 * Reachable from the pre-join lobby and from inside the call, and it is the
 * same component in both places: switching a device mid-call goes through
 * the identical code path (useLocalMedia.switchCamera/switchMicrophone,
 * which patches the live stream in place and hands the new track to
 * useWebRTC.replaceLocalTrack).
 */
const TABS = [
  { key: "devices", label: "Audio & video", Icon: Settings },
  { key: "notifications", label: "Notifications", Icon: Bell },
];

function SettingsModal({
  devices,
  selected,
  onSelect,
  canChooseSpeaker,
  stream,
  micOn,
  cameraOn,
  switching,
  error,
  notifications,
  onClose,
}) {
  const [tab, setTab] = useState("devices");

  // Applies the selected speaker to the preview element too, so the picker
  // is verifiable right here rather than only affecting other participants.
  const previewRef = useRef(null);
  useAudioOutput(previewRef);

  return (
    <Modal
      title="Settings"
      subtitle="Devices and notifications for your calls"
      icon={<Settings size={16} className="text-slate-300" />}
      onClose={onClose}
    >
      <div role="tablist" className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] mb-4">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors focus-ring ${
              tab === key ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === "devices" ? (
        <div className="space-y-4">
          <CameraPreview stream={stream} cameraOn={cameraOn} />

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-3 text-xs">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {switching && (
            <p className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 size={13} className="animate-spin" />
              Switching device...
            </p>
          )}

          <SelectField
            label="Camera"
            icon={<Video size={13} />}
            value={selected.cameraId}
            options={devices.cameras}
            disabled={switching}
            onChange={(value) => onSelect("camera", value)}
            emptyLabel="No camera found"
          />

          <div>
            <SelectField
              label="Microphone"
              icon={<Mic size={13} />}
              value={selected.microphoneId}
              options={devices.microphones}
              disabled={switching}
              onChange={(value) => onSelect("microphone", value)}
              emptyLabel="No microphone found"
            />
            <MicMeter stream={stream} micOn={micOn} />
          </div>

          <SelectField
            label="Speaker"
            icon={<Volume2 size={13} />}
            value={selected.speakerId}
            options={devices.speakers}
            disabled={!canChooseSpeaker}
            onChange={(value) => onSelect("speaker", value)}
            emptyLabel={canChooseSpeaker ? "No speaker found" : "System default"}
            hint={
              canChooseSpeaker
                ? "Applies to everyone you hear in the call."
                : "This browser can't choose an output device - audio plays through your system default."
            }
          />

          {/* Silent element that exists only so the chosen speaker can be
              applied (and any error surfaced) without leaving the modal. */}
          <audio ref={previewRef} className="hidden" />
        </div>
      ) : (
        <NotificationSettings
          supported={notifications.supported}
          permission={notifications.permission}
          onRequest={notifications.request}
          prefs={notifications.prefs}
          onSetPref={notifications.setPref}
        />
      )}
    </Modal>
  );
}

export default SettingsModal;
