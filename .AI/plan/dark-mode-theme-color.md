# Dark Mode Theme — Kích hoạt + Theme Switcher trong Sidebar

> Ngày: 2026-09-15
>
> Mục tiêu: Kích hoạt dark mode đã được chuẩn bị sẵn trong CSS, đồng bộ tokens
> vào runtime theme engine, thêm theme switcher vào sidebar user dropdown, và
> fix các hardcoded colors chưa tương thích. Light mode giữ nguyên 100%.

---

## 1. Hiện trạng

Hệ thống theme đã được **chuẩn bị gần như đầy đủ** nhưng chưa activated:

| Layer | Trạng thái | Chi tiết |
|---|---|---|
| CSS `.dark` block | **Hoàn thành** | `src/index.css:98-130` — đầy đủ 30 tokens, oklch format |
| `@custom-variant dark` | **Hoàn thành** | `src/index.css:6` — Tailwind `dark:` variant hoạt động |
| `dark.ts` (TS tokens) | **Chưa active** | File tồn tại nhưng nội dung bị comment out, `export {}` |
| `theme-tokens.ts` registry | **Chưa active** | `dark: darkTheme` bị comment, `resolveTheme()` fallback light |
| `themes/index.ts` export | **Chưa active** | Chỉ export `lightTheme` |
| `useTheme()` hook | **Hoàn thành** | Persist localStorage, toggle light↔dark, `applyTheme()` |
| `.dark` class toggling | **Chưa active** | `applyTheme()` ghi CSS vars nhưng **không toggle `.dark` class** trên `<html>` |
| Sidebar theme switcher | **Chưa có** | "Setting" dropdown item hiện là placeholder không có UI |
| Hardcoded colors | **Cần audit** | ~11 instances `bg-zinc-*`, `text-zinc-*`, `bg-white/*` thiếu `dark:` variant |

### Vấn đề cốt lõi

`applyTheme()` hiện chỉ ghi CSS custom properties lên `:root`. Nhưng Tailwind
`dark:` variant (được enable bởi `@custom-variant dark (&:is(.dark *))`) cần
class `.dark` trên `<html>` để hoạt động. Component nào dùng `dark:bg-zinc-800`
hiện tại **không work** vì thiếu class này.

---

## 2. Design Direction

Theo design-taste-frontend skill §8 (Dark Mode Protocol):

- **Palette:** Cool slate (hue 240°) + electric blue accent — giữ nguyên family
  từ light, chỉ invert lightness. Đã có sẵn trong CSS `.dark` block.
- **Contrast:** WCAG AA minimum cho body text, AAA target cho heading.
- **No pure black/white:** Dùng `oklch(0.16 ...)` thay vì `#000`, `oklch(0.96 ...)`
  thay vì `#fff`.
- **Brand fidelity:** Electric blue accent (`oklch(0.68 0.18 250)`) slightly
  desaturated trên dark surface để giữ AAA contrast.
- **Hierarchy parity:** Visual hierarchy light ↔ dark đồng nhất — CTA pop,
  muted text mờ, border subtle.

### Dark Palette Summary (đã có trong CSS)

```
Background:  oklch(0.16 0.005 240)  — deep cool slate
Foreground:  oklch(0.96 0.003 240)  — off-white
Card:        oklch(0.20 0.006 240)  — slightly lifted
Primary:     oklch(0.96 0.003 240)  — inverted (text on dark bg)
Accent:      oklch(0.68 0.18 250)   — electric blue, desaturated
Destructive: oklch(0.65 0.22 27)    — bright red
Border:      oklch(1 0 0 / 8%)      — white at 8% opacity
```

---

## 3. Implementation Steps

### Step 1: Activate dark theme tokens trong TypeScript

**File: `src/services/themeColor/themes/dark.ts`**

Uncomment và điền đầy đủ `darkTheme: ThemeTokens` object, mirror chính xác
giá trị trong `src/index.css:98-130`:

```ts
import type { ThemeTokens } from "./types";

export const darkTheme: ThemeTokens = {
  background: "oklch(0.16 0.005 240)",
  foreground: "oklch(0.96 0.003 240)",
  card: "oklch(0.20 0.006 240)",
  cardForeground: "oklch(0.96 0.003 240)",
  popover: "oklch(0.20 0.006 240)",
  popoverForeground: "oklch(0.96 0.003 240)",
  primary: "oklch(0.96 0.003 240)",
  primaryForeground: "oklch(0.16 0.005 240)",
  secondary: "oklch(0.25 0.006 240)",
  secondaryForeground: "oklch(0.96 0.003 240)",
  muted: "oklch(0.25 0.006 240)",
  mutedForeground: "oklch(0.68 0.008 240)",
  accent: "oklch(0.68 0.18 250)",
  accentForeground: "oklch(0.16 0.005 240)",
  destructive: "oklch(0.65 0.22 27)",
  border: "oklch(1 0 0 / 8%)",
  input: "oklch(1 0 0 / 12%)",
  ring: "oklch(0.68 0.18 250)",
  chart1: "oklch(0.68 0.18 250)",
  chart2: "oklch(0.58 0.10 240)",
  chart3: "oklch(0.45 0.05 240)",
  chart4: "oklch(0.78 0.12 220)",
  chart5: "oklch(0.85 0.06 240)",
  sidebar: "oklch(0.18 0.005 240)",
  sidebarForeground: "oklch(0.96 0.003 240)",
  sidebarPrimary: "oklch(0.68 0.18 250)",
  sidebarPrimaryForeground: "oklch(0.16 0.005 240)",
  sidebarAccent: "oklch(0.25 0.006 240)",
  sidebarAccentForeground: "oklch(0.96 0.003 240)",
  sidebarBorder: "oklch(1 0 0 / 8%)",
  sidebarRing: "oklch(0.68 0.18 250)",
  radius: "0.625rem",
};
```

**File: `src/services/themeColor/themes/index.ts`**

Thêm export `darkTheme`:

```ts
export type { ThemeMode, ThemeTokens } from "./types";
export { lightTheme } from "./light";
export { darkTheme } from "./dark";
```

**File: `src/services/themeColor/theme-tokens.ts`**

Uncomment `dark: darkTheme`, import `darkTheme`:

```ts
import { lightTheme, darkTheme, type ThemeMode, type ThemeTokens } from "./themes";

export const themes: Partial<Record<ThemeMode, ThemeTokens>> = {
  light: lightTheme,
  dark: darkTheme,
};
```

### Step 2: Toggle `.dark` class trên `<html>`

**File: `src/services/themeColor/apply-theme.ts`**

Thêm logic toggle class `.dark` trên `document.documentElement`:

```ts
export function applyTheme(mode: ThemeMode = defaultTheme): void {
  if (typeof document === "undefined") return;
  const tokens = resolveTheme(mode);
  const root = document.documentElement;

  for (const key of Object.keys(tokenToCssVar) as Array<
    keyof typeof tokenToCssVar
  >) {
    root.style.setProperty(tokenToCssVar[key], tokens[key]);
  }

  // Toggle .dark class for Tailwind dark: variant
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  root.dataset.theme = mode;
}
```

### Step 3: Theme Switcher Component

Tạo component `ThemeSwitcher` dùng trong sidebar user dropdown.

**File mới: `src/components/users/theme-switcher.tsx`**

```tsx
import { Moon, Sun } from "lucide-react";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { useTheme } from "@/services/themeColor";

export function ThemeSwitcher() {
  const { mode, toggle } = useTheme();

  return (
    <DropdownMenuItem onClick={toggle} className="cursor-pointer">
      {mode === "dark" ? (
        <Sun className="mr-2 h-4 w-4" />
      ) : (
        <Moon className="mr-2 h-4 w-4" />
      )}
      <span>{mode === "dark" ? "Light Mode" : "Dark Mode"}</span>
    </DropdownMenuItem>
  );
}
```

**File: `src/components/users/sideBar-user.tsx`**

Thay thế placeholder `Setting` bằng `ThemeSwitcher`:

```tsx
import { ThemeSwitcher } from "./theme-switcher";

// Trong DropdownMenuGroup, thay:
// <DropdownMenuItem className="cursor-pointer">
//   <Settings className="mr-2 h-4 w-4" />
//   <span>Setting</span>
// </DropdownMenuItem>
// Bằng:
<ThemeSwitcher />
```

Giữ icon `Settings` trong import nếu cần dùng lại sau, hoặc bỏ nếu không cần.

### Step 4: Fix Hardcoded Colors

Audit và fix các component dùng hardcoded color thiếu `dark:` variant:

| File | Issue | Fix |
|---|---|---|
| `sideBar-user.tsx:60` | `text-zinc-500` (chevron icon) | Thêm `dark:text-zinc-400` |
| `detail-project.tsx:157` | `text-zinc-900 bg-zinc-100` | Thêm `dark:text-zinc-100 dark:bg-zinc-800` |
| `resetPassword-view.tsx:111` | `border-gray-300` | Thêm `dark:border-zinc-700` |
| `board-tags-manager-dialog.tsx:399` | `bg-white/12` | OK — đang dùng trên dark surface, `white/12` hoạt động tốt |
| `delete-list-dialog.tsx:146` | `bg-white/15` | OK — tương tự, overlay trên dark |

> Lưu ý: `bg-white/12` và `bg-white/15` trong dialog đã đúng context (overlay
> trên dark surface), không cần fix.

### Step 5: Respect System Preference (Optional Enhancement)

**File: `src/services/themeColor/use-theme.ts`**

Thêm fallback đọc `prefers-color-scheme` khi chưa có localStorage value:

```ts
function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return defaultTheme;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // Fallback to system preference
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return defaultTheme;
}
```

---

## 4. File Changes Summary

### Tạo mới

```text
src/components/users/theme-switcher.tsx    — ThemeSwitcher component
```

### Sửa

```text
src/services/themeColor/themes/dark.ts          — uncomment darkTheme object
src/services/themeColor/themes/index.ts         — thêm export darkTheme
src/services/themeColor/theme-tokens.ts         — uncomment dark registry entry
src/services/themeColor/apply-theme.ts          — thêm .dark class toggle
src/services/themeColor/use-theme.ts            — thêm system preference fallback
src/components/users/sideBar-user.tsx           — thay Setting placeholder bằng ThemeSwitcher
src/components/projects/detail-project.tsx      — fix hardcoded colors
src/components/auth/resetPassword-view.tsx      — fix hardcoded border color
```

### Không sửa

```text
src/index.css                                   — giữ nguyên (dark block đã đúng)
src/services/themeColor/themes/light.ts         — giữ nguyên 100%
src/services/themeColor/themes/types.ts         — giữ nguyên
src/layouts/main-layout.tsx                     — giữ nguyên (useTheme() đã gọi)
src/layouts/sidebar-main-view.tsx               — giữ nguyên
```

---

## 5. Flow Hoạt Động

```
User click "Dark Mode" trong sidebar dropdown
  → ThemeSwitcher.onClick → useTheme().toggle()
    → setMode("dark")
      → useEffect fires
        → applyTheme("dark")
          → Ghi 30 CSS vars lên :root (runtime override)
          → root.classList.add("dark")          ← MỚI
          → root.dataset.theme = "dark"
        → localStorage.setItem("mt-theme-mode", "dark")
  → Toàn bộ app re-render với dark tokens
  → Tailwind dark: variant hoạt động (nhờ .dark class)
  → Next visit: readStoredMode() đọc localStorage → apply dark ngay
```

---

## 6. Test Plan

1. **Toggle mechanism:** Click "Dark Mode" → toàn app chuyển dark. Click "Light Mode" → quay lại light. Không flash/flicker.
2. **Persistence:** Refresh trang sau khi toggle → giữ đúng theme đã chọn.
3. **CSS vars sync:** Kiểm tra `getComputedStyle(document.documentElement).getPropertyValue('--background')` trả đúng giá trị dark/light.
4. **Tailwind dark: variant:** Component dùng `dark:bg-zinc-800` hiển thị đúng trên dark, ẩn trên light.
5. **Sidebar:** Theme switcher hiển thị đúng icon (Sun khi dark, Moon khi dark), label đúng.
6. **Hardcoded fixes:** Kiểm tra detail-project input, resetPassword checkbox, sideBar-user chevron — tất cả đọc được trên cả 2 theme.
7. **System preference:** Xóa localStorage → reload → kiểm tra `prefers-color-scheme` được respect.
8. **Accessibility:** Tab navigation qua theme switcher hoạt động, contrast ratio WCAG AA.
9. **Toast (sonner):** Kiểm tra toast hiện đúng theme (sonner dùng `next-themes` — cần kiểm tra có sync không).

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Sonner toast dùng `next-themes` nhưng không có `ThemeProvider` | Toast có thể không sync theme | Thêm `<ThemeProvider attribute="class">` hoặc override sonner theme prop thủ công |
| Flicker khi load trang (FOUC) | Light flash trước khi dark apply | `applyTheme()` đã chạy synchronously trong `useEffect` đầu tiên; có thể thêm inline `<script>` trong `index.html` để apply từ trước |
| Component library (shadcn) dùng CSS vars | N/A — đã dùng CSS vars, hoạt động tự động | Không có vấn đề |
| `bg-white/12` trong dialogs | Có thể quá sáng trên dark | Đã check — overlay context, hoạt động OK |

---

## 8. Scope & Thứ Tự

### P0 (phải làm)

1. Activate `darkTheme` trong TS (dark.ts + theme-tokens.ts + themes/index.ts)
2. Toggle `.dark` class trong `applyTheme()`
3. Tạo `ThemeSwitcher` component
4. Thay thế placeholder trong `sideBar-user.tsx`
5. Fix hardcoded colors (3 files)

### P1 (nice to have)

6. System preference fallback trong `useTheme()`
7. FOUC prevention script trong `index.html`
8. Sonner toast sync với theme

---

## 9. Definition of Done

- [ ] Toggle light↔dark hoạt động từ sidebar dropdown
- [ ] Theme persist qua refresh (localStorage)
- [ ] Tất cả CSS tokens đồng bộ giữa CSS `.dark` block và TS `darkTheme`
- [ ] Tailwind `dark:` variant hoạt động trên toàn app
- [ ] Không có hardcoded color nào gây lỗi contrast trên dark mode
- [ ] Light mode giữ nguyên 100% — không regress
- [ ] WCAG AA contrast trên cả 2 mode
