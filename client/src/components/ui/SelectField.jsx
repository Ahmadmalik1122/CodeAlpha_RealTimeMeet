/**
 * SelectField
 * Labelled <select> styled to match the design system's .input-field.
 *
 * Native <select> is deliberate here rather than a custom dropdown: device
 * pickers are exactly the case where the OS-native list (with its own
 * scrolling and keyboard handling) behaves better, especially on mobile.
 *
 * @param {Array<{value: string, label: string}>} options
 */
function SelectField({ label, icon, value, onChange, options = [], disabled = false, hint, emptyLabel = "No devices found" }) {
  const isEmpty = options.length === 0;

  return (
    <label className="block">
      <span className="flex items-center gap-2 text-slate-300 text-xs font-medium mb-1.5">
        {icon}
        {label}
      </span>
      <select
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || isEmpty}
        className="input-field rounded-xl px-3 py-2.5 text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isEmpty ? (
          <option value="">{emptyLabel}</option>
        ) : (
          options.map((opt) => (
            // The dark surface color is set explicitly: the option list is
            // rendered by the OS and doesn't inherit the panel's styling.
            <option key={opt.value} value={opt.value} className="bg-surface-3 text-white">
              {opt.label}
            </option>
          ))
        )}
      </select>
      {hint && <span className="block text-slate-500 text-[11px] mt-1.5 leading-snug">{hint}</span>}
    </label>
  );
}

export default SelectField;
