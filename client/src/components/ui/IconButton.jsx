/**
 * IconButton
 * The small round/rounded icon affordance used throughout panel headers and
 * composers (close, attach, emoji, approve/reject...). Consolidates what
 * were half a dozen near-identical hand-written button classNames.
 *
 * @param {"ghost"|"subtle"|"danger"|"accent"|"success"} variant
 * @param {"sm"|"md"|"lg"} size
 */
const VARIANTS = {
  ghost: "text-slate-400 hover:text-white hover:bg-white/8",
  subtle: "text-white bg-white/8 hover:bg-white/14",
  danger: "text-white bg-red-600 hover:bg-red-700",
  accent: "text-white aurora-bg",
  success: "text-slate-950 bg-emerald-400 hover:bg-emerald-300",
};

const SIZES = {
  sm: "p-1.5 rounded-lg",
  md: "w-9 h-9 rounded-full",
  lg: "w-11 h-11 rounded-full",
};

function IconButton({
  children,
  onClick,
  title,
  variant = "ghost",
  size = "sm",
  disabled = false,
  className = "",
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex items-center justify-center shrink-0 transition-colors focus-ring ${
        SIZES[size] || SIZES.sm
      } ${disabled ? "opacity-40 cursor-not-allowed" : VARIANTS[variant] || VARIANTS.ghost} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default IconButton;
