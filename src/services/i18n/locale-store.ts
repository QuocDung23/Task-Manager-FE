import type { Locale } from "./types";
import { en } from "./dictionaries/en";
import { vi } from "./dictionaries/vi";

export const STORAGE_KEY = "mt-locale";

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "vi" ? "vi" : "en";
  } catch {
    return "en";
  }
}

let locale: Locale = readInitialLocale();
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Locale {
  return locale;
}

function applyLocale(next: Locale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    document.title = next === "vi" ? vi.nav.taskManager : en.nav.taskManager;
  }
}

export function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The current tab can still use the selected language without storage.
    }
  }
  applyLocale(next);
  listeners.forEach((listener) => listener());
}

applyLocale(locale);
