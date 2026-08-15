/**
 * AuroraBackdrop
 * Fixed, decorative gradient blobs that drift slowly behind glass auth
 * cards. Pure CSS/SVG — no external images, no network dependency.
 * `aria-hidden` because it carries no information.
 */
function AuroraBackdrop() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-[#08090d]" />
      <div
        className="absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full opacity-30 blur-[110px] animate-blob"
        style={{ backgroundColor: "#6366f1" }}
      />
      <div
        className="absolute top-1/3 -right-40 w-[36rem] h-[36rem] rounded-full opacity-25 blur-[120px] animate-blob"
        style={{ backgroundColor: "#8b5cf6", animationDelay: "-6s" }}
      />
      <div
        className="absolute -bottom-48 left-1/4 w-[30rem] h-[30rem] rounded-full opacity-20 blur-[110px] animate-blob"
        style={{ backgroundColor: "#22d3ee", animationDelay: "-11s" }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}

export default AuroraBackdrop;
