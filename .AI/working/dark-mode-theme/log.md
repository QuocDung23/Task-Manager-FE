# Dark Mode — Kích hoạt + Theme Switcher + Refactor Palette (v1 → v2)

**Ngày:** 24/09/2026
**Plan:** `FE/.AI/plan/dark-mode-theme-color.md`
**Status:** IMPLEMENTED — v2 hiện tại, cần test thủ công

---

## Tổng kết

Kích hoạt dark mode vốn đã chuẩn bị sẵn trong CSS nhưng chưa "chạy":

- **Phase 1 (theo plan):** bật `darkTheme` trong TS, toggle `.dark` class, thêm
  `ThemeSwitcher` vào sidebar dropdown, fix hardcoded colors (3 files), respect
  system preference.
- **Phase 2 (refactor v1):** người dùng chê dark mode "nhìn rất khó chịu" →
  đổi nền từ near-black `oklch(0.16)` sang **elevated soft graphite**
  `oklch(0.25)`, sync theme cho sonner toast, thêm FOUC-prevention script.
- **Phase 3 (refactor v2):** người dùng muốn tone **sáng hơn 1 chút + đẹp hơn**
  (theo 2 skills: `design-taste-frontend` + `high-end-visual-design`) → nâng
  toàn bộ bề mặt `+0.03–0.04`, neutrals ngả bluer (hue 250° = accent family),
  hairline border sáng hơn `12–18%`, thêm ambient depth glow.

---

## Files đã tạo / sửa

### Phase 1 — Kích hoạt dark mode (theo plan)

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/services/themeColor/themes/dark.ts` | SỬA | Uncomment + điền đầy đủ `darkTheme: ThemeTokens` (mirror CSS `.dark`) |
| `src/services/themeColor/themes/index.ts` | SỬA | Thêm `export { darkTheme }` |
| `src/services/themeColor/theme-tokens.ts` | SỬA | Uncomment `dark: darkTheme` trong registry |
| `src/services/themeColor/apply-theme.ts` | SỬA | Thêm `root.classList.add/remove("dark")` + `root.dataset.theme` |
| `src/components/users/theme-switcher.tsx` | TẠO MỚI | Dropdown item toggle light↔dark (Moon/Sun icon) |
| `src/components/users/sideBar-user.tsx` | SỬA | Thay placeholder "Setting" bằng `<ThemeSwitcher/>`, bỏ import `Settings`, fix chevron `dark:text-zinc-400` |
| `src/components/projects/detail-project.tsx` | SỬA | Input rename tiêu đề: thêm `dark:bg-white/10 dark:text-zinc-100` |
| `src/components/auth/resetPassword-view.tsx` | SỬA | Checkbox "Show password": thêm `dark:border-zinc-700` |
| `src/services/themeColor/use-theme.ts` | SỬA | Fallback `prefers-color-scheme` khi chưa có localStorage |

### Phase 2 — Refactor palette v1 + fixes đồng bộ

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/index.css` (`.dark` block) | SỬA | Nền `0.16 → 0.25`, bề mặt card/popover/sidebar nâng tầng, primary = electric blue (bỏ kiểu nút trắng inverted) |
| `src/services/themeColor/themes/dark.ts` | SỬA | Mirror palette v1 |
| `src/components/ui/sonner.tsx` | SỬA | Bỏ `next-themes` (luôn `system`, lệch toggle thủ công) → dùng `useTheme()` của app |
| `index.html` | SỬA | Inline script apply `.dark` + `color-scheme` trước first paint (fix flash trắng / FOUC) |
| `src/services/themeColor/index.ts` | SỬA | Export `darkTheme` cho barrel |
| `src/components/projects/detail-project.tsx` | SỬA | Chip inline editor `dark:bg-zinc-800` → `dark:bg-white/10` |

### Phase 3 — Refactor palette v2 (sáng hơn + premium)

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/index.css` (`.dark` block + base layer) | SỬA | Nâng L toàn bề mặt, neutrals hue 250°, hairline `12%/18%`, `--ring` mềm sáng; thêm `.dark body` ambient radial glow (2 lớp, static) |
| `src/services/themeColor/themes/dark.ts` | SỬA | Mirror palette v2 (JSDoc ghi v1/v2 changelog) |

---

## V2 Palette (hiện tại)

```
Background:  oklch(0.28 0.014 250)   — luminous slate (không phải đen)
Foreground:  oklch(0.93 0.006 250)   — off-white
Card:        oklch(0.32 0.014 250)
Popover:     oklch(0.35 0.014 250)   — dialog trên card
Sidebar:     oklch(0.25 0.012 250)   — lùi hơn nền để khung canvas nổi
Primary:     oklch(0.62 0.19 250)    — electric blue (brand, CM cn = light)
Muted:       oklch(0.36 0.014 250)   / muted-fg oklch(0.78) — AA
Border:      oklch(0.95 0.006 250 / 12%) — hairline machined
Input:       oklch(0.95 0.006 250 / 18%)
Ring:        oklch(0.70 0.16 250)    — focus mềm
```

Tuân theo skill: §8.B no pure `#000`/`#fff`, brand fidelity (giữ electric blue),
hierarchy parity (CTA pop đều 2 mode), color consistency lock (1 accent duy nhất).

---

## Verification

- `npx tsc -b` — PASS
- `npm run lint` — 0 lỗi mới (10 lỗi pre-existing ở file không liên quan: set-state-in-effect, react-refresh)
- File đụng: clean (eslint trên `src/services/themeColor`, `sonner.tsx`, `theme-switcher.tsx`, `sideBar-user.tsx`, `resetPassword-view.tsx`)

---

## Flow hoạt động

```
Click "Dark Mode" trong sidebar dropdown
  → ThemeSwitcher.onClick → useTheme().toggle()
    → setMode("dark") → useEffect
      → applyTheme("dark")
        → ghi 30 CSS vars lên <html> (runtime override)
        → root.classList.add("dark")   → Tailwind dark: variant chạy
        → root.dataset.theme = "dark"
      → localStorage "mt-theme-mode" = "dark"
  → Next visit: inline <script> trong index.html đọc localStorage
    → thêm .dark TRƯỚC first paint → không flash trắng (FOUC)
  → Chưa có localStorage → fallback prefers-color-scheme
  → Sonner toast: đọc useTheme() → hiện đúng theme
```

---

## Test plan (thủ công)

1. Toggle Dark/Light từ sidebar → toàn app chuyển, không flicker.
2. F5 / reload ở dark mode → không flash trắng (FOUC script).
3. Xóa localStorage → reload → theo `prefers-color-scheme` của máy.
4. Toast (success/error) → đúng theme hiện tại.
5. Dialog/popover/input/border đọc rõ 2 mode, WCAG AA.
6. Native scrollbar, focus ring (`--ring`) nhìn mềm.
7. Light mode giữ nguyên 100% (không regress).
```

---

## Ghi nhận

- `applyTheme()` vẫn idempotent, đây là nguồn chân lý duy nhất khi toggling.
- `index.css` `.dark` block và `themes/dark.ts` phải giữ SONG SONG — cứ chỉnh 1
  nơi là phải mirror nơi kia.
- `sonner` (next-themes) không có `ThemeProvider` nên `theme` luôn `system` →
  thay bằng `useTheme()` của app.
- Nếu muốn chỉnh độ sáng tiếp theo đường này: nâng `--background` `0.28 → 0.30–0.32`
  và kéo theo card/popover/sidebar cùng delta.

---

# Code review fixes — 2026-09-24

Nguồn: `.AI/review-code/dark-mode-theme-color-review-2026-09-24.md` (2 bugs + 4 suggestions).

## Bug 1 — `useTheme()` dùng state cục bộ, toast Sonner giữ palette cũ

- **FIX:** thêm store dùng chung `src/services/themeColor/theme-store.ts`
  (`subscribe` / `getSnapshot` / `setThemeMode`, `useSyncExternalStore`).
- `use-theme.ts` giờ subscription-based → mọi call site (ThemeSwitcher, Toaster,
  MainLayout) re-render đồng bộ khi toggle.
- `applyTheme` chỉ là DOM writer; chạy trong `setThemeMode` + 1 lần boot.

## Bug 2 — `color-scheme` inline không đổi khi toggle

- **FIX:** `apply-theme.ts` set `root.style.colorScheme = mode` cùng lúc toggle class.
- CSS fallback: `color-scheme: light` trên `:root`, `color-scheme: dark` trên `.dark`
  (nếu inline bị gỡ, class vẫn đảm bảo).

## Suggestion 1 — FOUC script và `readStoredMode` lệch khi value lưu không hợp lệ

- **FIX:** 1 quy tắc duy nhất cả 2 nơi — chỉ nhận `"light"`/`"dark"`, còn lại (kể cả
  chuỗi lạ) theo `prefers-color-scheme`. Chỉ persist khi user toggle thật sự
  (`setThemeMode`), không persist value resolved từ system pref.

## Suggestion 2 — Màn restore session nền sáng cứng

- **FIX:** `router/route-guards.tsx` `SessionLoadingScreen` bỏ hardcode `#f9fafb`
  / `#e5e7eb` / `#6b7280` → dùng `bg-background`, spinner `border-border border-t-ring`,
  text `text-muted-foreground`, `h-dvh`.

## Suggestion 3 — Hàng Logout focus màu sáng

- **FIX:** `sideBar-user.tsx` bỏ `text-red-600 focus:bg-red-50 focus:text-red-600`
  → dùng `variant="destructive"` của dropdown (`focus:bg-destructive/10`
  `dark:focus:bg-destructive/20`).

## Suggestion 4 — Comment kể lại code / nhét lý do thiết kế

- **FIX:** xoá comment `// Toggle .dark class...` trong `apply-theme.ts` và comment
  ambient gradient trong `index.css`.

## Verification

- `npx tsc -b` — PASS
- ESLint các file đụng — clean
- `ThemeMode` type: `setMode` store nhận giá trị trực tiếp (không phải updater fn)
  — không nơi nào dùng `setMode(m => ...)`