/**
 * ThemeContext.jsx
 *
 * Global Design Engine. Wrap the app with <ThemeProvider> and call
 * useTheme() anywhere to read or update colors, fonts, section order, etc.
 *
 * Changes made through the /admin/design UI persist to localStorage so
 * the public site reflects them immediately — no redeploy needed.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import defaultConfig from "../themeConfig.json";

const ThemeContext = createContext(null);

const LS_KEY = "s3_theme_config";

function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch {
    return defaultConfig;
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeRaw] = useState(loadSaved);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-bg",           theme.colors.background);
    root.style.setProperty("--color-surface",      theme.colors.surface);
    root.style.setProperty("--color-accent",       theme.colors.accent);
    root.style.setProperty("--color-accent-hover", theme.colors.accentHover);
    root.style.setProperty("--color-text",         theme.colors.text);
    root.style.setProperty("--color-text-muted",   theme.colors.textMuted);
    root.style.setProperty("--color-border",       theme.colors.border);
    root.style.setProperty("--font-heading",       theme.fonts.heading);
    root.style.setProperty("--font-body",          theme.fonts.body);
  }, [theme]);

  const setTheme = useCallback((partial) => {
    setThemeRaw((prev) => {
      const next = typeof partial === "function"
        ? partial(prev)
        : { ...prev, ...partial };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetTheme = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setThemeRaw(defaultConfig);
  }, []);

  /** Reorder sections by dragging names in the admin UI */
  const reorderSections = useCallback((newOrder) => {
    setTheme({ sectionOrder: newOrder });
  }, [setTheme]);

  /** Swap a single color */
  const setColor = useCallback((key, value) => {
    setTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  }, [setTheme]);

  /** Swap a font */
  const setFont = useCallback((key, value) => {
    setTheme((prev) => ({
      ...prev,
      fonts: { ...prev.fonts, [key]: value },
    }));
  }, [setTheme]);

  /** Switch site layout mode: "untitled" | "editorial" | "portfolio" */
  const setLayout = useCallback((layoutName) => {
    setTheme((prev) => ({ ...prev, layout: layoutName }));
  }, [setTheme]);

  /** Apply a complete theme object at once (used by presets + draft publish) */
  const applyFullTheme = useCallback((fullTheme) => {
    setThemeRaw(() => {
      localStorage.setItem(LS_KEY, JSON.stringify(fullTheme));
      return fullTheme;
    });
  }, []);

  /**
   * Listen for postMessage from the Design Engine admin panel.
   * When the parent iframe posts { type: "S3_THEME", theme }, apply it live.
   */
  useEffect(() => {
    function handleMessage(e) {
      if (e.data?.type === "S3_THEME" && e.data.theme) {
        applyFullTheme(e.data.theme);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [applyFullTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, resetTheme, reorderSections, setColor, setFont, setLayout, applyFullTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
