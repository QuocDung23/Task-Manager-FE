---
name: TaskMaster Professional Light
colors:
  surface: '#f4faff'
  surface-dim: '#d0dce4'
  surface-bright: '#f4faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e9f5fe'
  surface-container: '#e4f0f8'
  surface-container-high: '#deeaf2'
  surface-container-highest: '#d8e4ed'
  on-surface: '#121d23'
  on-surface-variant: '#414845'
  inverse-surface: '#273238'
  inverse-on-surface: '#e6f2fb'
  outline: '#717975'
  outline-variant: '#c1c8c4'
  surface-tint: '#43655a'
  primary: '#2b4d43'
  on-primary: '#ffffff'
  primary-container: '#43655a'
  on-primary-container: '#bbe1d3'
  inverse-primary: '#aacec1'
  secondary: '#446463'
  on-secondary: '#ffffff'
  secondary-container: '#c3e6e5'
  on-secondary-container: '#486868'
  tertiary: '#344a50'
  on-tertiary: '#ffffff'
  tertiary-container: '#4c6268'
  on-tertiary-container: '#c5dde4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5ebdd'
  primary-fixed-dim: '#aacec1'
  on-primary-fixed: '#002019'
  on-primary-fixed-variant: '#2b4d43'
  secondary-fixed: '#c6e9e8'
  secondary-fixed-dim: '#aacdcc'
  on-secondary-fixed: '#002020'
  on-secondary-fixed-variant: '#2c4c4b'
  tertiary-fixed: '#cfe7ee'
  tertiary-fixed-dim: '#b3cad2'
  on-tertiary-fixed: '#071e24'
  on-tertiary-fixed-variant: '#344a50'
  background: '#f4faff'
  on-background: '#121d23'
  surface-variant: '#d8e4ed'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is built for a professional productivity environment where clarity, focus, and reliability are paramount. The aesthetic follows a **Corporate / Modern** approach with a strong emphasis on **Minimalism**. 

The brand personality is efficient and calm, utilizing a refined palette of desaturated slates and teals to reduce cognitive load during long work sessions. The interface relies on generous whitespace, crisp typography, and a "function-over-fluff" philosophy to evoke a sense of organized control. Users should feel that the tool is a silent, capable partner in their workflow, providing structure without distraction.

## Colors

The color palette is anchored in a sophisticated range of slates and teals.

- **Primary Background (#FDFDFD):** Used for the main canvas to ensure maximum legibility and a clean "paper-like" feel.
- **Surface & Containers (#D9DBE1):** Used for secondary layout elements like sidebars, card backgrounds, and headers to create subtle depth.
- **Borders & Dividers (#B0BCC4):** A structural neutral used for defining zones without creating harsh visual breaks.
- **Primary Accent (#43655A):** Reserved for primary Call-to-Action (CTA) buttons and critical active states.
- **Secondary Accent (#618281):** Used for hover states, active navigation icons, and progress indicators.

## Typography

This design system utilizes a dual-font strategy to balance character with utility. 

**Manrope** is used for headlines to provide a modern, refined, and geometric feel that looks professional yet contemporary. **Inter** is used for all body text, labels, and UI elements to ensure peak legibility and a systematic, utilitarian performance. 

Headlines should use tighter tracking at larger sizes to maintain visual impact. Body copy maintains a standard line-height of 1.5x for optimal readability. Labels use a slightly heavier weight and uppercase styling where hierarchy needs to be established in dense data views.

## Layout & Spacing

The layout is built on a **12-column fluid grid** for desktop and a **4-column fluid grid** for mobile. 

The system follows an 8px rhythmic scale. Margins are generous to maintain the minimalist aesthetic, with 32px of breathing room on the edges of the desktop viewport. Containers should utilize the `lg` (24px) padding for primary content areas and `md` (16px) for nested elements. 

For data-heavy dashboards, vertical spacing between list items should be kept at `sm` (12px) to maximize information density while maintaining clarity through the use of neutral dividers (#B0BCC4).

## Elevation & Depth

This design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to indicate hierarchy. 

- **Level 0 (Background):** #FDFDFD. The lowest layer.
- **Level 1 (Secondary Surfaces):** #D9DBE1. Used for sidebars and top navigation bars.
- **Level 2 (Active Containers):** #FFFFFF. Used for cards and modals, elevated slightly with a 1px border of #B0BCC4.
- **Shadows:** When necessary for modals or dropdowns, use a "Soft Ambient" shadow: `0px 4px 20px rgba(176, 188, 196, 0.2)`. This uses the neutral slate color as the shadow tint to ensure it feels integrated into the palette.

## Shapes

The shape language is **Soft** and professional. A standard radius of 4px (`0.25rem`) is applied to buttons, input fields, and small UI components. Larger containers like cards and modals use 8px (`0.5rem`) to appear approachable but structured. 

Avoid fully rounded "pill" shapes unless used for status chips or badges, as sharp corners and soft radii better reflect the "Master" and "Professional" aspect of the brand.

## Components

- **Buttons:** Primary buttons use the #43655A background with white text and 4px corners. Secondary buttons use a #B0BCC4 outline with #43655A text.
- **Input Fields:** Use #FFFFFF background, #B0BCC4 border, and 4px radius. On focus, the border transitions to #618281 with a subtle 2px outer glow of the same color at 10% opacity.
- **Chips/Badges:** Small, 2px rounded corners. Use #D9DBE1 for neutral states and #879EA5 with white text for active filters.
- **Cards:** White (#FFFFFF) background with a #B0BCC4 border. No shadow by default.
- **Lists:** Items separated by a 1px horizontal line of #D9DBE1. Hover state uses a subtle background shift to #D9DBE1 at 50% opacity.
- **Checkboxes:** Square with a 2px radius. When checked, the fill is #43655A with a white checkmark.