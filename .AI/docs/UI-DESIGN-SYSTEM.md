# MT Design System — Frontend Conventions

> Living document. Every UI shipped in `FE/src/` should follow these rules.
> Synthesised from the `design-taste-frontend` and `high-end-visual-design` skills.

---

## 0. Design Read (one-line)

**Internal task-manager workspace for engineering & PM users, calm premium-consumer aesthetic (Linear + Apple), leaning on Tailwind v4 + Framer Motion + Radix primitives + Geist Variable.**

| Dial | Value | Why |
|---|---|---|
| `DESIGN_VARIANCE` | **6** | Calm but not symmetrical — asymmetric cards, intentional whitespace |
| `MOTION_INTENSITY` | **5** | Spring physics on interaction, no scroll-hijack, no parallax |
| `VISUAL_DENSITY` | **4** | Daily-app rhythm — `py-12` to `py-16` between sections, breathing room |

---

## 1. Stack — Locked

| Layer | Tool | Pinned in `package.json` |
|---|---|---|
| Framework | React 19 + Vite (RSC not used) | `react@19.2.4` |
| Styling | Tailwind v4 (`@tailwindcss/vite`) | `tailwindcss@4.2.2` |
| Motion | **Framer Motion** (`motion/react` preferred in new code; `framer-motion` works as legacy) | `framer-motion@12.38.0` |
| Icons | **Phosphor (`@phosphor-icons/react`)** — primary | `2.1.10` |
| Icons | `lucide-react` — only when an icon is missing in Phosphor | `1.8.0` |
| Font | **Geist Variable** (`@fontsource-variable/geist`) | `5.2.8` |
| Components | shadcn/ui + Radix primitives | `radix-ui@1.4.3` |
| Routing | `react-router-dom` | `7.14.1` |
| State | Zustand (global) + `useState` (local) | `zustand@5.0.12` |
| Forms | `react-hook-form` + `zod` | — |
| Data | `@tanstack/react-query` | `5.99.0` |

**Hard rules:**

- **Never** mix Phosphor + Lucide in the same component tree. Pick one family per surface.
- **Never** swap fonts. Geist Variable is the only sans-serif font in the project.
- **Never** install another CSS framework. Tailwind v4 only.

---

## 2. Color Tokens

We use the shadcn-style `oklch` tokens defined in `src/index.css`. **Do not hard-code hex.**

### 2.1 Light theme (default)

### 2.1 Light theme (default) — cool slate + electric blue

Palette direction: hue 240° (cool slate), chroma < 0.01 (sub-perceptual). Single
saturated accent: electric blue `#2E6BFF` (Linear / Vercel / Reflect.app territory).

**Why this is NOT warm-paper + burnt sienna + espresso** (previous attempt):
that triple is the LLM-default premium-consumer palette, banned by the
design-taste skill §4.2 (second-most-recurring AI tell). It is suitable for
lifestyle / artisan / cookware / wellness brands, NOT for a B2B task-management
product. Switching to cool slate rotates to a different family entirely.

Tokens live in `src/services/themeColor/themes/<mode>.ts` (one file per mode)
and are mirrored in `src/index.css`. The registry (`theme-tokens.ts`) wires
the files together. Edit the mode file, then update the CSS `:root` / `.dark`
blocks to match.

| Token | oklch | Hex equivalent | Use |
|---|---|---|---|
| `--background` | `oklch(0.99 0.003 240)` | `#F7F8FA` | Page background (cool off-white, slate-tinted) |
| `--foreground` | `oklch(0.18 0.005 240)` | `#1F2227` | Primary text (cool off-black) |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | Card surface |
| `--card-foreground` | `oklch(0.18 0.005 240)` | — | Card text |
| `--popover` | `oklch(1 0 0)` | — | Popover surface |
| `--primary` | `oklch(0.20 0.005 240)` | `#22262C` | Inverse surface (active pagination, dark CTA) |
| `--primary-foreground` | `oklch(0.99 0.003 240)` | — | Text on `--primary` |
| `--muted` | `oklch(0.965 0.004 240)` | `#EFF1F4` | Muted surfaces |
| `--muted-foreground` | `oklch(0.52 0.008 240)` | `#7A7F88` | Secondary text |
| `--border` | `oklch(0.91 0.006 240)` | `#DDE1E6` | Hairline borders (cool) |
| `--accent` | `oklch(0.55 0.20 250)` | `#2E6BFF` | Single accent (electric blue) |
| `--accent-foreground` | `oklch(0.99 0.003 240)` | — | Text on `--accent` |
| `--destructive` | `oklch(0.55 0.22 27)` | `#D93025` | Error / destructive (true red, not rust) |
| `--sidebar` | `oklch(1 0 0)` | — | Sidebar background |
| `--ring` | `oklch(0.55 0.20 250)` | — | Focus ring (uses accent) |

### 2.2 Accent (locked)

The only allowed accent is **electric blue** (`#2E6BFF`, `--accent`). One accent
per page, used identically across all sections, including:
- Active pagination pill (background)
- Active nav indicator (focus ring + dot)
- Status dot in header eyebrow
- Form focus rings
- Button focus states

The blue is saturated but used sparingly — never as gradient fill, never as
large background block. Pair it with white surfaces and cool neutrals.

**Anti-default check:** the previous palette used burnt sienna (`#A85F2B`)
and warm cream (`#FBF8F3`). Those hex values are inside the banned
premium-consumer families (warm paper / brass / oxblood / espresso) per
design-taste §4.2. Rotate away from that family whenever a B2B / utility
brief lands.

### 2.3 Disabled AI tells

- ❌ Beige + brass + oxblood + espresso (premium-consumer AI default) — banned.
- ❌ AI-purple / Lila gradients — banned.
- ❌ Pure `#000000` / `#ffffff` — use `oklch(0.18 0.005 240)` and `oklch(0.99 0.003 240)`.
- ❌ Warm-tinted shadows on cool surfaces (tint shadows to background hue).
- ❌ Mixed icon families in the same component tree (pick Phosphor OR Lucide).

### 2.4 Dark mode (forward-compatible)

The theme service is structured so dark mode is a one-line change:

1. Add a `darkTheme: ThemeTokens` record to `src/services/themeColor/themes/dark.ts`.
2. Add `dark: darkTheme` to the `themes` object.
3. Wire a toggle in the user menu via `useTheme()` (already implemented).

Starter dark tokens are pre-mirrored in the `.dark` block of `src/index.css` so
previewing dark mode during development does not require a JS round-trip. Dark
mode keeps the same hue family (240°, electric blue accent desaturated to
`#7C9CFF` for AAA contrast on dark surfaces). Keep the CSS mirror in sync
with the TS record.

### 2.4 Dark mode (forward-compatible)

The theme service is structured so dark mode is a one-line change:

1. Add a `darkTheme: ThemeTokens` record to `src/services/themeColor/theme-tokens.ts`.
2. Add `dark: darkTheme` to the `themes` object.
3. Wire a toggle in the user menu via `useTheme()` (already implemented).

Starter dark tokens are pre-mirrored in the `.dark` block of `src/index.css` so
previewing dark mode during development does not require a JS round-trip. Keep
the CSS mirror in sync with the TS record.

### 2.5 Theme service contract

```ts
import { useTheme, applyTheme, lightTheme, defaultTheme } from "@/services/themeColor";

// In a component
const { mode, setMode, toggle } = useTheme();

// Imperatively (eg. inside an effect that watches `prefers-color-scheme`)
applyTheme("dark");
```

The runtime hook writes to `document.documentElement.style` and persists the
choice in `localStorage` under the key `mt-theme-mode`.

---

## 3. Typography

### 3.1 Font stack

```css
--font-sans: 'Geist Variable', sans-serif;
--font-heading: var(--font-sans); /* same family — never mix */
```

### 3.2 Scale

| Role | Classes | Use |
|---|---|---|
| Display (page H2) | `text-[40px] md:text-[52px] font-semibold leading-[1.05] tracking-[-0.025em]` | `header-layout.tsx` |
| Eyebrow | `text-[10.5px] font-medium uppercase tracking-[0.22em]` | Above section heads, max 1 per 3 sections |
| Section title | `text-base font-medium` | Sidebar items |
| Body | `text-[13.5px] leading-relaxed text-zinc-500` | descriptions |
| Numeric | `tabular-nums` | Pagination, counters, metrics |

### 3.3 Hard rules

- ❌ **No em-dash (`—`) anywhere.** Use ` - `, a period, or a comma. This is the #1 LLM tell.
- ❌ **No `Inter` as default.** Geist is the lock.
- ❌ **No serif fonts.** Editorial-luxury path is not open by default.
- ✅ Same-family italic-only emphasis. Never inject a different-family word into a headline.

---

## 4. Radius System (Shape Consistency Lock)

ONE scale, applied everywhere:

| Element | Radius | Tailwind |
|---|---|---|
| Buttons (primary / nav / pagination) | full pill | `rounded-full` |
| Sidebar inner container | `1.5rem` | `rounded-3xl` |
| Sidebar nav items | `0.85rem` | `rounded-[0.85rem]` |
| Cards (project list) | `1rem` | `rounded-2xl` |
| Page header underline | `9999px` | `rounded-full` |
| Icon wells inside buttons | full | `rounded-full` |

**Rule:** if you need a new radius, justify it in code. Mixed systems are broken design.

---

## 5. Shadow & Elevation System

We use **inner-only + tinted** shadows. Never raw black drop shadows.

| Token | CSS | Use |
|---|---|---|
| Hairline highlight | `shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]` | Glass surfaces, cards (top edge) |
| Soft ambient | `shadow-[0_24px_60px_-30px_rgba(15,23,42,0.18)]` | Floating glass elements |
| Active state | `shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]` | Selected pagination, dark CTAs |
| Card hover lift | `shadow-[0_18px_50px_-20px_rgba(15,23,42,0.25)]` | Project card hover |

**Tinting rule:** shadows always inherit the page hue (slate-950 → near-black, not pitch-black).

---

## 6. Motion Choreography

### 6.1 The vault of easing curves

```ts
// Custom — used for everything except spring layouts
export const EASE_FLUID = [0.32, 0.72, 0, 1] as const;

// Tailwind class — equivalent
// ease-[cubic-bezier(0.32,0.72,0,1)]
```

**Banned:** `ease-in-out`, `ease-linear`, `transition-all duration-300` (default).

### 6.2 Spring presets

```ts
// Layout-id shared-element transitions (pagination, sidebar active)
{ type: "spring", stiffness: 380, damping: 30 }

// Interactive press (buttons, items)
{ type: "spring", stiffness: 420, damping: 28 }

// Magnetic hover
{ type: "spring", stiffness: 500, damping: 28 }
```

### 6.3 Entrance recipes

| Element | Recipe |
|---|---|
| Headline | `opacity: 0, y: 16, filter: blur(8px)` → `opacity: 1, y: 0, blur(0)`, 700ms, `EASE_FLUID`, delay 50ms |
| Eyebrow | `opacity: 0, y: 6` → `opacity: 1, y: 0`, 500ms, `EASE_FLUID` |
| Hairline underline | `scaleX: 0 → 1`, `transformOrigin: "left center"`, 900ms, `EASE_FLUID`, delay 100ms |
| Nav item (sidebar) | `opacity: 0, x: -8` → `opacity: 1, x: 0`, 450ms, `EASE_FLUID`, stagger 60ms |
| Project card | `opacity: 0, y: 20` → `opacity: 1, y: 0`, 300ms, stagger 50ms (existing) |

### 6.4 Permanent rules

- ❌ **No `window.addEventListener('scroll')`.** Use Framer Motion `whileInView`, `useScroll`, or `IntersectionObserver`.
- ❌ **No `useState` for continuous values** (mouse position, scroll progress). Use `useMotionValue` / `useTransform`.
- ✅ **Animate `transform` + `opacity` only.** Never `top`, `left`, `width`, `height`.
- ✅ **Honor `prefers-reduced-motion`.** Wrap interactive animations with `useReducedMotion` and degrade to instant.

### 6.5 Layout-id shared-element pattern

Used by us:

- **Sidebar active item**: `layoutId="sidebar-active-pill"` — animates the white pill between nav items.
- **Pagination active page**: `layoutId="pagination-active-pill"` — animates the dark pill between pages.

Whenever you have a "selected one-of-N" pattern, reach for `layoutId` before re-implementing.

---

## 7. The Double-Bezel (Nested Architecture)

Every premium container is **two layers**, never a flat card.

```tsx
{/* Outer shell — hairline border, padding, big radius */}
<div className="rounded-3xl border border-white/60 bg-white/70 p-1.5 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_60px_-30px_rgba(15,23,42,0.18)]">
  {/* Inner core — distinct surface, smaller concentric radius */}
  <div className="rounded-[calc(1.5rem-0.375rem)] bg-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
    {content}
  </div>
</div>
```

Applied to: sidebar container, pagination container, future cards.

---

## 8. Layout Primitives

### 8.1 Sidebar (`sidebar-main-view.tsx`)

- Uses `variant="floating"` + `collapsible="icon"` from shadcn/ui.
- Outer wrapper: transparent. Inner: `bg-white/70 backdrop-blur-2xl` with double-bezel.
- Brand mark: gradient `from-zinc-900 to-zinc-700` square with monogram + white inner ring.
- Each nav item: white pill with `layoutId` for the active state, dual motion (left→right on hover, press-down on tap).

### 8.2 Main Inset (`main-layout.tsx`)

- Outer surface: `bg-zinc-50`.
- Three ambient mesh blobs (silver + amber tints) — **fixed, `pointer-events-none`, GPU-safe** (no scroll GP repaint).
- Subtle fixed grain overlay at `opacity-[0.035]` on `mix-blend-multiply` — **never on scrolling containers**.
- Content padding: `px-6 py-8 md:px-10 md:py-12 lg:px-14`. Asymmetric scale: more on desktop, less on mobile.

### 8.3 Page Header (`header-layout.tsx`)

- Props: `eyebrow?`, `description?`, then h2 children.
- Display: `text-[40px] md:text-[52px] tracking-[-0.025em]`.
- Optional eyebrow pill (live status dot + label) — **max 1 per 3 sections**.
- Hairline underline: kinetic `scaleX: 0 → 1` from `transformOrigin: left`.

### 8.4 Pagination (`pagination-layout.tsx`)

- Floating double-bezel container with hairline top highlight.
- Active page: dark pill with spring `layoutId` transition.
- Prev/Next: hover scales to 1.02, tap to 0.97, chevron translates 2px on hover.
- Custom Pharm phosphor icons (`CaretLeft`, `CaretRight`, `DotsThree`) — never raw chevron SVGs.

---

## 9. Component Recipes

### 9.1 Project Card (existing in `view-main.tsx`)

```tsx
<Card className="relative h-full rounded-2xl border border-zinc-200 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
```

**Upgrade path:**

1. Replace `border-zinc-200` with `border-zinc-900/[0.06]`.
2. Replace `shadow-sm` with `shadow-[0_1px_0_rgba(0,0,0,0.04)]`.
3. Replace `hover:shadow-lg` with the soft ambient shadow from §5.
4. Add `bg-gradient-to-br from-white to-zinc-50/50` for non-flat surface.
5. Wrap the card in a `<motion.div>` with `whileHover={{ y: -4 }}` (spring).

### 9.2 Search Input (existing)

```tsx
<Input className="py-4 pl-10 pr-4 border border-zinc-300" />
```

**Upgrade path:**

1. Remove `border-zinc-300` (overpowering).
2. Add `bg-white/70 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]`.
3. Add `focus-visible:ring-1 focus-visible:ring-zinc-900/10 focus-visible:border-zinc-900/15`.
4. Use Phosphor `MagnifyingGlass` instead of Lucide `Search`.

### 9.3 Empty State (existing)

```tsx
<div className="border-2 border-dashed rounded-2xl border-zinc-300 bg-zinc-50">
```

**Upgrade path:**

1. Replace dashed border with `border border-zinc-900/[0.06] bg-gradient-to-br from-white to-zinc-50/40`.
2. Add a small Phosphor icon (`FolderOpen`, `Package`) above the text.
3. Add motion-blur fade-up on enter.

### 9.4 FAB / Create Button (existing `bottom-30 right-20`)

**Upgrade path:** apply the "Button-in-Button" trailing-icon pattern:

```tsx
<button className="group inline-flex items-center gap-3 rounded-full bg-zinc-900 px-5 py-3 text-[13px] font-medium text-white shadow-[0_18px_50px_-20px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02] active:scale-[0.98]">
  New Project
  <span className="grid size-7 place-items-center rounded-full bg-white/10 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
    <PlusIcon weight="bold" className="size-3.5 text-white" />
  </span>
</button>
```

---

## 10. AI Tells — Banned Patterns

Re-checked on every component before shipping:

- ❌ Em-dash anywhere (Section 9.G of the design-taste skill).
- ❌ `transition-all duration-300` defaults.
- ❌ `shadow-md`, `shadow-lg`, `shadow-xl` as primary elevation.
- ❌ `border-gray-300` / `border-zinc-300` for anything but a deliberate outline.
- ❌ Three equal-column feature rows.
- ❌ `font-medium` on body copy (use `font-normal` for body, `font-medium` for labels).
- ❌ `Jane Doe`, `Acme`, `Lorem ipsum`, `V0.6 BETA` labels.
- ❌ Inter / Roboto / Arial / Helvetica.
- ❌ Lucide by default — Phosphor first.
- ❌ Sticky `Lucide icon` literal text rendering — use icon-library glyphs.

---

## 11. Pre-flight Checklist (Copy-Paste Into PR)

```text
- [ ] No em-dash (`—`) anywhere in visible strings
- [ ] Geist Variable only — no other font
- [ ] Phosphor icons only — Lucide only when Phosphor lacks the glyph
- [ ] All radii follow the §4 scale (full / 3xl / 2xl / 0.85)
- [ ] Shadows use tinted slate-950, not pure black
- [ ] All transitions use `cubic-bezier(0.32,0.72,0,1)` or a named spring
- [ ] All animations are `transform` + `opacity` only
- [ ] Layout-id used for any "selected one-of-N" pattern
- [ ] `prefers-reduced-motion` honored (wrap interactive motion)
- [ ] No `window.addEventListener('scroll')`
- [ ] Eyebrow count ≤ ceil(sectionCount / 3)
- [ ] WCAG AA contrast on every CTA (no white-on-white)
- [ ] Mobile collapse: `w-full px-4 py-8` under 768px
- [ ] No `h-screen` — use `min-h-[100dvh]`
- [ ] Fixed grain / blur only on `pointer-events-none` overlays
- [ ] Empty / loading / error states present for every async surface
- [ ] No lucide / hand-rolled SVG icon paths
```

---

## 12. File Map

| File | Role |
|---|---|
| `src/index.css` | CSS mirror of theme tokens (fallback before JS hydration) |
| `src/services/themeColor/themes/` | Per-theme token files (one file per mode) |
| `src/services/themeColor/themes/types.ts` | Shared `ThemeMode` and `ThemeTokens` types |
| `src/services/themeColor/themes/light.ts` | `lightTheme` token record |
| `src/services/themeColor/themes/dark.ts` | `darkTheme` (commented until shipping) |
| `src/services/themeColor/theme-tokens.ts` | Registry + `tokenToCssVar` map + `resolveTheme` |
| `src/services/themeColor/apply-theme.ts` | Imperative theme applicator (writes CSS vars to `<html>`) |
| `src/services/themeColor/use-theme.ts` | Reactive hook (`localStorage` + `prefers-color-scheme`-ready) |
| `src/layouts/main-layout.tsx` | App shell |
| `src/layouts/sidebar-main-view.tsx` | Floating glass sidebar with brand mark |
| `src/layouts/header-layout.tsx` | Cinematic page header with eyebrow + kinetic underline |
| `src/layouts/pagination-layout.tsx` | Floating pill pagination with shared-element active state |
| `src/components/ui/*` | shadcn primitives — extend, never replace |
| `src/components/mainSpace/*` | Page-specific components — follow §9 upgrade paths |

---

## 13. Anti-Slop Quick Reference

When you are about to ship a UI, ask yourself:

1. **Would I know this came from an LLM if I removed the logo?** If yes, redesign.
2. **Is the layout symmetrical?** If yes, break one axis.
3. **Are there hairlines on every row?** If yes, group with whitespace instead.
4. **Is the CTA a flat colored button?** If yes, add the button-in-button pattern.
5. **Is there an em-dash in the copy?** If yes, replace with `.` or `,`.
6. **Did I use `transition-all duration-300`?** If yes, switch to `cubic-bezier(0.32, 0.72, 0, 1)`.
7. **Are all cards the same size in a grid?** If yes, introduce one asymmetric tile.
8. **Is the headline `font-bold`?** If yes, try `font-medium` with `tracking-[-0.025em]` instead.

Any "yes" → rewrite. Ship only when the answer is "no" for all eight.
