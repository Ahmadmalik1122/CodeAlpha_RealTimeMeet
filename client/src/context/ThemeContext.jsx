import { useCallback, useEffect, useRef, useState } from "react";
import ThemeContext from "./themeContextValue";
import API from "../services/api";

const STORAGE_KEY = "appearance:settings";

const DEFAULT_APPEARANCE = {
  theme: "dark",
  accentColor: "indigo",
  fontSize: "medium",
  language: "english",
};

const THEMES = ["dark", "light", "system"];
const ACCENTS = ["indigo", "blue", "purple", "green"];
const FONT_SIZES = ["small", "medium", "large"];

const readCached = () => {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return saved ? { ...DEFAULT_APPEARANCE, ...saved } : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE; // private mode / corrupt value
  }
};

const writeCached = (value) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Non-fatal: appearance just won't survive a reload until the next
    // successful server fetch.
  }
};

const sanitize = (value) => ({
  theme: THEMES.includes(value?.theme) ? value.theme : DEFAULT_APPEARANCE.theme,
  accentColor: ACCENTS.includes(value?.accentColor)
    ? value.accentColor
    : DEFAULT_APPEARANCE.accentColor,
  fontSize: FONT_SIZES.includes(value?.fontSize) ? value.fontSize : DEFAULT_APPEARANCE.fontSize,
  language: "english",
});

/**
 * Applies the resolved appearance to the document root as data-attributes.
 * index.css keys its light-theme / accent / font-size overrides off exactly
 * these attributes (see the "APPEARANCE (Part 2B)" section there), so this
 * is the one place that ever needs to know how theming is implemented.
 */
const applyToDocument = (appearance, systemPrefersDark) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const effective =
    appearance.theme === "system" ? (systemPrefersDark ? "dark" : "light") : appearance.theme;

  root.setAttribute("data-theme", effective);
  root.setAttribute("data-accent", appearance.accentColor);
  root.setAttribute("data-font-size", appearance.fontSize);
  root.style.colorScheme = effective;
};

/**
 * ThemeProvider
 * Owns Appearance Settings (Part 2B #3): theme / accent / font size /
 * language. There was no existing theme system to extend (the app is a
 * single hardcoded dark design — see index.css), so this is a new context,
 * but it works *with* that existing design system rather than replacing it:
 * it toggles the same CSS custom properties index.css already defines,
 * scoped under data-theme/data-accent/data-font-size attributes, instead of
 * inventing a parallel styling mechanism.
 *
 * Applies instantly on every change (no page reload) and persists to
 * MongoDB via PUT /api/users/preferences. A localStorage cache is used only
 * to paint the *last known* appearance immediately on load (avoiding a
 * flash of default-dark before the authenticated fetch resolves) — Mongo
 * remains the source of truth once a user is signed in.
 */
export function ThemeProvider({ children }) {
  const [appearance, setAppearance] = useState(() => sanitize(readCached()));
  const [loaded, setLoaded] = useState(false);

  const systemPrefersDarkRef = useRef(
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true
  );

  // Apply immediately on every render of `appearance` (mount included), so
  // the cached value paints before the network fetch below even starts.
  useEffect(() => {
    applyToDocument(appearance, systemPrefersDarkRef.current);
  }, [appearance]);

  // Keep a "system" theme live-updating if the OS preference changes while
  // the app is open, without needing a reload.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      systemPrefersDarkRef.current = e.matches;
      if (appearance.theme === "system") {
        applyToDocument(appearance, e.matches);
      }
    };
    mq.addEventListener?.("change", handleChange);
    return () => mq.removeEventListener?.("change", handleChange);
  }, [appearance]);

  // Fetch the account's saved appearance once there's a token. Only ever
  // overwrites local state with what the server actually has — logged-out
  // visitors just keep the cached/default appearance.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoaded(true);
        return;
      }
      try {
        const { data } = await API.get("/users/preferences");
        if (cancelled) return;
        const next = sanitize(data.appearanceSettings);
        setAppearance(next);
        writeCached(next);
      } catch (err) {
        // Non-fatal: keep whatever was cached/default. Settings.jsx surfaces
        // its own load error for the rest of the page; appearance quietly
        // falls back rather than blocking the whole app from rendering.
        console.error("Failed to load appearance settings:", err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Optimistic update: applies + caches instantly, then persists. Returns
  // the promise so callers (AppearanceCard via Settings.jsx) can show a
  // saving/error state and roll back on failure.
  const updateAppearance = useCallback(
    async (patch) => {
      const previous = appearance;
      const next = sanitize({ ...appearance, ...patch });
      setAppearance(next);
      writeCached(next);

      try {
        await API.put("/users/preferences", { appearanceSettings: patch });
        return next;
      } catch (err) {
        setAppearance(previous);
        writeCached(previous);
        throw err;
      }
    },
    [appearance]
  );

  return (
    <ThemeContext.Provider value={{ appearance, loaded, updateAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
}
