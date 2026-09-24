import { useSyncExternalStore } from "react";
import { getSnapshot, setThemeMode, subscribe } from "./theme-store";
import type { ThemeMode } from "./themes";

export { STORAGE_KEY } from "./theme-store";

/**
 * Reactive theme hook. Subscribes to the shared theme store, so every call
 * site re-renders when the mode changes. `applyTheme` runs inside the store,
 * not from a per-instance effect.
 */
export function useTheme() {
  const mode: ThemeMode = useSyncExternalStore(subscribe, getSnapshot);

  return {
    mode,
    setMode: setThemeMode,
    toggle: () => setThemeMode(mode === "light" ? "dark" : "light"),
  };
}