import { Video } from "lucide-react";

/**
 * BrandMark
 * The app's wordmark + icon lockup. Reused on auth pages, the dashboard
 * header, and the meeting room top bar so the "presence ring" identity
 * stays consistent everywhere.
 */
function BrandMark({ size = "md", className = "" }) {
  const isSmall = size === "sm";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`aurora-bg rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25 ${
          isSmall ? "w-8 h-8" : "w-10 h-10"
        }`}
      >
        <Video size={isSmall ? 16 : 20} className="text-white" strokeWidth={2.25} />
      </div>
      <span
        className={`font-display font-bold tracking-tight text-white ${
          isSmall ? "text-base" : "text-xl"
        }`}
      >
        RealTime<span className="aurora-text">Meet</span>
      </span>
    </div>
  );
}

export default BrandMark;
