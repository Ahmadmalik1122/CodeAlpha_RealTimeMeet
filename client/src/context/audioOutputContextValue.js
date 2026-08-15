import { createContext } from "react";

// Holds the deviceId of the speaker/headset the user picked in Device
// Settings. Kept in its own JSX-free file so react-refresh doesn't flag the
// provider component's module (same pattern as toastContextValue.js).
//
// This is a context rather than a prop because the <video> elements that
// need it live at the very bottom of the tree (ParticipantTile), behind
// VideoGrid's four layout modes and their thumbnail/overlay wrappers —
// threading a deviceId through all of that would touch every layer for a
// value none of them care about.
const AudioOutputContext = createContext("");

export default AudioOutputContext;
