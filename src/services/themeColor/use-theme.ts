import { useEffect, useState } from "react";
import { applyTheme } from "./apply-theme";
import { defaultTheme } from "./theme-tokens";
import type { ThemeMode } from "./themes";

const STORAGE_KEY = "mt-theme-mode";

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return defaultTheme;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return defaultTheme;
}

/**
 * Reactive theme hook. Reads/writes `localStorage`, syncs to `<html>`,
 * and re-applies tokens on every change.
 *
 * Dark mode will light up automatically once a `dark` record is added to
 * `themes` in `./theme-tokens.ts` and the union type is widened.
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);

  useEffect(() => {
    applyTheme(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  return {
    mode,
    setMode,
    toggle: () => setMode((m: ThemeMode) => (m === "light" ? "dark" : "light")),
  };
}
