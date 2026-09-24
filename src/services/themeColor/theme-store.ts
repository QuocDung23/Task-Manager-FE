import { applyTheme } from "./apply-theme";
import { defaultTheme } from "./theme-tokens";
import type { ThemeMode } from "./themes";

export const STORAGE_KEY = "mt-theme-mode";

function readInitialMode(): ThemeMode {
  if (typeof window === "undefined") return defaultTheme;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return defaultTheme;
}

let mode: ThemeMode = readInitialMode();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): ThemeMode {
  return mode;
}

export function setThemeMode(next: ThemeMode): void {
  if (next === mode) return;
  mode = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }
  applyTheme(mode);
  emit();
}

// Sync DOM (CSS vars, .dark class, color-scheme) to the resolved mode on boot.
if (typeof document !== "undefined") {
  applyTheme(mode);
}
