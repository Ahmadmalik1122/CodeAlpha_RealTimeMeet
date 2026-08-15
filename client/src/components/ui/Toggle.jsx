/**
 * Toggle
 * Switch row with an icon, label and description. Lifted out of
 * SecurityPanel so the notification preferences reuse the exact same
 * control instead of a second copy.
 */
function Toggle({ checked, onChange, label, description, Icon, disabled = false }) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-3 rounded-xl hover:bg-white/[0.03] transition-colors">
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={16} className="text-slate-300" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        {description && (
          <p className="text-slate-500 text-xs leading-snug mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        title={label}
        disabled={disabled}
        className={`relative w-10 h-6 rounded-full shrink-0 mt-1 transition-colors focus-ring ${
          disabled ? "bg-white/8 opacity-50 cursor-not-allowed" : checked ? "aurora-bg" : "bg-white/12"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default Toggle;
