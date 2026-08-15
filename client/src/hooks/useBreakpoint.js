import { useEffect, useState } from "react";

/**
 * useBreakpoint
 * Single source of truth for responsive behaviour that CSS alone can't
 * express — cases where we need to change *structure*, not just styling
 * (which layout modes are offered, whether panels render as a side rail or
 * a bottom sheet, whether the control bar floats).
 *
 * Anything expressible in pure CSS should stay in Tailwind classes; this is
 * only for the structural decisions.
 *
 *   mobile:  < 640px
 *   tablet:  640px - 1023px
 *   desktop: >= 1024px
 *
 * `isShort` flags landscape phones (wide but < 500px tall), where a normal
 * stacked header + grid + control bar simply doesn't fit and the controls
 * need to overlay the video instead of taking their own row.
 */
const QUERIES = {
  mobile: "(max-width: 639px)",
  tablet: "(min-width: 640px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",
  portrait: "(orientation: portrait)",
  short: "(max-height: 500px) and (orientation: landscape)",
};

const read = () => {
  // SSR / non-browser guard — assume desktop so nothing crashes on import.
  if (typeof window === "undefined" || !window.matchMedia) {
    return { device: "desktop", isPortrait: false, isShort: false };
  }
  const m = (q) => window.matchMedia(q).matches;
  return {
    device: m(QUERIES.mobile) ? "mobile" : m(QUERIES.tablet) ? "tablet" : "desktop",
    isPortrait: m(QUERIES.portrait),
    isShort: m(QUERIES.short),
  };
};

export default function useBreakpoint() {
  const [state, setState] = useState(read);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const lists = Object.values(QUERIES).map((q) => window.matchMedia(q));
    const onChange = () => setState(read());

    lists.forEach((list) => list.addEventListener("change", onChange));
    // Rotating a phone can fire orientationchange slightly before the
    // media queries settle, so re-read on resize as a safety net.
    window.addEventListener("resize", onChange);
    onChange();

    return () => {
      lists.forEach((list) => list.removeEventListener("change", onChange));
      window.removeEventListener("resize", onChange);
    };
  }, []);

  const isMobile = state.device === "mobile";
  const isTablet = state.device === "tablet";
  const isDesktop = state.device === "desktop";

  return {
    ...state,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape: !state.isPortrait,
    // Phone-sized *or* a landscape phone: both want floating controls and
    // overlay panels rather than layout that eats vertical space.
    isCompact: isMobile || state.isShort,
  };
}
