import { useState } from "react";
import { Sun, Moon, Monitor, Palette, Type, Globe2, Check, Loader2, AlertCircle } from "lucide-react";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
];

const ACCENT_OPTIONS = [
  { value: "indigo", label: "Indigo", swatch: "#6366f1" },
  { value: "blue", label: "Blue", swatch: "#3b82f6" },
  { value: "purple", label: "Purple", swatch: "#a855f7" },
  { value: "green", label: "Green", swatch: "#22c55e" },
];

const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

/**
 * AppearanceCard
 * Part 2B #3. Every control here applies instantly (via useTheme's
 * ThemeProvider, which patches document.documentElement's data-theme /
 * data-accent / data-font-size attributes — see index.css) and is then
 * persisted to MongoDB in the background. There's no "Save" button: each
 * click is its own optimistic update, with a small inline error + rollback
 * if the PUT fails (ThemeProvider.updateAppearance handles the rollback;
 * this component just surfaces the error).
 */
function AppearanceCard({ appearance, onChange }) {
  const [savingField, setSavingField] = useState(null);
  const [error, setError] = useState("");

  const handlePick = async (field, value) => {
    if (appearance[field] === value) return;
    setSavingField(field);
    setError("");
    try {
      await onChange({ [field]: value });
    } catch {
      setError("Couldn't save that change. Please try again.");
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl mt-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Palette size={20} className="text-indigo-400" />
        <h2 className="text-xl font-display font-bold text-white">Appearance</h2>
      </div>
      <p className="text-slate-400 text-sm mb-7">
        Changes apply immediately, no refresh needed.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl p-3.5 mb-5 animate-slide-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Theme */}
        <div>
          <span className="flex items-center gap-2 text-slate-300 text-xs font-medium mb-2">
            <Moon size={13} />
            Theme
          </span>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, Icon }) => {
              const active = appearance.theme === value;
              const isSaving = savingField === "theme";
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePick("theme", value)}
                  disabled={isSaving}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors focus-ring disabled:opacity-60 ${
                    active
                      ? "bg-white/10 text-white ring-1 ring-inset ring-indigo-400/50"
                      : "bg-white/[0.03] text-slate-400 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  {isSaving && active ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Accent color */}
        <div>
          <span className="flex items-center gap-2 text-slate-300 text-xs font-medium mb-2">
            <Palette size={13} />
            Accent color
          </span>
          <div className="grid grid-cols-4 gap-2">
            {ACCENT_OPTIONS.map(({ value, label, swatch }) => {
              const active = appearance.accentColor === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePick("accentColor", value)}
                  disabled={savingField === "accentColor"}
                  aria-pressed={active}
                  title={label}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors focus-ring disabled:opacity-60 ${
                    active
                      ? "bg-white/10 text-white ring-1 ring-inset ring-white/25"
                      : "bg-white/[0.03] text-slate-400 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: swatch }}
                  >
                    {active && <Check size={12} className="text-white" />}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Font size */}
        <div>
          <span className="flex items-center gap-2 text-slate-300 text-xs font-medium mb-2">
            <Type size={13} />
            Font size
          </span>
          <div className="grid grid-cols-3 gap-2">
            {FONT_SIZE_OPTIONS.map(({ value, label }) => {
              const active = appearance.fontSize === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePick("fontSize", value)}
                  disabled={savingField === "fontSize"}
                  aria-pressed={active}
                  className={`rounded-xl py-2.5 text-xs font-medium transition-colors focus-ring disabled:opacity-60 ${
                    active
                      ? "bg-white/10 text-white ring-1 ring-inset ring-indigo-400/50"
                      : "bg-white/[0.03] text-slate-400 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Language — English only for now, but shown as a real (disabled)
            control rather than omitted, since the spec calls for the field
            to exist even with a single option. */}
        <div>
          <span className="flex items-center gap-2 text-slate-300 text-xs font-medium mb-1.5">
            <Globe2 size={13} />
            Language
          </span>
          <select
            value="english"
            disabled
            className="input-field rounded-xl px-3 py-2.5 text-sm appearance-none opacity-70 cursor-not-allowed"
          >
            <option value="english">English</option>
          </select>
          <span className="block text-slate-500 text-[11px] mt-1.5">
            More languages aren't available yet.
          </span>
        </div>
      </div>
    </div>
  );
}

export default AppearanceCard;
