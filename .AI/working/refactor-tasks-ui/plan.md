# Plan — Refactor UI `src/components/tasks/` theo design system MainSpace

## 1. Mục tiêu

Đồng nhất UI trong `src/components/tasks/` với design language đã chuẩn hoá ở MainSpace và Projects (xem `.AI/design/ui.md`):

- Double-bezel dialog shell cho tất cả dialog (create / delete).
- Typography `font-heading` (Manrope) cho dialog title, card title.
- Rounded scale đúng: `rounded-3xl` (dialog wrapper), `rounded-2xl` (card, empty state, icon badge), `rounded-xl` (icon badge vừa), `rounded-full` (pill CTA, input, menu items).
- Spacing tokens theo gap scale (1.5 / 2 / 2.5 / 3 / 4 / 5 / 7 / 8).
- Motion: dùng `EASE_FLUID` + `SPRING_PRESS` + `pressHover` / `pressTap` + `enterTransitionFor` từ `src/lib/motion.ts` (đã chuẩn hoá từ round trước).
- Tokens semantic (`bg-card`, `text-muted-foreground`, `ring-foreground/4`…) — KHÔNG hard-code `zinc-*` ở task UI.
- Mọi motion gate bằng `useReducedMotion()`.
- Button-in-button trailing icon pattern cho CTA chính (đặc biệt là Create/Submit/Delete confirm).
- Dropdown trigger dùng `stopDropdownTriggerPropagation` từ `@/lib/dropdown-trigger` (đã có).

## 2. Phạm vi refactor (10 file)

### Trong scope

1. `src/components/tasks/task-card.tsx`
2. `src/components/tasks/sortable-task-card.tsx`
3. `src/components/tasks/create-task-dialog.tsx`
4. `src/components/tasks/delete-task-dialog.tsx`
5. `src/components/tasks/task-detail-content.tsx`
6. `src/components/tasks/task-detail.tsx`
7. `src/components/tasks/task-detail-context.tsx`
8. `src/components/tasks/task-assignees.tsx`
9. `src/components/tasks/task-assignee-picker.tsx`
10. `src/components/tasks/assignee-member-row.tsx`
11. `src/components/tasks/task-assignee-chip.tsx`
12. `src/components/tasks/assignee-avatar-group.tsx` (chỉ polish nhỏ)
13. `src/components/tasks/task-wrapper.tsx` (chỉ xoá comment dead-code)

### Ngoài scope (giữ nguyên)

- `src/components/boards/`, `src/components/lists/`, `src/components/projects/` — đã refactor ở round trước.
- Data layer (`src/features/tasks/**`) — chỉ fix bonus bug `any` ở `useUpdateTask.ts` (giống pattern round 1).
- Hooks `useCreateTask`, `useDeleteTask`, `useAssignTask`, `useUnassignTask` — không thuộc UI, ngoài scope.

## 3. Tokens & Pattern áp dụng

### 3.1. Tokens (lấy từ `.AI/design/ui.md`)

| Token | Vai trò |
|---|---|
| `bg-card`, `bg-background`, `bg-muted/70`, `bg-muted/60`, `bg-foreground/4` | Surface |
| `text-foreground`, `text-muted-foreground`, `text-muted-foreground/85` | Text |
| `border-border/80`, `border-border/60`, `border-foreground/8` | Border |
| `bg-primary`, `bg-primary/10`, `text-primary`, `ring-primary/10`, `ring-primary/20` | Primary |
| `ring-accent/10`, `ring-accent/15` | Accent focus |
| `bg-destructive/10`, `text-destructive`, `border-destructive/45` | Destructive |

### 3.2. Type scale (UI.md §2.2)

| Vai trò | Class |
|---|---|
| Dialog title | `font-heading text-[19px] font-medium leading-tight tracking-[-0.02em]` → `text-[20px]` sm |
| Section label | `text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70` |
| Body | `text-[13.5px] leading-relaxed text-muted-foreground` |
| Form label | `text-[12.5px] font-medium text-foreground/85` |
| Caption | `text-[11.5px] font-normal text-muted-foreground/75` |
| Stat | `tabular-nums text-[12.5px] font-semibold leading-none` |

### 3.3. Rounded scale (UI.md §2.3)

| Vai trò | Class |
|---|---|
| Dialog wrapper | `rounded-3xl` outer + `rounded-[calc(1.5rem-0.375rem)]` inner |
| Card | `rounded-2xl` |
| Icon badge (dialog) | `rounded-2xl` outer + `rounded-[calc(1rem-0.375rem)]` inner |
| Icon badge (card) | `rounded-xl` |
| Pill CTA / input / menu | `rounded-full` |
| Stat chip | `rounded-lg` |

### 3.4. Elevation

- Dialog wrapper: `bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]` + `dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`
- Input: `shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)]` light / `dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`
- Icon badge inner: `shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)]` + dark 0.08
- Primary CTA: `shadow-[0_*px_*px_-*px_color-mix(in_oklab,var(--primary)_65%,transparent)]`

### 3.5. Motion (UI.md §2.6 + `src/lib/motion.ts`)

- Entrance dialog body: `enterTransitionFor(reduceMotion)` (0.55s EASE_FLUID)
- Form body: `{ duration: 0.6, delay: 0.06, ease: EASE_FLUID }` (gate `reduceMotion`)
- Button press: `pressHover` / `pressTap` cho in-dialog button, `pressHoverStrong` / `pressTapStrong` cho primary trigger
- Icon-only close: `iconHover` / `iconTap` (1.05 / 0.95)
- Spinner: `motion.span animate={{ rotate: 360, opacity: [0.6, 1] }} transition={{ duration: 0.9, repeat: Infinity, ease: EASE_FLUID }}`
- Hover transition: `transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`

## 4. Thay đổi chi tiết theo file

### 4.1. `task-card.tsx`

- Đổi hard-coded `zinc-*` → semantic tokens (`bg-card`, `border-border/80`, `bg-muted/70`, …).
- Bỏ `<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-primary">` (line 78-82 — rỗng, dead node).
- Icon badge thành `rounded-xl bg-secondary/70 text-muted-foreground` (matching list-column).
- Card hover: `transition-[border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border hover:shadow-[...]` + `whileHover={reduceMotion ? undefined : { y: -2 }}` motion.
- Dropdown trigger: spread `{...stopDropdownTriggerPropagation}`.
- Dropdown menu item: dùng pattern menu item (UI.md §3.6) — `cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] focus:bg-foreground/50`.
- Assignee row: `flex justify-end` → `flex items-center justify-between gap-2 mt-1` để có footer gọn.

### 4.2. `sortable-task-card.tsx`

- Drop `border-dashed border-primary/40 bg-primary/5` placeholder (gây giật) — thay bằng dot indicator cạnh card đang trống hoặc bỏ (để gap hiện rõ).
- Box-shadow khi `isDragging` overlay: `ring-2 ring-foreground/10 shadow-[0_24px_48px_-16px_rgba(15,23,42,0.18)]`.
- `z-index` giữ nguyên (10).

### 4.3. `create-task-dialog.tsx`

- Self-contained trigger: `<motion.button>` pill với icon `<Plus>` (parity `createList-dialog`).
- Double-bezel dialog shell (`rounded-3xl p-1.5` outer + `rounded-[calc(1.5rem-0.375rem)] bg-card` inner).
- Header 3-col: icon badge (ListPlus/ClipboardCheck) + DialogHeader + close button (iconHover/iconTap).
- Form body motion entrance.
- Submit button: button-in-button pattern (`group ... bg-primary pl-5 pr-1.5` với `<ArrowRight>`/`Loader2` morph).
- Cancel button: `rounded-full px-5 text-[13px] text-muted-foreground hover:bg-muted/70 hover:text-foreground` + `pressHover`/`pressTap`.
- Input: dùng class input từ UI.md §3.5.

### 4.4. `delete-task-dialog.tsx`

- Double-bezel shell, destructive tint cho icon badge (`bg-destructive/10` outer + destructive inner).
- Header: icon (Trash/ListPlus), title `Delete task`, description với tên task.
- Danger callout box (parity `delete-list-dialog`): `rounded-2xl border border-destructive/15 bg-destructive/[0.04]`.
- Submit button: `bg-destructive` + button-in-button với `<Trash>` icon, `aria-live="polite"`.
- Cancel button: parity create-dialog.

### 4.5. `task-detail-content.tsx`

- Container: `rounded-2xl border border-border/80 bg-card text-card-foreground shadow-[...]` thay cho `rounded-2xl border border-zinc-200/80 bg-white text-zinc-950 shadow-[...]` (đổi sang semantic tokens).
- Header: 3-col grid với icon badge + title + close (parity dialog style).
- Section label: dùng class eyebrow `text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70` (giảm uppercase spam — chỉ 1-2 section).
- Editable rows dùng input/textarea class từ UI.md.
- Footer: `border-t border-border/80 bg-muted/50` + Cancel pill + destructive CTA pill.
- Bỏ dead node `<div className="rounded-xl"/>` line 171.

### 4.6. `task-detail.tsx`

- Refactor nhỏ: type-safe props + dùng `font-heading` cho `DialogTitle` (sr-only) — giữ nguyên logic.

### 4.7. `task-detail-context.tsx`

- Giữ logic không đổi. Có thể giữ nguyên hoặc chỉ polish typing (không thay đổi gì nếu đã clean).

### 4.8. `task-assignees.tsx`

- Section label: dùng eyebrow style.
- Empty state: `rounded-xl border border-dashed border-border/80 bg-card/40 px-3 py-2 inline-flex items-center gap-2`.
- Add assignees button: parity dropdown trigger pattern.

### 4.9. `task-assignee-picker.tsx`

- Double-bezel shell, header với icon badge + title + close.
- Member list container: `rounded-xl border border-border/80 bg-card overflow-hidden` (bỏ divide-zinc-100).
- Member rows (delegate xuống `AssigneeMemberRow`).
- Footer: pill Cancel + pill CTA Add (`button-in-button`).
- Bỏ `key={String(open)}` remount hack — thay bằng `useEffect` reset `pendingIds` khi đóng.

### 4.10. `assignee-member-row.tsx`

- Đổi `bg-zinc-50/60 dark:bg-zinc-900/60` → `bg-muted/60`.
- Đổi `hover:bg-zinc-50 dark:hover:bg-zinc-900` → `hover:bg-muted/70`.
- Checkbox: `border-input accent-primary` (semantic).

### 4.11. `task-assignee-chip.tsx`

- Đổi `border-zinc-200 bg-zinc-100 text-zinc-700` → `border-border bg-muted text-foreground/85`.
- Remove button: parity pattern.

### 4.12. `assignee-avatar-group.tsx`

- Type mở rộng: cho phép `AssigneeLike.email` optional (đã optional sẵn — OK).
- Polish nhỏ.

### 4.13. `task-wrapper.tsx`

- File toàn comment — xoá sạch.

## 5. Bonus — fix `any` ở `useUpdateTask.ts`

Parity với `refactor-projects-ui/log.md` round 5, đổi `onError: (error: any)` → `onError: (error: ApiError)` với `ApiError` local type:

```ts
type ApiError = {
  response?: { status?: number; data?: { message?: string } };
};
```

## 6. Trình tự implement

1. **Foundation**: polish hooks (`useUpdateTask`) + bỏ dead code (`task-wrapper.tsx`).
2. **Primitives**: `assignee-avatar-group.tsx`, `assignee-member-row.tsx`, `task-assignee-chip.tsx` (nhỏ, không phụ thuộc nhau).
3. **Task card**: `task-card.tsx`, `sortable-task-card.tsx`.
4. **Assignee flow**: `task-assignees.tsx`, `task-assignee-picker.tsx`.
5. **Detail panel**: `task-detail.tsx`, `task-detail-content.tsx`, `task-detail-context.tsx`.
6. **Dialogs**: `create-task-dialog.tsx`, `delete-task-dialog.tsx`.
7. **Verify**: TS, ESLint, ReadLints.

## 7. Acceptance criteria

- TS: 0 lỗi toàn project.
- ESLint `--max-warnings 0`: 0 lỗi.
- ReadLints: sạch.
- 0 em-dash (`—`) xuất hiện trong UI copy.
- Không còn hard-code `zinc-*`, `red-200`, `emerald-50` ở task UI — semantic tokens.
- Mọi `motion.*` đều gate `useReducedMotion()`.
- Drag handle, dropdown, footer CTA đều parity với projects/lists pattern.