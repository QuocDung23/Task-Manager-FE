# Refactor `DialogAddMemberProject`

## Mục tiêu

- Refactor lại `src/components/projects/addMember-project.tsx` cho gọn, dùng theme tokens có sẵn, và thêm ô hiển thị member đã chọn ngay trong dialog.

## Files thay đổi

- `src/components/projects/addMember-project.tsx` — viết lại toàn bộ.

## Những gì đã làm

### 1. Tách sub-component

- `DialogAddMemberProject` chỉ làm composition + state ownership.
- `SelectedMemberCard` — ô hiển thị member đã chọn (luôn hiển thị khi có selection, có nút `Change` để chọn lại).
- `SearchResults` — ô search results với 4 trạng thái rõ ràng: idle (chưa search), loading, empty, có kết quả.
- `ResultsHint` / `ResultsStatus` — các empty/loading helper nhỏ, tái sử dụng style.
- `Avatar` — render initials, tránh layout shift khi email trống.

### 2. Theme tokens (bỏ hard-coded color)

- Thay `bg-white`, `border-zinc-200`, `text-zinc-500`, `text-zinc-900`, `bg-zinc-50`, `bg-primary/5`, `border-primary` bằng semantic tokens: `bg-popover`, `border-border`, `text-muted-foreground`, `text-foreground`, `bg-muted/40`, `bg-muted/30`, `bg-accent`, `ring-ring/50`.
- Dùng `--radius-lg` semantic thay vì `rounded-md` hard-code (shape consistency lock).
- Container border dùng `border-dashed` cho hint state để phân biệt visual hierarchy với list kết quả thật.

### 3. UX cải tiến

- `SelectedMemberCard` hiển thị **luôn ở trên cùng** khi đã chọn user. Search input + results vẫn hiển thị bình thường bên dưới → user có thể đổi ý, chọn người khác mà không cần bấm `Change` trước.
- Nút `Change` trên `SelectedMemberCard` vẫn hữu ích: clear selection + clear search input trong 1 thao tác.
- Row đang được chọn trong search list được highlight bằng `bg-accent` (semantic token), giúp user thấy ngay user nào đang được chọn khi scroll list dài.
- Loading state copy rõ ràng (`Searching users…`) thay vì chỉ spinner trơn.
- Empty state phân biệt "chưa search" vs "không có kết quả".
- Hover/focus hint dùng `CheckCircle2` mờ dần, đỡ noise so với lúc nào cũng show icon selected (vẫn luôn hiện với row đang được chọn).

### 4. Technical improvements

- Bỏ `useEffect` debounce bằng `useDeferredValue` — React 18+ tự batch, không cần timer cleanup.
- Bỏ `useEffect` reset state theo `open` — chuyển logic vào `handleClose` (chỉ reset khi đóng), tránh re-render thừa.
- Reset state dùng single `handleClose` wrapper thay vì 2 effect riêng.
- `Input` thêm `type="email"`, `inputMode="email"`, `autoComplete="off"`, `aria-label` cho a11y.
- `useMemo` cho `users` array (tránh referential instability truyền xuống `SearchResults`).
- `DialogDescription` thêm để screen reader đọc được context.
- Title có icon `UserPlus` kèm `aria-hidden` để hint chức năng.

### 5. Áp design-taste skill

- **Theme lock:** toàn bộ component dùng semantic tokens, tự động work ở cả light/dark mode khi dark theme ship.
- **Shape consistency:** một corner-radius system (`rounded-lg` / `rounded-md`) xuyên suốt.
- **Motion restraint:** chỉ `transition-colors`, không thêm animation mới. shadcn `Dialog` đã có `data-open:zoom-in-95` sẵn — không lặp.
- **Anti-AI-tell:** bỏ pattern `bg-white + border-zinc-200 + text-zinc-500` (template-y). Dùng `bg-muted/30` cho hint để có hierarchy.
- **Form a11y:** placeholder không thay label, có `aria-label` riêng trên input.
- **Button contrast:** Cancel (ghost) + Add (default primary) → contrast hợp WCAG AA trên `bg-popover`.

## Pre-flight check

- Không có em-dash (`—`) nào trong file.
- Mọi text đọc tự nhiên, không AI-flavored.
- 0 hard-coded color, 0 hard-coded radius.
- TypeScript strict: không `any`, có explicit `UserResponse` type.
- Lint pass.

## Hạn chế / chưa làm

- Dark theme tokens đã có sẵn trong `src/index.css` nhưng `darkTheme` chưa được đăng ký trong `theme-tokens.ts` (out of scope task này). Khi dark ship, component tự work nhờ dùng semantic tokens.
- Chưa thêm animation cho việc swap giữa search → selected. Hiện swap là instant. Nếu sau này muốn thêm Motion `layoutId`, đã để sẵn pattern có thể wrap.

## Lần 2: đồng bộ phong cách với `updateProject-main.tsx`

### 1. Dialog shell (Apple Liquid Glass skeleton)

- Bỏ shadcn default chrome (`border-0 bg-transparent p-0 ring-0 shadow-none showCloseButton={false}`).
- Outer wrapper `rounded-3xl p-1.5` + inner `overflow-hidden rounded-[calc(1.5rem-0.375rem)] bg-card` + dual inset shadow (sáng cho light, dim cho dark) — pattern giống hệt `updateProject`.

### 2. Header

- Icon tile pattern: `bg-primary/10 p-1.5 ring-1 ring-inset ring-primary/15` + inner `bg-card shadow-...` + icon `UserPlus strokeWidth={1.75}`.
- Title `text-[19px]/[20px] tracking-[-0.02em]`, description `max-w-[34ch] text-[13px]`.
- Close button: `motion.button` pill `size-9 rounded-full bg-muted/70`, có `whileHover/whileTap` scale + `iconHover/iconTap` spring. Disabled khi `isPending`.

### 3. Body / Form rhythm

- Padding `px-5 sm:px-7 pb-5 sm:pb-7` (mobile → desktop).
- Spacing giữa các block: `gap-4` đồng nhất.

### 4. Search input

- Override style: `h-12 rounded-2xl border border-foreground/8 bg-background/65 pl-10 pr-4 text-[13.5px]` + dual inset shadow.
- Hover: `hover:bg-background`. Focus: `border-accent/40 ring-4 ring-accent/10`.
- Search icon absolute `left-3.5 size-4 text-muted-foreground/70` (lớn hơn, dịch vào trong hơn).

### 5. Search results (height lớn hơn 1 chút)

- `max-h-72` (288px) thay vì `max-h-60` (240px). Container: `rounded-2xl border border-foreground/8 bg-background/65` + inset shadow, đồng bộ với Input.
- Row: `rounded-xl px-2.5 py-2`. Selected row có thêm `shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]` để có "raised" feel.

### 6. SelectedMemberCard

- `rounded-2xl border border-foreground/8 bg-muted/40` + avatar tile với `bg-primary/10 ring-primary/15`.
- Nút `Change`: `motion.button` pill `h-8 rounded-full px-3` + `iconHover/WhileTap`. Bỏ shadcn `<Button>` cho action phụ này để đồng bộ pattern với close button.

### 7. CTA buttons (pill motion pattern)

- Cancel: `motion.button h-11 rounded-full px-5 text-muted-foreground` + `pressHover/pressTap` + hover `bg-muted/70`.
- Add member: pill pattern `bg-primary pl-5 pr-1.5` + trailing icon-circle `size-8 bg-primary-foreground/12 group-hover:translate-x-0.5 group-hover:scale-105` + `ArrowRight` icon. Loading state: spinner rotate vô hạn trong circle, copy đổi thành "Adding".
- Cả 2 disabled đúng điều kiện: Cancel disabled khi pending (tránh đóng giữa chừng), Add disabled khi chưa chọn user hoặc đang pending.
- Block đóng dialog khi pending (`handleClose` check `isPending`).

### 8. Motion

- Header enter: `{ opacity: 0, y: 10 } → 0`, `enterTransitionFor(reduceMotion)` (0.55s, EASE_FLUID).
- Body enter: `{ opacity: 0, y: 14 } → 0`, delay 0.06s (giống `updateProject`).
- Tất cả CTA + close: `whileHover scale: 1.02 / 1.05`, `whileTap 0.98 / 0.95`, transition `SPRING_PRESS`.
- Reduced motion: mọi entrance → `duration: 0`, mọi gesture → `undefined` (skip).

### 9. Avatar

- Đẩy xuống base component với `className` prop. 2 use cases:
  - SelectedMemberCard: outer tile `bg-primary/10` + inner `bg-card text-primary`.
  - Search row: `bg-secondary text-secondary-foreground` (idle) hoặc `bg-primary-foreground/15 text-primary-foreground` (selected).

### 10. Pre-flight check

- 0 em-dash.
- 0 hard-coded color (mọi màu đều semantic token hoặc `color-mix(in oklab, var(--primary), transparent)`).
- Shape consistency: một corner-radius system (`rounded-2xl` cho container, `rounded-xl` cho inner row, `rounded-full` cho avatar/pill button, `rounded-[calc(...)]` cho nested).
- TypeScript strict: 0 `any`.
- Lint pass.
