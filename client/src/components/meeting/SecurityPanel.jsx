import { useState } from "react";
import { Lock, Unlock, KeyRound, MessageSquareOff, ScreenShareOff, Check, Trash2 } from "lucide-react";
import PanelShell from "../ui/PanelShell";
import Toggle from "../ui/Toggle";
import IconButton from "../ui/IconButton";

/**
 * SecurityPanel
 * Host-only slide-in panel for meeting-wide security controls. Every
 * toggle here calls straight into useMeetingSecurity, which emits the
 * matching "security:set-*" event — the server re-verifies the host flag
 * on each one, so this panel is a convenience UI, not the enforcement.
 */
function SecurityPanel({
  security,
  onSetLocked,
  onSetPasscode,
  onSetChatDisabled,
  onSetScreenShareDisabled,
  onClose,
}) {
  const [passcodeInput, setPasscodeInput] = useState("");

  const handleSetPasscode = () => {
    if (!passcodeInput.trim()) return;
    onSetPasscode(passcodeInput.trim());
    setPasscodeInput("");
  };

  const handleRemovePasscode = () => {
    onSetPasscode("");
    setPasscodeInput("");
  };

  return (
    <PanelShell
      title="Security"
      icon={<Lock size={15} className="text-indigo-300" />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1">
        <Toggle
          checked={security.isLocked}
          onChange={onSetLocked}
          label={security.isLocked ? "Meeting locked" : "Lock meeting"}
          description={
            security.isLocked
              ? "No new participants can request to join."
              : "Prevent anyone new from requesting to join."
          }
          Icon={security.isLocked ? Lock : Unlock}
        />

        <div className="px-3.5 py-3">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/6 flex items-center justify-center shrink-0">
              <KeyRound size={16} className="text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">Passcode</p>
              <p className="text-slate-500 text-xs leading-snug mt-0.5">
                {security.requiresPasscode
                  ? "A passcode is required to join this meeting."
                  : "No passcode set — anyone with the link can request to join."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-12">
            <input
              type="text"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetPasscode()}
              placeholder={security.requiresPasscode ? "Set a new passcode" : "Set a passcode"}
              className="input-field flex-1 rounded-lg px-3 py-2 text-sm"
            />
            <IconButton
              onClick={handleSetPasscode}
              disabled={!passcodeInput.trim()}
              title="Save passcode"
              variant="accent"
              className="w-9 h-9 rounded-lg"
            >
              <Check size={15} className="text-white" />
            </IconButton>
            {security.requiresPasscode && (
              <IconButton
                onClick={handleRemovePasscode}
                title="Remove passcode"
                variant="subtle"
                className="w-9 h-9 rounded-lg hover:text-red-300 hover:bg-red-500/15"
              >
                <Trash2 size={15} />
              </IconButton>
            )}
          </div>
        </div>

        <div className="h-px bg-white/8 mx-3.5 my-1" />

        <Toggle
          checked={security.chatDisabled}
          onChange={onSetChatDisabled}
          label="Disable chat"
          description="Only you will be able to send messages."
          Icon={MessageSquareOff}
        />

        <Toggle
          checked={security.screenShareDisabled}
          onChange={onSetScreenShareDisabled}
          label="Disable screen sharing"
          description="Only you will be able to present your screen."
          Icon={ScreenShareOff}
        />
      </div>
    </PanelShell>
  );
}

export default SecurityPanel;
