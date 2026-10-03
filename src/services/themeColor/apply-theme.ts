import {
  defaultTheme,
  resolveTheme,
  tokenToCssVar,
} from "./theme-tokens";
import type { ThemeMode } from "./themes";

/**
 * Apply a theme by writing its tokens to `:root` as CSS custom properties.
 *
 * Idempotent. Safe to call on every render or on `prefers-color-scheme`
 * change. For a reactive hook, use `useTheme` (see `./use-theme.ts`).
 */
export function applyTheme(mode: ThemeMode = defaultTheme): void {
  if (typeof document === "undefined") return;
  const tokens = resolveTheme(mode);
  const root = document.documentElement;

  for (const key of Object.keys(tokenToCssVar) as Array<
    keyof typeof tokenToCssVar
  >) {
    root.style.setProperty(tokenToCssVar[key], tokens[key]);
  }

  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Keep native controls (scrollbar, checkbox, date input, autofill) on the
  // active scheme. Overrides the one-shot inline value from the FOUC script.
  root.style.colorScheme = mode;

  root.dataset.theme = mode;
}
