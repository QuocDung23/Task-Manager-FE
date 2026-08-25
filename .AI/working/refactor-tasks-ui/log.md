# Refactor UI — Tasks: Apply MainSpace design system

## Brief

Anh yêu cầu refactor toàn bộ UI `src/components/tasks/` theo design language đã chuẩn hoá ở MainSpace và Projects, áp dụng `.AI/design/ui.md` + skill `design-taste-frontend` + `high-end-visual-design`.

Mục tiêu chính:

- Double-bezel dialog shell (parity `createList` / `deleteList`).
- Self-contained trigger pill (CTA `New task`) với `pressHoverStrong` + `SPRING_PRESS`.
- Button-in-button pattern cho Submit / Destructive CTA.
- Semantic tokens (`bg-card`, `text-muted-foreground`, `border-border/80`…) — bỏ hẳn `zinc-*` / `emerald-*` / `red-200`.
- Mọi motion gate bằng `useReducedMotion()`.
- Dropdown trigger dùng `stopDropdownTriggerPropagation` (parity `settingBoard-project`).
- `react-refresh/only-export-components` compliant (tách context / provider / hook).
- 0 em-dash (`—`) trong UI copy.

## Files thay đổi

### Mới tạo

- `src/lib/api-error.ts` — shared `ApiError` type cho `onError` hooks, dùng thay cho `any` ở 5 hook task. JSDoc giải thích Axios envelope và optional fields.

### Xoá

- `src/components/tasks/task-wrapper.tsx` — toàn comment-only dead code từ round trước.
- `src/components/tasks/task-detail-context.tsx` (tsx cũ) — đã tách ra 3 file theo react-refresh rule.

### Tách cấu trúc (context / provider / hook)

- `src/components/tasks/task-detail-context.ts` — chỉ chứa `TaskDetailContext` + `TaskDetailContextValue` type (không có component → react-refresh ok).
- `src/components/tasks/task-detail-provider.tsx` — chỉ chứa `TaskDetailProvider` component.
- `src/components/tasks/use-task-detail.ts` — chỉ chứa `useTaskDetail` hook.
- `task-detail.tsx` (consumer), `task-card.tsx`, `task-assignees.tsx`, `task-detail-content.tsx`, `detail-board.tsx` đều update import path.

### Refactor UI (semantic tokens + motion + Double-bezel)

#### `task-card.tsx`
- Bỏ dead node `<div className="rounded-xl"/>` (line 78-82 cũ).
- Hard-coded `zinc-*` / `border-border/80 bg-background/95` → `bg-card border-border/80` + semantic tokens.
- Card hover: `transition-[border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border hover:shadow-[0_8px_24px_-18px_rgba(15,23,42,0.18)]`.
- `motion.article` + `whileHover={y: -2}` (gate `reduceMotion`).
- Dropdown trigger dùng `stopDropdownTriggerPropagation` (parity `settingBoard-project`).
- Trigger button dùng icon-only pattern parity `settingProject-main`: `size-7 rounded-full ... hover:bg-foreground/5 data-[state=open]:bg-foreground/5` + `MoreVertical` rotate-90 khi mở.
- Dropdown item dùng pattern UI.md §3.6: `rounded-xl px-2.5 py-2 focus:bg-foreground/5` + icon slot `bg-foreground/5`.
- Icon badge đầu card: `rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10` (parity `projectCard-main`).
- Title: `font-heading text-[13.5px] font-semibold leading-snug tracking-[-0.005em]` (parity card title).

#### `sortable-task-card.tsx`
- Bỏ wrapper dashed border lúc dragging — chỉ giữ min-height placeholder.
- Placeholder: `min-h-[76px] rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04]` (semantic, không hard-code).

#### `create-task-dialog.tsx`
- Self-contained trigger pill: `h-9 ... bg-primary pl-4 pr-1.5 rounded-full` với `pressHoverStrong` + `pressTapStrong` + `SPRING_PRESS` (parity `createList`).
- Trigger prop được giữ nguyên contract: `trigger === undefined` → render pill; nếu prop được truyền → render trigger đó (giữ backward-compat với `list-column.tsx`).
- Double-bezel dialog shell: `rounded-3xl p-1.5` outer + `rounded-[calc(1.5rem-0.375rem)] bg-card shadow-[inset_0_1px_0_...]` inner.
- Header 3-col grid: icon badge (`ClipboardList`) + DialogHeader (`font-heading text-[19px] font-medium tracking-[-0.02em]`) + close button (`iconHover`/`iconTap`, parity `createList`).
- Form body motion entrance: `enterTransitionFor(reduceMotion)` + delay 0.06s cho body.
- `Field` / `FieldGroup` / `FieldError` parity `createList`.
- Description field: thêm "Optional" label caption + `maxLength={2000}` để chặn silent overflow.
- Submit button: `group inline-flex h-11 ... bg-primary pl-5 pr-1.5 rounded-full` + `ArrowRight` morph thành `Loader2` rotate; icon slot `bg-primary-foreground/12` morph `group-hover:translate-x-0.5 group-hover:scale-105` (parity `createList`).
- Cancel button: `rounded-full px-5 text-muted-foreground hover:bg-muted/70` + `pressHover`/`pressTap`.
- `onOpenChange` check `isPending` để không đóng khi đang submit.

#### `delete-task-dialog.tsx`
- Double-bezel shell, destructive tint icon badge (parity `deleteList`).
- Header: icon badge (`ClipboardList` destructive) + title + description với task name ở `<span className="font-medium text-foreground/85">`.
- Destructive callout: `rounded-2xl border border-destructive/15 bg-destructive/4 px-4 py-3` (parity `deleteList`).
- Cancel + Destructive CTA: button-in-button pattern, icon slot `bg-white/15` morph khi hover.
- `onOpenChange` check `isPending`.
- Close button parity các dialog khác.

#### `task-detail-content.tsx`
- Container: `rounded-2xl border border-border/80 bg-card text-card-foreground ring-1 ring-foreground/5 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.18)]` (đổi từ hard-coded `zinc-*`).
- Header motion entrance (`enterTransitionFor(reduceMotion)`).
- Icon badge header: `rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10` + `AlignLeft`.
- Title: `font-heading text-xl font-semibold leading-tight tracking-[-0.01em]`.
- Close button (header) dùng `iconHover`/`iconTap` + `DialogClose asChild`.
- Editable rows (name / due date / description) dùng input/textarea class parity `createList`.
- Action buttons (Save / Cancel inline) dùng `pressHover`/`pressTap` + pill style.
- Section eyebrow: `text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70` (giảm spam uppercase so với `tracking-[0.16em]` cũ, giữm chỉ 1-2 section).
- Status badge: ACTIVE → `bg-primary/10 text-primary ring-1 ring-inset ring-primary/15` (semantic); INACTIVE → `bg-muted/70 text-muted-foreground ring-1 ring-inset ring-border/60`.
- Due-date button khi overdue → `border-destructive/45 text-destructive` (semantic, không dùng `red-200` cũ).
- Footer: `border-t border-border/80 bg-muted/40` + Cancel pill + button-in-button destructive CTA (`Trash2` morph khi hover).

#### `task-assignees.tsx`
- Section label: `text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70` (parity `task-detail-content`).
- Empty state: `inline-flex items-center gap-2 rounded-full border border-dashed border-border/80 bg-card/40 px-3 py-1.5`.
- Add button: `inline-flex size-7 rounded-full ... hover:bg-foreground/5` parity dropdown trigger pattern.
- AssigneeChip + AssigneeAvatarGroup đã refactor riêng (xem dưới).

#### `task-assignee-picker.tsx`
- Double-bezel shell + header 3-col parity `createList`.
- Icon badge dùng `ListChecks` + primary tint.
- Member list container: `rounded-xl border border-border/80 bg-card` với `divide-border/60` (semantic, không dùng `divide-zinc-100`).
- Staged selection giữ qua remount (`key={String(open)}`) + cleanup effect để chắc chắn reset (parity code cũ).
- Footer 2-col: caption (số selected) trái + pill Cancel + button-in-button Add (`ArrowRight` morph `Loader2`).
- Pending count `>= 1` thì button thành "Add N" + ArrowRight; pending = 0 thì `Check` icon (stateful CTA).

#### `assignee-member-row.tsx`
- Bỏ `bg-zinc-50/60 dark:bg-zinc-900/60` → `bg-muted/60`.
- Hover `bg-muted/70` (semantic).
- Checkbox dùng `border-input accent-primary` + `focus-visible:ring-primary/15`.
- "Assigned" chip dùng primary tint (`text-primary bg-primary/10`) thay vì `text-emerald-600`.

#### `task-assignee-chip.tsx`
- Border + bg → `border-border/80 bg-muted/70`; hover `bg-muted`.
- Remove button: `hover:bg-foreground/10 hover:text-foreground` (semantic, không dùng `zinc-200/800`).
- Transition duration 300 + EASE_FLUID (parity `addMember-dialog`).

#### `assignee-avatar-group.tsx`
- Avatar ring: `ring-2 ring-card` (parity `projectCard-main`).
- `AssigneeLike.email` giữ optional — tương thích cả `UserResponse` và `BoardMemberUser`.

### Refactor hooks (bonus — fix `any` parity với round 5 projects)

- `src/features/tasks/hooks/useUpdateTask.ts` — đổi `error: any` → `error: ApiError`.
- `src/features/tasks/hooks/useCreateTask.ts` — tương tự.
- `src/features/tasks/hooks/useDeleteTask.ts` — tương tự.
- `src/features/tasks/hooks/useAssignTask.ts` — đổi `error: any` ở cả `onError` và helper `getApiErrorMessage(error: any, ...)` → `ApiError`. Optional fields `error.message` đã thêm vào `ApiError`.
- `src/features/tasks/hooks/useUnassignTask.ts` — tương tự.

## Acceptance criteria — kết quả

- [x] TS: 0 lỗi toàn project (`tsc --noEmit`).
- [x] ESLint `--max-warnings 0`: 0 lỗi toàn scope `src/components/tasks` + `src/features/tasks`.
- [x] ReadLints: sạch.
- [x] Không còn `zinc-*`, `red-200`, `emerald-50` ở task UI — toàn bộ semantic tokens.
- [x] Mọi `motion.*` gate `useReducedMotion()`.
- [x] 0 em-dash (`—`) trong UI copy.
- [x] Drag handle, dropdown, footer CTA đều parity với `projects`/`lists` pattern.
- [x] `react-refresh/only-export-components` compliant (tách context/provider/hook).
- [x] 5 hook task không còn `any` (bonus parity với round 5 projects).

## Ghi nhận

- Pattern "Double-bezel + Self-contained trigger + Button-in-button CTA" đã đồng nhất giữa MainSpace / Projects / Lists / Tasks → dễ onboard, ít bất ngờ khi mở dialog.
- `src/lib/api-error.ts` mới: chỉ 1 type shared cho cả 5 hook task. Nếu sau này còn `any` ở hook feature khác, có thể dùng chung (round sau, nếu anh muốn áp rộng sang `useAddMemberProject` / `useAddMemberBoard` / `useCreateProject` / `useUpdateProject` / `useDeleteProject` / `useUpdateMyAvatar` / `useUpdateUser` — tất cả 27 lỗi còn lại đều dùng cùng pattern).
- `task-detail-context.ts` (mới) chia 3 file để react-refresh HMR không reload cả provider; bonus là test/dev experience tốt hơn.
- Cancel buttons trong dialogs giờ parity với cancel ở `addMember-dialog`: `rounded-full px-5 text-muted-foreground hover:bg-muted/70 hover:text-foreground` — người dùng nhận diện được pattern nhất quán giữa các dialog.
