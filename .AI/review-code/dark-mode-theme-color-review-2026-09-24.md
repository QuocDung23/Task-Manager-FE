# Code review: dark mode cho theme color

Ngày review: 2026-09-24

Phạm vi: commit `ebd3e07` (`feat: add dark mode to theme color`) trên nhánh `feature-web-2-project-board`, so với commit cha `0d87c9f`. Không review các commit khác trên nhánh. Không review thư mục `.AI/`. Không sửa source trong lần review này.

Files:

- `index.html`
- `src/components/auth/resetPassword-view.tsx`
- `src/components/projects/detail-project.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/users/sideBar-user.tsx`
- `src/components/users/theme-switcher.tsx`
- `src/index.css`
- `src/services/themeColor/apply-theme.ts`
- `src/services/themeColor/index.ts`
- `src/services/themeColor/theme-tokens.ts`
- `src/services/themeColor/themes/dark.ts`
- `src/services/themeColor/themes/index.ts`
- `src/services/themeColor/use-theme.ts`

Commit này đăng ký `darkTheme`, mirror token sang block `.dark`, gắn class `.dark` lên `<html>` (đúng với `@custom-variant dark (&:is(.dark *))`), và thêm mục đổi theme trong menu user. Token light không bị đụng, `dark.ts` khớp biến CSS của `.dark`, nên lần paint đầu và light mode ổn. Hai lỗ hổng còn lại: `useTheme()` giữ state riêng từng nơi gọi, nên toast Sonner không đổi palette khi toggle; script chặn FOUC ghim `color-scheme` inline mà `applyTheme` không bao giờ cập nhật.

Kết quả: 2 bugs, 4 suggestions.

## Findings

### Bug — `useTheme()` không dùng chung, toast Sonner giữ palette cũ

File: `src/services/themeColor/use-theme.ts:25`

`useTheme()` lưu `mode` bằng `useState` cục bộ và chỉ gọi `applyTheme` từ effect của instance đó. `ThemeSwitcher` (`src/components/users/theme-switcher.tsx:6`), `Toaster` (`src/components/ui/sonner.tsx:6`) và `MainLayout` (`src/layouts/main-layout.tsx:8`) mỗi nơi một bản. Toggle ở sidebar cập nhật class và CSS variable trên DOM, nhưng toaster mount trong `App.tsx` giữ `mode` lúc mount đầu và vẫn truyền giá trị đó vào prop `theme` (`src/components/ui/sonner.tsx:10`). Sonner lấy `--success-*` / `--error-*` / `--info-*` / `--warning-*` từ `data-sonner-theme`, và `<Toaster richColors>` dùng các biến này. Sau khi đổi theme, toast màu vẫn ở palette trước đó cho đến khi reload. Event `storage` không fire trong cùng tab, nên không có gì đồng bộ lại.

Khuyến nghị: giữ mode trong một store dùng chung (context hoặc `useSyncExternalStore`) để mọi subscriber của `useTheme()` re-render khi `toggle`. `applyTheme` vẫn là chỗ ghi DOM; đừng để effect của một call site đại diện cho mode hiện tại.

### Bug — `color-scheme` inline không đổi khi toggle

File: `src/services/themeColor/apply-theme.ts:26`

Script trong `<head>` gán `documentElement.style.colorScheme` một lần (`index.html:20`). Giá trị inline được kế thừa và thắng stylesheet. `applyTheme` chỉ thêm hoặc gỡ `.dark`, không sửa giá trị inline đó. Block `.dark` trong `src/index.css` cũng không set `color-scheme`. Sau khi toggle, scrollbar, checkbox native, input date và autofill giữ scheme của lần paint đầu cho đến khi load lại trang (lúc script đọc lại `localStorage`). `<meta name="color-scheme" content="light dark">` không khoá control theo theme của app.

Khuyến nghị: trong `applyTheme`, set `root.style.colorScheme` cùng mode dùng để toggle class. Hoặc khai báo `color-scheme: light` trên `:root` và `color-scheme: dark` trên `.dark`, và đừng để một giá trị inline một lần mà class không ghi đè được.

### Suggestion — Script chặn FOUC và `readStoredMode` lệch khi giá trị lưu không hợp lệ

File: `index.html:13`

Script chặn FOUC và `readStoredMode` (`src/services/themeColor/use-theme.ts:11`) xử lý khác nhau mọi giá trị khác `"light"` và `"dark"`. Chuỗi không rỗng nhưng sai bị script coi là light (`stored === "dark"` sai và `!stored` cũng sai). Hook thì bỏ giá trị đó, theo `prefers-color-scheme`, rồi effect ghi đè `localStorage` bằng mode đã resolve. Paint đầu có thể là light rồi nhảy sang dark.

Khuyến nghị: dùng một điều kiện ở cả hai chỗ: chỉ nhận `"light"` và `"dark"`, còn lại theo system preference, kể cả chuỗi lạ. Chỉ persist khi user thật sự toggle, hoặc chỉ persist giá trị mà script tôn trọng.

### Suggestion — Màn restore session vẫn nền sáng cứng

File: `src/router/route-guards.tsx:19`

Bật `.dark` không chạm `SessionLoadingScreen`. Khi session đang restore, `ProtectedRoute`, `AuthRedirectRoute` và `RootRedirectRoute` thay cả trang bằng panel `100vh` hardcode `#f9fafb`, spinner `#e5e7eb` và chữ `#6b7280` (`src/router/route-guards.tsx:19-45`). Panel che viewport dù `<html>` đã có `.dark`.

Khuyến nghị: dùng `bg-background`, `text-muted-foreground` và `border-border` (hoặc CSS variable của theme) để màn restore đi cùng token với phần còn lại của shell.

### Suggestion — Hàng Logout trong cùng menu vẫn focus màu sáng

File: `src/components/users/sideBar-user.tsx:83`

Hàng logout cùng menu với theme switcher vẫn dùng màu focus chỉ dành cho light: `text-red-600 focus:bg-red-50 focus:text-red-600`. Các class này thắng `focus:bg-accent` của item qua `cn` / `tailwind-merge`. Ở dark mode, hàng đang focus thành chip hồng nhạt trên popover tối.

Khuyến nghị: bỏ cặp `focus:bg-red-50` sáng và dùng variant destructive của menu (`focus:bg-destructive/10` cùng `dark:focus:bg-destructive/20`) để hàng nằm trên bề mặt tối.

### Suggestion — Comment mới kể lại code hoặc nhét lý do thiết kế

File: `src/services/themeColor/apply-theme.ts:25`

`apply-theme.ts:25` nói các dòng sau toggle `.dark` cho variant Tailwind, đúng việc `classList` đang làm. `src/index.css:136-137` giải thích gradient là “ambient depth glow” và ghi chú chi phí repaint, không phải ràng buộc người đọc không thấy từ rule.

Khuyến nghị: xoá cả hai comment. Nếu gradient giữ lại, để CSS không kèm đoạn viết thiết kế.

## Ngoài phạm vi

Token light, bảng màu `dark.ts` so với block `.dark`, và class `.dark` trên `<html>` khớp variant Tailwind hiện có. Không thấy light mode bị đổi màu bởi commit này.
