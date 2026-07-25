/**
 * Theme registry — wires per-theme files into the runtime.
 *
 * Token values live in `themes/<mode>.ts`. This file owns:
 *  - the registry that maps `ThemeMode → ThemeTokens`
 *  - the resolver that handles missing (un-shipped) modes
 *  - the `tokenToCssVar` map consumed by `applyTheme`
 *
 * Keep tokens themselves in `themes/`. Keep the registry thin.
 */

import { lightTheme, type ThemeMode, type ThemeTokens } from "./themes";

export const themes: Partial<Record<ThemeMode, ThemeTokens>> = {
  light: lightTheme,
  // dark: darkTheme, // ← uncomment when dark mode ships (see ./themes/dark.ts)
};

export const defaultTheme: ThemeMode = "light";

/**
 * Resolve the active theme, falling back to `light` if the requested
 * mode has not been defined yet (eg. dark mode in development).
 */
export function resolveTheme(mode: ThemeMode): ThemeTokens {
  return themes[mode] ?? lightTheme;
}

/**
 * Map from our TS token keys to the CSS variable names consumed by
 * `src/index.css` and shadcn components. Kept here so the two stay in sync.
 */
export const tokenToCssVar: Record<keyof ThemeTokens, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  border: "--border",
  input: "--input",
  ring: "--ring",
  chart1: "--chart-1",
  chart2: "--chart-2",
  chart3: "--chart-3",
  chart4: "--chart-4",
  chart5: "--chart-5",
  sidebar: "--sidebar",
  sidebarForeground: "--sidebar-foreground",
  sidebarPrimary: "--sidebar-primary",
  sidebarPrimaryForeground: "--sidebar-primary-foreground",
  sidebarAccent: "--sidebar-accent",
  sidebarAccentForeground: "--sidebar-accent-foreground",
  sidebarBorder: "--sidebar-border",
  sidebarRing: "--sidebar-ring",
  radius: "--radius",
};
