import { useState } from "react";
import { Video, Mic, Volume2, LayoutGrid, Presentation, Columns2, Loader2, CheckCircle2, AlertCircle, VideoOff, MicOff } from "lucide-react";

import SelectField from "../ui/SelectField";
import Toggle from "../ui/Toggle";
import useMediaDevices from "../../hooks/useMediaDevices";

const LAYOUT_OPTIONS = [
  { value: "grid", label: "Grid" },
  { value: "speaker", label: "Speaker" },
  { value: "sidebar", label: "Sidebar" },
];

const LAYOUT_ICONS = { grid: LayoutGrid, speaker: Presentation, sidebar: Columns2 };

/**
 * MeetingPreferencesCard
 * Part 2B #1/#2 — default camera/mic/speaker, join-with-camera/mic, and
 * default layout, all applied automatically the next time the person
 * enters a meeting (see MeetingRoom.jsx, which seeds useLocalMedia /
 * useMediaDevices / useLayoutMode from exactly these saved values).
 *
 * Device enumeration reuses the same useMediaDevices hook the in-meeting
 * settings modal uses — no second device-picking implementation. Because
 * this page isn't holding a live getUserMedia stream, device *labels* may
 * read as "Camera 1" / "Microphone 1" until the browser has granted a
 * media permission at least once (identical limitation the in-meeting
 * picker has before you've joined a call — see useMediaDevices.js).
 */
function MeetingPreferencesCard({ preferences, saving, error, onSave }) {
  const { devices, selected, select } = useMediaDevices(true);

  const [joinWithCamera, setJoinWithCamera] = useState(true);
  const [joinWithMicrophone, setJoinWithMicrophone] = useState(true);
  const [layout, setLayout] = useState("grid");
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Seed from the server value once it arrives. Device ids seed the shared
  // useMediaDevices selection (so this page and the meeting room agree on
  // "the" selected device) rather than a separate piece of state.
  // Synced during render (React's documented "adjusting state when a prop
  // changes" pattern) instead of in a useEffect, so this doesn't trigger an
  // extra render-then-effect-then-render cycle and satisfies
  // react-hooks/set-state-in-effect. select() is stable (useCallback with
  // empty deps), so calling it here is safe and only happens when the
  // server value itself changes.
  const [prevPreferences, setPrevPreferences] = useState(preferences);
  if (preferences !== prevPreferences) {
    setPrevPreferences(preferences);
    if (preferences) {
      select({
        cameraId: preferences.cameraId || "",
        microphoneId: preferences.microphoneId || "",
        speakerId: preferences.speakerId || "",
      });
      setJoinWithCamera(preferences.joinWithCamera !== false);
      setJoinWithMicrophone(preferences.joinWithMicrophone !== false);
      setLayout(preferences.layout || "grid");
      setDirty(false);
    }
  }

  const markDirty = (setter) => (value) => {
    setter(value);
    setDirty(true);
    setJustSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const ok = await onSave({
      cameraId: selected.cameraId,
      microphoneId: selected.microphoneId,
      speakerId: selected.speakerId,
      joinWithCamera,
      joinWithMicrophone,
      layout,
    });
    if (ok) {
      setDirty(false);
      setJustSaved(true);
    }
  };

  return (
    <div className="glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl mt-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Video size={20} className="text-indigo-400" />
        <h2 className="text-xl font-display font-bold text-white">Meeting preferences</h2>
      </div>
      <p className="text-slate-400 text-sm mb-7">
        Your default devices and how meetings start for you. Applied the next time you join a
        call.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <SelectField
          label="Default camera"
          icon={<Video size={13} />}
          value={selected.cameraId}
          options={devices.cameras}
          onChange={(value) => markDirty(select)({ cameraId: value })}
          emptyLabel="No camera found"
        />

        <SelectField
          label="Default microphone"
          icon={<Mic size={13} />}
          value={selected.microphoneId}
          options={devices.microphones}
          onChange={(value) => markDirty(select)({ microphoneId: value })}
          emptyLabel="No microphone found"
        />

        <SelectField
          label="Default speaker"
          icon={<Volume2 size={13} />}
          value={selected.speakerId}
          options={devices.speakers}
          onChange={(value) => markDirty(select)({ speakerId: value })}
          emptyLabel="No speaker found"
        />

        <div className="h-px bg-white/10" />

        <div className="-mx-1.5">
          <Toggle
            checked={joinWithCamera}
            onChange={markDirty(setJoinWithCamera)}
            label="Join with camera on"
            description="Your camera turns on automatically when you enter a meeting"
            Icon={joinWithCamera ? Video : VideoOff}
          />
          <Toggle
            checked={joinWithMicrophone}
            onChange={markDirty(setJoinWithMicrophone)}
            label="Join with microphone on"
            description="Your microphone turns on automatically when you enter a meeting"
            Icon={joinWithMicrophone ? Mic : MicOff}
          />
        </div>

        <div className="h-px bg-white/10" />

        <div>
          <span className="block text-slate-300 text-xs font-medium mb-2">Default layout</span>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUT_OPTIONS.map(({ value, label }) => {
              const Icon = LAYOUT_ICONS[value];
              const active = layout === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => markDirty(setLayout)(value)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors focus-ring ${
                    active
                      ? "bg-white/10 text-white ring-1 ring-inset ring-indigo-400/50"
                      : "bg-white/[0.03] text-slate-400 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <Icon size={17} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !dirty}
          className="btn-primary w-full py-3 rounded-xl text-sm mt-2 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : justSaved && !dirty ? (
            <>
              <CheckCircle2 size={16} />
              Saved
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Save preferences
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default MeetingPreferencesCard;
