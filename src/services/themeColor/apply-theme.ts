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

  root.dataset.theme = mode;
}
