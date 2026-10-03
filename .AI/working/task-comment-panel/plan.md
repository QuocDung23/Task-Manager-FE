# Plan triển khai: Refactor TaskDetailContent + Comment panel

## 1. Mục tiêu

- Refactor layout `task-detail-content.tsx` theo brief người dùng:
  - Bỏ `Status` (status của task). Thay bằng `Status action` (hiển thị `task.statusAction` — audit log cuối cùng).
  - 3 features (Schedule, Assignees, Pin tag) nằm trên 1 hàng ngang dưới header.
  - Description giữ nguyên cấu trúc hiện tại.
  - Bỏ hiển thị `idTask` ở footer.
  - Thêm panel Comments bên phải (responsive: stack dọc trên mobile, 2-col trên desktop).
- Triển khai đầy đủ comment theo plan có sẵn `.AI/FE/plan/comment-task.md`.
- Áp dụng design system MainSpace: tokens semantic, motion (EASE_FLUID, SPRING_PRESS, `useReducedMotion`), pattern pill / double-bezel / button-in-button.

## 2. Phạm vi

### 2.1. File mới

| File | Vai trò |
| --- | --- |
| `src/features/tasks/hooks/comment-cache.ts` | Query keys + cache helpers cho infinite pages |
| `src/features/tasks/hooks/useTaskComments.ts` | `useInfiniteQuery` root comments |
| `src/features/tasks/hooks/useTaskCommentReplies.ts` | `useInfiniteQuery` replies |
| `src/features/tasks/hooks/useCreateTaskComment.ts` | Tạo comment gốc (no toast success) |
| `src/features/tasks/hooks/useCreateTaskCommentReply.ts` | Tạo reply + tăng `replyCount` |
| `src/features/tasks/hooks/useUpdateTaskComment.ts` | Edit root / reply (author only) |
| `src/features/tasks/hooks/useDeleteTaskComment.ts` | Soft delete root + cascade replies |
| `src/utils/formatDateTime.ts` | Helper format ngày giờ cho comment |
| `src/components/tasks/comments/task-comment-composer.tsx` | Composer gốc + reply (multiline, Cmd/Ctrl + Enter submit) |
| `src/components/tasks/comments/task-comment-actions.tsx` | Dropdown Edit / Delete |
| `src/components/tasks/comments/task-comment-item.tsx` | Render 1 comment + nested replies + edit / reply state |
| `src/components/tasks/comments/task-comments-section.tsx` | Panel đầy đủ: header, composer, list, empty, error, load more |
| `src/components/tasks/comments/index.ts` | Barrel export |

### 2.2. File sửa

| File | Thay đổi |
| --- | --- |
| `src/features/tasks/types/index.ts` | + `TaskCommentUser`, `TaskComment`, `TaskCommentsResponse`, params, request / response DTOs |
| `src/features/tasks/api/task-api.ts` | + `getComments`, `createComment`, `getCommentReplies`, `createCommentReply`, `updateComment`, `deleteComment` |
| `src/components/tasks/task-detail-content.tsx` | Refactor layout mới: toolbar ngang, panel Comments bên phải, xoá `Status`/`idTask`, đổi `Status action` |

### 2.3. Không thuộc scope

- Realtime Socket.IO (Phase 3 của plan gốc).
- Reply permissions nâng cao (chỉ author thấy Edit/Delete theo plan).
- Confirm dialog riêng cho xoá comment (đang dùng `window.confirm` cho MVP).

## 3. Layout mới của `TaskDetailContent`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header: [icon] Task name (editable)            statusAction badge      [×] │
├──────────────────────────────────────────────────────────────────────────────┤
│ Toolbar ngang:  [Schedule | date]  [Assignees | 2 people]  [Pin tag | pin]  │
├──────────────────────────────────┬───────────────────────────────────────────┤
│ Description (editable)            │ Comments                                  │
│                                   │ ───────────────────────                   │
│ Assignees (chips + add)           │ Composer (avatar + textarea + submit)     │
│                                   │ ───────────────────────                   │
│ Schedule (read-only narrative)    │ List comments (replies nested)            │
│                                   │   - Loading skeletons                     │
│                                   │   - Empty state                           │
│                                   │   - Error + retry                         │
│                                   │   - Load older comments                   │
├──────────────────────────────────┴───────────────────────────────────────────┤
│ Footer: [Close]  [Delete this task →]                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Mobile (`< md`): 1 cột, comments xếp dưới description.
- Desktop (`>= md`): 2 cột, cột phải 420px, cột trái co giãn.
- Footer bỏ dòng `ID: TSK-xxx` (theo brief).

## 4. Tokens & pattern áp dụng

### 4.1. Design tokens (`ui.md`)

- Surface, text, border, primary, focus ring — semantic tokens, KHÔNG `zinc-*` ngoại trừ shadow inset.
- Rounded: dialog wrapper `rounded-2xl`, toolbar pill `rounded-full`, icon badge `rounded-xl`.
- Type: dialog title `text-[17px] font-semibold`, section label eyebrow uppercase tracking, body `text-[13.5px] leading-relaxed`.

### 4.2. Motion

- Mọi `motion.*` gate `useReducedMotion()`.
- Entrance header/body: `enterTransitionFor(reduceMotion)` (0.55s FLUID).
- Form body: `{ duration: 0.6, delay: 0.06, ease: EASE_FLUID }`.
- Button press: `pressHover` / `pressTap` cho CTA, `iconHover` / `iconTap` cho icon-only.
- Spinner: `motion.span animate={{ rotate: 360, opacity: [0.6, 1] }} repeat: Infinity, ease: EASE_FLUID`.

### 4.3. Pattern

- Dialog wrapper: `rounded-2xl border border-border/80 bg-card ring-1 ring-foreground/5 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.18)]` (kế thừa từ phiên bản hiện tại).
- Toolbar pill: `inline-flex h-9 rounded-full border ... tone x` với icon slot là ring tròn nhỏ nhãn label uppercase tracking.
- Delete CTA: button-in-button với `group-hover:translate-x-0.5 group-hover:scale-105`.
- Avatar: dùng `Avatar` / `AvatarImage` / `AvatarFallback` Radix có sẵn, ring `ring-1 ring-inset ring-foreground/5`.

## 5. Comment components chi tiết

### 5.1. `task-comment-composer.tsx`

- Wrapper `rounded-2xl border ... bg-background/65 shadow-[inset_0_1px_0_rgba(...)]`.
- Internal state `value`, `disabled` khi submitting.
- Textarea reset sau submit thành công.
- Submit bằng button (button-in-button) hoặc `Cmd/Ctrl + Enter`.
- Esc gọi `onCancel`.
- Counter `${length}/2000` chỉ hiện khi vượt 75% giới hạn.

### 5.2. `task-comment-actions.tsx`

- Dropdown `DropdownMenu` với 2 item: Edit, Delete (destructive).
- Trigger `MoreHorizontal` icon size-3.5.
- Mount mỗi comment riêng (không dùng portal nested).

### 5.3. `task-comment-item.tsx`

- Render 1 comment (root hoặc reply).
- Tự fetch replies khi `repliesOpen === true` (qua `useTaskCommentReplies` với `enabled`).
- State nội bộ: `repliesOpen`, `replyComposerOpen`, `isEditing`, `editingValue`.
- Author check: `currentUserId === comment.userId` để show actions.
- Edit flow: composer inline; submit bằng `Cmd/Ctrl + Enter`.
- Delete flow: `window.confirm`, gọi mutation, không cần cache update nội bộ (cache helper `applyDeleteComment` xử lý rồi).
- Trả lời: mở composer inline dưới comment hiện tại.

### 5.4. `task-comments-section.tsx`

- 3 vùng: header (count + refresh), composer gốc (always sticky top), list (flex-1 scroll).
- Empty state: `rounded-2xl border border-dashed bg-card/40` + icon primary + heading + body.
- Error state: banner destructive + retry button.
- Loading: 3 avatar + text skeletons.
- Load more comments ở đầu list (cursor pagination theo `createdAt DESC` được BE reverse).

## 6. Cache update helpers (`comment-cache.ts`)

| Helper | Mục đích |
| --- | --- |
| `appendRootComment` | Append vào page đầu tiên của root list (idempotent — skip nếu đã tồn tại) |
| `replaceRootComment` | Replace theo id (dùng cho update) |
| `removeRootComment` | Remove theo id (xoá root) |
| `incrementRootReplyCount` | +1 cho root khi tạo reply |
| `decrementRootReplyCount` | -1 cho root khi xoá reply (max 0) |
| `appendReply` | Append vào page đầu của reply cache (idempotent) |
| `replaceReply` | Replace theo id trong reply cache |
| `removeReply` | Remove theo id trong reply cache |
| `removeManyReplies` | Xoá theo mảng id (xoá root + cascade) |
| `applyDeleteComment` | Switch root vs reply, kết hợp tất cả helper trên theo `DeleteTaskCommentResponse` |

Tất cả helper đều dùng `setQueryData` + `InfiniteData` từ React Query, không bao giờ mutate sâu — chỉ clone page liên quan.

## 7. Acceptance criteria

- TS: 0 lỗi toàn project.
- ESLint `--max-warnings 0`: 0 lỗi ở `src/components/tasks` + `src/features/tasks` + scope liên quan.
- ReadLints sạch.
- TaskDetailContent layout mới đáp ứng:
  - Header có statusAction badge thay cho status.
  - Toolbar 3 pill (Schedule, Assignees, Pin tag) trên 1 hàng.
  - Description giữ nguyên block + section label + edit pencil.
  - Comments panel right (desktop >= md) / stack (mobile < md).
  - Footer bỏ dòng `ID: TSK-xxx`.
- Comment section:
  - Composer hoạt động (gọi `useCreateTaskComment`, optimistic append qua cache helper).
  - Reply composer hoạt động.
  - Edit / Delete bằng dropdown, Edit chỉ hiện với author.
  - Empty / Loading / Error states có đầy đủ.
  - Show replies toggle + reply cache load on demand.
  - Load older comments hoạt động qua `hasNextPage`.

## 8. Trình tự implement

1. Types + API client.
2. Cache helpers + hooks queries / mutations.
3. Helpers (`formatDateTime`).
4. Comment components (Composer → Actions → Item → Section).
5. Refactor `TaskDetailContent`.
6. Verify TS, ESLint, ReadLints.

## 9. Kết quả verify

| Bước | Kết quả |
| --- | --- |
| `npx tsc --noEmit --ignoreDeprecations 6.0` | exit 0 |
| `npx eslint src/components/tasks src/features/tasks src/utils/formatDateTime.ts --max-warnings 0` | exit 0 |
| `npx eslint src/components/{boards,lists,projects,tasks} src/features/{tasks,boards,lists,projects,users} --max-warnings 0` | exit 0 |
| `read_lints` `src/components/tasks` + `src/features/tasks` | sạch |

## 10. Hành động tiếp theo (nếu cần)

- Bật `socket.io-client` + add realtime theo plan Phase 2.
- Polish reply confirmation dialog (thay `window.confirm`).
- Thêm relative time cho comment (`5m ago`, `2h ago`).
- Thêm status `PINNED` cho comment nếu BE mở rộng.
