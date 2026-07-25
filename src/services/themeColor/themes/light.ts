import type { ThemeTokens } from "./types";

/**
 * Light theme — cool slate neutral + electric blue accent.
 *
 * Palette direction: hue 240° (cool slate), chroma < 0.01 (sub-perceptual).
 * Single saturated accent: electric blue (`#2E6BFF`, Linear's accent).
 *
 * Why this palette, not warm-paper:
 *   The previous design used warm-paper + burnt sienna + espresso. That
 *   triple is the LLM-default premium-consumer palette, banned by the
 *   design-taste skill §4.2 (second-most-recurring AI tell). This app
 *   is a B2B task-management product, not a lifestyle / artisan brand.
 *
 *   Switching to cool slate + electric blue rotates to a different
 *   family — Linear / Vercel / Reflect.app territory. The accent is
 *   saturated but used sparingly (active state, focus ring, status
 *   dot, never as gradient fill).
 *
 * Format: `oklch(L C H)` — perceptually uniform, easy to tune by hand.
 * Mirror in `src/index.css` `:root` block. Keep in sync.
 */
export const lightTheme: ThemeTokens = {
  background: "oklch(0.99 0.003 240)",
  foreground: "oklch(0.18 0.005 240)",

  card: "oklch(1 0 0)",
  cardForeground: "oklch(0.18 0.005 240)",

  popover: "oklch(1 0 0)",
  popoverForeground: "oklch(0.18 0.005 240)",

  primary: "oklch(0.20 0.005 240)",
  primaryForeground: "oklch(0.99 0.003 240)",

  secondary: "oklch(0.965 0.004 240)",
  secondaryForeground: "oklch(0.20 0.005 240)",

  muted: "oklch(0.965 0.004 240)",
  mutedForeground: "oklch(0.52 0.008 240)",

  accent: "oklch(0.55 0.20 250)",
  accentForeground: "oklch(0.99 0.003 240)",

  destructive: "oklch(0.55 0.22 27)",

  border: "oklch(0.91 0.006 240)",
  input: "oklch(0.91 0.006 240)",
  ring: "oklch(0.55 0.20 250)",

  chart1: "oklch(0.55 0.20 250)",
  chart2: "oklch(0.45 0.10 240)",
  chart3: "oklch(0.30 0.04 240)",
  chart4: "oklch(0.65 0.12 220)",
  chart5: "oklch(0.78 0.06 240)",

  sidebar: "oklch(1 0 0)",
  sidebarForeground: "oklch(0.18 0.005 240)",
  sidebarPrimary: "oklch(0.20 0.005 240)",
  sidebarPrimaryForeground: "oklch(0.99 0.003 240)",
  sidebarAccent: "oklch(0.965 0.004 240)",
  sidebarAccentForeground: "oklch(0.20 0.005 240)",
  sidebarBorder: "oklch(0.91 0.006 240)",
  sidebarRing: "oklch(0.55 0.20 250)",

  radius: "0.625rem",
};
