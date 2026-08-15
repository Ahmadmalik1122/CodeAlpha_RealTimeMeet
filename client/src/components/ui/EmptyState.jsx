/**
 * EmptyState
 * Centered icon + message used when a list has nothing in it (no one
 * waiting, no search matches, no history yet).
 */
function EmptyState({ icon, title, description, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-10 ${className}`}>
      {icon && <div className="text-slate-600 mb-3">{icon}</div>}
      <p className="text-slate-400 text-sm">{title}</p>
      {description && (
        <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-[16rem]">{description}</p>
      )}
    </div>
  );
}

export default EmptyState;
