# TaskMaster — UI Style Guide (MainSpace)

> **Mục đích**: Tài liệu này mô tả chi tiết phong cách UI đang được sử dụng trong `src/components/mainSpace/`, làm nguồn tham chiếu duy nhất (single source of truth) để refactor, đồng nhất hoặc xây dựng UI mới theo cùng một hệ thống.
>
> **Phạm vi**: 6 file component hiện có trong `src/components/mainSpace/`
> - `view-main.tsx` — trang danh sách Projects
> - `projectCard-main.tsx` — card hiển thị 1 project
> - `createProjectButton-main.tsx` — wrapper cho nút Create
> - `createProject-main.tsx` — Dialog tạo project
> - `updateProject-main.tsx` — Dialog chỉnh sửa project
> - `settingProject-main.tsx` — DropdownMenu hành động (Edit/Add member/Delete)
>
> **Tokens nguồn**: `.AI/design/designer.md` (colors / typography / rounded / spacing).
> **Motion tokens**: `src/lib/motion.ts`.

---

## 1. Brand & Tone

| Thuộc tính | Giá trị |
| --- | --- |
| Phong cách | Corporate / Modern, Minimalism |
| Tâm thế | Im lặng, có năng lực, tổ chức, không phô trương |
| Nguyên tắc | Function-over-fluff · Generous whitespace · Subtle depth |
| Cảm giác mục tiêu | "Silent capable partner" — cấu trúc rõ ràng, không phân tán |

**Không làm:**
- Không dùng gradient rực rỡ, neon, glow phô trương.
- Không dùng pill shape cho nút chính (chỉ dùng cho status chip / badge).
- Không dùng shadow đậm — ưu tiên tonal layer + ring/outline.

---

## 2. Design Tokens (rút ra từ code)

### 2.1. Color tokens (CSS variables — `src/index.css`)

Sử dụng semantic tokens, KHÔNG hard-code hex trong component.

| Token vai trò | Class Tailwind | Ghi chú sử dụng |
| --- | --- | --- |
| Background canvas | `bg-background` | Nền chính view (vd. pagination bar). |
| Surface card | `bg-card` | Card, dialog body, search input. |
| Surface nhạt (overlay / inset) | `bg-background/65`, `bg-muted/70`, `bg-muted/60` | Field input, close button. |
| Foreground text | `text-foreground` | Tiêu đề, số liệu. |
| Muted text | `text-muted-foreground`, `text-muted-foreground/85`, `text-foreground/85` | Mô tả, label phụ. |
| Subtle hover bg | `bg-foreground/4`, `bg-foreground/5`, `bg-foreground/6` | Hover nhẹ trên trigger / divider. |
| Border nhẹ | `border-border/80`, `border-border/60`, `border-foreground/8` | Card, input. |
| Border mặc định | `border-input` | Tự nhiên từ `<Input>`. |
| Primary fill | `bg-primary`, `bg-primary/10`, `text-primary` | Icon badge, CTA fill. |
| Primary hover | `bg-primary/90` | CTA hover. |
| Primary container | `bg-primary-foreground/12` | Bên trong pill icon của CTA. |
| Accent focus | `ring-accent/15`, `ring-accent/10` | Focus ring input/secondary. |
| Primary focus | `ring-primary/20`, `ring-primary/10` | Focus ring primary CTA. |
| Destructive | `text-destructive`, `bg-destructive/10`, `border-destructive/45` | Lỗi, Delete. |
| Error banner | `border-destructive/20 bg-destructive/5` | Error state toàn trang. |

### 2.2. Typography

Font chính: **Manrope** (headings) + **Inter** (body/UI). Class `font-heading` được dùng cho heading.

| Vai trò | Class thực tế đang dùng |
| --- | --- |
| Dialog title (lg) | `font-heading text-[20px] font-medium leading-tight tracking-[-0.02em] text-foreground` (mobile: `text-[19px]`) |
| Card title | `font-heading text-[15.5px] font-semibold leading-tight tracking-[-0.01em] text-foreground` |
| Section header (Toolbar) | `tracking-normal` trên `HeaderLayout` |
| Empty state title | `font-heading text-[17px] font-semibold leading-tight text-foreground` |
| Body / description | `text-[13.5px] leading-relaxed text-muted-foreground` hoặc `text-muted-foreground/85` |
| Label (form) | `text-[12.5px] font-medium text-foreground/85` |
| Caption (Optional, count) | `text-[11.5px] font-normal text-muted-foreground/75` |
| Stat chip (số) | `tabular-nums text-[12.5px] font-semibold leading-none text-foreground` |
| Stat chip (label) | `text-[11.5px] font-medium leading-none text-muted-foreground/80` |
| Error text | `text-[12px] leading-relaxed` (FieldError) |
| Error banner | `text-[13.5px]` |
| Loading label | `text-[13px] tracking-tight` |
| Toolbar meta | `text-xs font-medium text-muted-foreground` |

### 2.3. Rounded scale

| Mục đích | Class | Tailwind |
| --- | --- | --- |
| Pill (CTA, trigger, input, menu items) | `rounded-full` | `9999px` |
| Dialog wrapper | `rounded-3xl` | `1.5rem` |
| Dialog inner shell | `rounded-[calc(1.5rem-0.375rem)]` | padding 1.5 wrapper = 24px |
| Card (project) | `rounded-2xl` | `1rem` |
| Icon badge lớn (dialog) | `rounded-2xl` (outer) + `rounded-[calc(1rem-0.375rem)]` (inner) |
| Icon badge vừa (card) | `rounded-xl` | `0.75rem` |
| Icon badge nhỏ (menu item) | `rounded-full` | `9999px` |
| Stat chip | `rounded-lg` | `0.5rem` |
| Avatar | `rounded-full` (mặc định) | `9999px` |

### 2.4. Spacing scale

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `gap-1.5` / `gap-2` | 6 / 8px | Header row, dialog actions, menu items |
| `gap-2.5` | 10px | Dialog action khoảng cách nút |
| `gap-3` | 12px | Card header icon ↔ title |
| `gap-4` | 16px | Dialog header 3-col grid |
| `gap-5` | 20px | FieldGroup, toolbar gap |
| `mt-4` / `mt-5` / `mt-7` / `mt-8` | 16 / 20 / 28 / 32px | Khoảng cách giữa block kế tiếp |
| `p-5` / `px-5 py-5` | 20px | Card padding (mobile) |
| `sm:px-7 sm:py-7` | 28px | Dialog body padding (desktop) |
| `p-1.5` | 6px | Dialog wrapper bên ngoài (tạo ring 6px) |
| `py-1.5` | 6px | Stat chip |

### 2.5. Elevation

Hệ thống dùng **tonal layers + low-contrast ring/shadow**, KHÔNG dùng shadow đậm.

| Cấp | Cách dùng | Class |
| --- | --- | --- |
| L0 Background | Page | `bg-background` |
| L1 Card | Project card | `bg-card ring-1 ring-foreground/4` |
| L1 hover | Card hover | `hover:border-border hover:ring-foreground/8` |
| L2 Dialog body | Dialog wrapper | `bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]` |
| L2 dark | Dialog body dark | `dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]` |
| L3 Icon badge inner | `grid place-items-center ... bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)]` |
| Floating shadow (CTA) | `shadow-[0_*px_*px_-*px_color-mix(...)]` — dùng box-shadow phủ màu primary ở opacity thấp |
| Inset light | `shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)]` (light) / `dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]` (dark) cho input/textarea |

### 2.6. Motion tokens (`src/lib/motion.ts`)

| Token | Mục đích | Sử dụng |
| --- | --- | --- |
| `EASE_FLUID = [0.32, 0.72, 0, 1]` | Entrance, breathing | `transition={{ duration: 0.5~0.7, ease: EASE_FLUID }}` |
| `SPRING_PRESS` | Button feedback | `transition={SPRING_PRESS}` cho mọi motion button |
| `enterTransitionFor(reduceMotion)` | Dialog body enter | duration 0.55s, FLUID |
| `pressHover` / `pressTap` | In-dialog button | scale 1.02 / 0.98 |
| `pressHoverStrong` / `pressTapStrong` | Primary trigger | scale 1.03 / 0.97 |
| `iconHover` / `iconTap` | Icon-only button | scale 1.05 / 0.95 |
| `reduceMotion` | Tất cả motion phải check | `useReducedMotion()` rồi pass vào factory |

**Quy tắc**: Mọi `motion.*` đều phải kiểm tra `reduceMotion`; nếu bật reduced motion → trả `undefined` / `false` / `duration: 0`.

---

## 3. Component Patterns

### 3.1. Page layout — `view-main.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│ HeaderLayout (tracking-normal)                              │  shrink-0
├─────────────────────────────────────────────────────────────┤
│ Toolbar: [Search round input]   [count meta]   [+ Create]  │  mt-8
├─────────────────────────────────────────────────────────────┤
│ Grid (1→2→3→4 cols) of ProjectCard (motion)                 │  flex-1, overflow-y-auto
│   mỗi card là Card + Link + MenuSettingProject             │
│                                                             │
│             [absolute bottom-0 PaginationLayout]            │  z-20
└─────────────────────────────────────────────────────────────┘
```

**Container**: `relative flex h-[calc(100dvh-4rem)] min-h-0 w-full flex-1 flex-col overflow-hidden`

**Grid**:
- Class: `mt-8 pt-2 grid min-h-0 w-full flex-1 content-start grid-cols-1 items-stretch gap-5 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- AnimatePresence `mode="popLayout"` với entry stagger `delay: Math.min(index * 0.04, 0.4)`.
- Card motion: `whileHover={reduceMotion ? undefined : { y: -4 }}`.

**Pagination bar (absolute)**:
- Wrapper: `absolute inset-x-0 bottom-0 z-20 flex h-20 items-center justify-center bg-background **:data-[slot=pagination]:mt-0`
- Hiển thị khi `totalPage > 1`.

**Loading state**:
- Wrapper: `flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center overflow-hidden`
- Inner: `flex flex-col items-center gap-3 text-muted-foreground`
- Icon: `Loader2 h-6 w-6 animate-spin motion-reduce:animate-none`
- Label: `text-[13px] tracking-tight`.

**Error state**:
- Banner: `rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-4 text-[13.5px] text-destructive`.

**Empty state**:
- Wrapper: `rounded-2xl border border-border/60 bg-card px-6 py-12 sm:py-16 col-span-full`
- Icon badge: `grid size-11 place-items-center rounded-xl bg-primary/10 text-primary`
- Title: `font-heading text-[17px] font-semibold leading-tight text-foreground`
- Body: `mt-2 text-[13.5px] leading-relaxed text-muted-foreground`.

### 3.2. Card — `projectCard-main.tsx`

**Cấu trúc 3 block** trong `flex h-full flex-col p-5`:
1. **Header row**: Icon badge lớn (10×10) + Title (truncate) + Description (line-clamp-2).
2. **Stat row** (boards): `mt-5 flex items-center gap-2` — Icon clipboard + số + "board(s)".
3. **Footer row** (divider + members): `mt-auto pt-5`.
   - Divider: `h-px w-full bg-border/60`.
   - Members: `AvatarGroup` (ring-2 ring-card) hoặc empty avatar placeholder.
   - Right meta: Icon users + tổng member + "member(s)".

**Icon badge** (card):
- `grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10`

**Avatar**:
- Size: `size-7 text-[10px]`
- Fallback: `bg-muted text-[10px] font-semibold text-muted-foreground`
- Group: `flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-card`

### 3.3. Action button — `createProjectButton-main.tsx`

Wrapper đơn giản:
```tsx
export function CreateProjectButton() {
  return <CreateProjectDialog />;
}
```
Đặt tên riêng để dùng trong view; tất cả visual behavior được delegate về `CreateProjectDialog`.

### 3.4. Primary CTA pill — `createProject-main.tsx` (trigger)

**Class root**:
```
inline-flex h-11 items-center gap-2.5 rounded-full
bg-primary pl-5 pr-1.5
text-[13px] font-medium text-primary-foreground
shadow-[0_18px_50px_-22px_color-mix(in_oklab,var(--primary)_65%,transparent)]
hover:bg-primary/90
focus-visible:ring-4 focus-visible:ring-primary/20
transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
```

**Icon slot**: `span class="grid size-8 place-items-center rounded-full bg-primary-foreground/12"` chứa `<Plus size-4 stroke-width-2 />`.

**Motion**: `whileHover={pressHoverStrong}` · `whileTap={pressTapStrong}` · `transition={SPRING_PRESS}`.

**Label chuẩn**: "New project" (whitespace-nowrap).

### 3.5. Dialog — header + form

**Wrapper**:
- `DialogContent` với `showCloseButton={false}`, `className="gap-0 rounded-3xl border-0 bg-transparent p-0 ring-0 sm:max-w-130"`.
- Outer ring: `rounded-3xl p-1.5` (tạo "double layer" 6px).
- Inner shell: `overflow-hidden rounded-[calc(1.5rem-0.375rem)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`.

**Header row** (3-col grid):
- Grid: `grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-7`
- Icon badge (Frame):
  - Outer: `rounded-2xl bg-primary/10 p-1.5 ring-1 ring-inset ring-primary/15`
  - Inner: `grid size-11 place-items-center rounded-[calc(1rem-0.375rem)] bg-card text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`
  - Icon: `size-5 strokeWidth={1.75}`
- DialogHeader: `min-w-0 gap-1.5 pt-0.5 text-left`
  - Title: `font-heading text-[19px] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[20px]`
  - Description: `max-w-[34ch] text-[13px] font-normal leading-relaxed text-muted-foreground`
- Close button (icon only):
  - `grid size-9 place-items-center rounded-full bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50`
  - Motion: `iconHover` / `iconTap`.
  - Icon: `<X size-4 />`.

**Header motion**:
- `initial={reduceMotion ? false : { opacity: 0, y: 10 }}`
- `animate={{ opacity: 1, y: 0 }}`
- `transition={enterTransitionFor(reduceMotion)}` (duration 0.55s, FLUID).

**Form body**:
- Wrapper: `px-5 pb-5 sm:px-7 sm:pb-7`
- Motion: `initial={reduceMotion ? false : { opacity: 0, y: 14 }}` · `animate={{ opacity: 1, y: 0 }}` · `transition={reduceMotion ? { duration: 0 } : { duration: 0.6, delay: 0.06, ease: EASE_FLUID }}`
- `FieldGroup className="gap-5"`, mỗi `Field className="gap-2"` với `data-invalid` khi lỗi.

**Label**:
- `text-[12.5px] font-medium text-foreground/85`
- Row label + optional chip: `flex items-center justify-between gap-4` với span `text-[11.5px] font-normal text-muted-foreground/75` mang chữ "Optional".

**Input** (default):
- `h-12 rounded-2xl border border-foreground/8 bg-background/65 px-4 text-[13.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-background focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 aria-invalid:border-destructive/45 aria-invalid:ring-destructive/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`
- Validate: `maxLength={200}` cho name, `maxLength={500}` cho description.
- `autoComplete="off"`, description dùng `autoFocus` (chỉ create), `minLength` không bắt buộc.

**Textarea**:
- `min-h-24 resize-none rounded-2xl ... px-4 py-3 text-[13.5px] leading-relaxed` (cùng token với input).

**Error**:
- `FieldError className="text-[12px] leading-relaxed"` (màu lỗi do Field primitive xử lý).

**Footer actions**:
- Wrapper: `mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end`
- Secondary button (Cancel):
  - `h-11 whitespace-nowrap rounded-full px-5 text-[13px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50`
  - Motion: `pressHover` / `pressTap`.
- Primary submit button:
  - `group inline-flex h-11 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-primary pl-5 pr-1.5 text-[13px] font-medium text-primary-foreground shadow-[0_10px_30px_-16px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-38.5`
  - Nhãn: `{isPending ? "Creating" : "Create project"}` / `{isPending ? "Saving" : "Save changes"}`
  - Icon slot: `span class="grid size-8 place-items-center rounded-full bg-primary-foreground/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:scale-105"`
  - Pending: `<motion.span animate={reduceMotion ? undefined : { rotate: 360, opacity: [0.6, 1] }} transition={{ duration: 0.9, repeat: Infinity, ease: EASE_FLUID }}><Loader2 size-4 /></motion.span>`
  - Idle: `<ArrowRight size-4 strokeWidth={2} />`
  - `aria-live="polite"` để screen reader đọc state.

**Dialog types có trong mainSpace**:
- `CreateProjectDialog`: dùng `trigger` prop + state nội bộ. Submit → close + reset.
- `UpdateProjectDialog`: controlled (`open` / `onOpenChange`). Submit → close; form reset lại khi `open` thay đổi.

### 3.6. Dropdown menu — `settingProject-main.tsx`

**Trigger**:
- `group inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/4 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 data-[state=open]:bg-foreground/4 data-[state=open]:text-foreground`
- Icon: `<MoreVertical size-4.5 transition-transform duration-500 group-data-[state=open]:rotate-90 />`

**Content**:
- `align="end" sideOffset={8} className="w-48 rounded-2xl p-1.5 ring-0"`

**Item pattern**:
- `cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-normal transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:bg-foreground/50`
- Icon slot: `span class="grid size-6 place-items-center rounded-full bg-foreground/4 text-foreground/80"` chứa icon `<size-3.5 />`.
- Destructive variant: `text-destructive/90 focus:bg-destructive/10 focus:text-destructive` với icon slot `bg-destructive/10 text-destructive`.

**Divider**:
- `my-1 h-px bg-foreground/6`

**Mount pattern** (tránh stacking issue):
- Mỗi item mount dialog tương ứng qua `setTimeout(() => setOpenX(true), 0)` sau khi `setOpenMenu(false)`.
- Delete gọi trực tiếp mutation không qua dialog.

**Mounted child dialogs**:
- `<DialogAddMemberProject projectId open onOpenChange />`
- `<UpdateProjectDialog project open onOpenChange />`

### 3.7. Search input (toolbar)

- Wrapper: `relative w-full sm:max-w-xs`
- Icon: `pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70` chứa `<Search size-4 strokeWidth={1.75} />`
- Input: `h-11 w-full rounded-full border-border/80 bg-card pl-10 pr-4 text-[13.5px] shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/70 hover:border-primary/20 focus-visible:border-primary/35 focus-visible:ring-4 focus-visible:ring-primary/10`

**Debounce**: 500ms; reset về page 1 khi search thay đổi.

---

## 4. Interaction & State Patterns

| Tình huống | Pattern |
| --- | --- |
| Submit đang chạy | Disable Cancel + Submit + close button; đổi label + spinner; `aria-live="polite"`. |
| Close dialog pending | `onOpenChange={(next) => { if (!isPending) setOpen(next); }}` |
| Reset form on close | `useEffect(() => { if (!open) reset(...) }, [open, reset])` |
| Re-init form on open | `useEffect(() => { if (open) reset(...) }, [open, project, reset])` |
| Reduced motion | `useReducedMotion()` rồi truyền vào motion factory; luôn có fallback. |
| Hover state | `transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]` |
| Focus ring | Luôn dùng `focus-visible:ring-4` với opacity 10–20. |
| Disabled | `disabled:cursor-not-allowed disabled:opacity-50` (60 cho CTA chính). |
| Loading list | Center full màn, `Loader2 animate-spin motion-reduce:animate-none`. |
| Error list | `rounded-2xl border border-destructive/20 bg-destructive/5`. |
| Empty list | `rounded-2xl border border-border/60 bg-card` + icon badge + title + body. |

---

## 5. Accessibility Conventions

- `aria-label` cho mọi icon-only button (`Create project`, `Close`, `Project actions`).
- `aria-invalid` cho input lỗi + `aria-live="polite"` cho submit button.
- `aria-hidden="true"` cho icon decorations.
- `aria-label` cho avatar overflow (`+N more members`).
- Form dùng `react-hook-form` + `<Field data-invalid>` để wire a11y.
- Focus ring LUÔN dùng `focus-visible:` (không phải `focus:`) để tránh ring khi click chuột.
- `title` cho avatar lấy tên member.

---

## 6. Dark Mode

Áp dụng qua Tailwind `dark:` variant. Quy ước:
- Inset highlight đảo từ `rgba(255,255,255,0.85)` → `rgba(255,255,255,0.04)`.
- Icon badge inner shadow giảm `0.65` → `0.05`.
- Card ring & border giữ nguyên pattern (dùng `foreground/4` & `foreground/8` — tự thích ứng).
- Không hard-code màu nền cụ thể cho component; luôn dùng semantic tokens.

---

## 7. Refactor Checklist

Khi sửa / tạo mới UI trong `mainSpace`, kiểm tra:

- [ ] Dùng semantic tokens (`bg-card`, `text-muted-foreground`, `ring-foreground/4`...), KHÔNG hex.
- [ ] Rounded scale đúng pattern: dialog = `rounded-3xl`, card = `rounded-2xl`, badge lớn = `rounded-2xl` + inner, badge vừa = `rounded-xl`, stat = `rounded-lg`, pill = `rounded-full`.
- [ ] Type scale đúng vai trò (label 12.5px, body 13.5px, dialog title 20px, card title 15.5px).
- [ ] Spacing theo gap scale (1.5 / 2 / 2.5 / 3 / 4 / 5 / 7 / 8).
- [ ] Transition duration **500**, easing **cubic-bezier(0.32,0.72,0,1)** cho mọi màu/box-shadow.
- [ ] Mọi motion phải check `useReducedMotion()`.
- [ ] Icon-only button có `aria-label` và `size-9` / `size-8` grid.
- [ ] Dialog có header 3-col (icon | title/desc | close), close button dùng `iconHover`/`iconTap`.
- [ ] Footer đảo thứ tự trên mobile (`flex-col-reverse sm:flex-row`).
- [ ] Primary CTA có `sm:min-w-38.5` để chống layout shift khi đổi label.
- [ ] Search input pill với icon offset `left-3.5`.
- [ ] Card có `h-full` để grid item đều nhau; dùng `mt-auto` cho footer.
- [ ] Empty/Error state dùng wrapper `rounded-2xl border ...` đồng nhất.
- [ ] Loading state center màn với `h-[calc(100dvh-4rem)]`.

---

## 8. Quick Reference (class snippets)

**Pill CTA (primary)**:
```tsx
className="inline-flex h-11 items-center gap-2.5 rounded-full bg-primary pl-5 pr-1.5 text-[13px] font-medium text-primary-foreground shadow-[0_18px_50px_-22px_color-mix(in_oklab,var(--primary)_65%,transparent)] hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
```

**Icon badge (card)**:
```tsx
className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10"
```

**Icon badge frame (dialog)**:
```tsx
<div className="rounded-2xl bg-primary/10 p-1.5 ring-1 ring-inset ring-primary/15">
  <div className="grid size-11 place-items-center rounded-[calc(1rem-0.375rem)] bg-card text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
    <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
  </div>
</div>
```

**Input (default)**:
```tsx
className="h-12 rounded-2xl border border-foreground/8 bg-background/65 px-4 text-[13.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-background focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 aria-invalid:border-destructive/45 aria-invalid:ring-destructive/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
```

**Search input**:
```tsx
className="h-11 w-full rounded-full border-border/80 bg-card pl-10 pr-4 text-[13.5px] shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/70 hover:border-primary/20 focus-visible:border-primary/35 focus-visible:ring-4 focus-visible:ring-primary/10"
```

**Card (wrapper)**:
```tsx
className="group relative h-full min-h-36 overflow-visible rounded-2xl border border-border/80 bg-card py-0 ring-1 ring-foreground/4 transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border hover:ring-foreground/8"
```

**Stat chip**:
```tsx
<div className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5">
  <Icon className="size-3.5 shrink-0 text-foreground" strokeWidth={1.75} aria-hidden="true" />
  <span className="tabular-nums text-[12.5px] font-semibold leading-none text-foreground">{value}</span>
  <span className="text-[11.5px] font-medium leading-none text-muted-foreground/80">{label}</span>
</div>
```

**Menu item (default)**:
```tsx
className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-normal transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:bg-foreground/50"
```

**Empty/Error banner**:
```tsx
className="rounded-2xl border border-border/60 bg-card px-6 py-12 sm:py-16"
// error: border-destructive/20 bg-destructive/5 text-destructive
```

**Motion wrapper (entry)**:
```tsx
<motion.div
  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={enterTransitionFor(reduceMotion)}
/>
```

**Motion button (primary)**:
```tsx
<motion.button
  whileHover={isPending ? undefined : pressHover(reduceMotion)}
  whileTap={isPending ? undefined : pressTap(reduceMotion)}
  transition={SPRING_PRESS}
  className="..."
/>
```
