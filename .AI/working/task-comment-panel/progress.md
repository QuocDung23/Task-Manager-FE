# Task Comment Panel + TaskDetail Refactor — Progress Log

Triển khai theo `.AI/working/task-comment-panel/plan.md` và `.AI/FE/plan/comment-task.md`.

## Tiến độ

| Bước | Trạng thái |
| --- | --- |
| 1. Types + API client | hoàn tất |
| 2. Cache helpers + hooks | hoàn tất |
| 3. Helpers (`formatDateTime`) | hoàn tất |
| 4. Comment components | hoàn tất |
| 5. Refactor TaskDetailContent | hoàn tất |
| 6. Verify (TS / ESLint / ReadLints) | hoàn tất |

## Kết quả verify

- `npx tsc --noEmit --ignoreDeprecations 6.0` → exit 0
- `npx eslint src/components/tasks src/features/tasks src/utils/formatDateTime.ts --max-warnings 0` → exit 0
- `npx eslint src/components/{boards,lists,projects,tasks} src/features/{tasks,boards,lists,projects,users} --max-warnings 0` → exit 0
- ReadLints `src/components/tasks` + `src/features/tasks` → sạch

## File mới (15)

### Types / API / cache / hooks (8)

- `src/features/tasks/hooks/comment-cache.ts`
- `src/features/tasks/hooks/useTaskComments.ts`
- `src/features/tasks/hooks/useTaskCommentReplies.ts`
- `src/features/tasks/hooks/useCreateTaskComment.ts`
- `src/features/tasks/hooks/useCreateTaskCommentReply.ts`
- `src/features/tasks/hooks/useUpdateTaskComment.ts`
- `src/features/tasks/hooks/useDeleteTaskComment.ts`

### Utils (1)

- `src/utils/formatDateTime.ts`

### Comment components (5)

- `src/components/tasks/comments/task-comment-composer.tsx`
- `src/components/tasks/comments/task-comment-actions.tsx`
- `src/components/tasks/comments/task-comment-item.tsx`
- `src/components/tasks/comments/task-comments-section.tsx`
- `src/components/tasks/comments/index.ts` (barrel)

## File sửa (3)

- `src/features/tasks/types/index.ts` (+ TaskComment + DTOs + params)
- `src/features/tasks/api/task-api.ts` (+ 6 comment methods)
- `src/components/tasks/task-detail-content.tsx` (refactor layout mới)

## Thay đổi chính ở TaskDetailContent

- Bỏ block `Status` (status gốc của task).
- Thêm badge `Status action` trong header — hiển thị `task.statusAction` với tone theo action (CREATED/UPDATED → primary, COMPLETED → success, ARCHIVED → muted, DELETED → destructive).
- Thêm toolbar ngang dưới header gồm 3 pill: Schedule (Due Date), Assignees, Pin tag. Mỗi pill có icon ring + label uppercase + value.
- Description giữ nguyên block gốc, không thay đổi UX.
- Bỏ dòng `ID: TSK-xxx` ở footer.
- Body 2-col trên `md`, 1-col trên mobile — cột phải là `<TaskCommentsSection />`.
- Footer CTA: bỏ nút Cancel riêng, đổi thành `Close` (ghost) + giữ `Delete this task` (button-in-button destructive).

## Ghi chú thiết kế

- Composer sử dụng internal state, reset sau submit thành công.
- Comment cache thuần `setQueryData` với `InfiniteData`, không bao giờ mutate sâu; append / replace đều idempotent theo id (chống duplicate nếu sau này bật realtime).
- Edit / Delete chỉ hiển thị với author (`comment.userId === currentUserId`) đúng plan.
- Delete dùng `window.confirm` cho MVP; Phase 2 (polish) sẽ thay bằng dialog riêng.
- Composer hỗ trợ `Cmd/Ctrl + Enter` submit + `Esc` cancel.
- Reply cache chỉ `enabled` khi người dùng mở "Show replies" hoặc sau khi tạo reply.
