import AudioOutputContext from "./audioOutputContextValue";

export function AudioOutputProvider({ speakerId = "", children }) {
  return (
    <AudioOutputContext.Provider value={speakerId}>{children}</AudioOutputContext.Provider>
  );
}
