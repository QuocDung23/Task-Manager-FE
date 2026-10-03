# Task Schedule — Phase 1 work log

## Mục tiêu

Triển khai tính năng schedule trên FE theo `FE/.AI/FE/plan/schedule-task.md` (đã cập nhật sau khi chốt scope với user):
- Create task KHÔNG có form schedule.
- Task detail có chip schedule: set / reschedule / clear + reminder + lock UX.
- Task card có badge deadline.
- Filter `scheduleState` gắn vào query key.
- Realtime (Socket.IO) join/leave theo task, đồng bộ cache với cron BE.
- UI không thu thập reason.

## Phạm vi phase 1 đã chốt (sau khi hỏi user)

- Reminder dùng dropdown preset (Radix DropdownMenu).
- Filter & cache theo filter nằm trong phase 1.
- Realtime socket nằm trong phase 1.

## C file tạo mới

- `FE/src/features/tasks/utils/task-schedule.ts` — utility thuần cho date/time, validate, presentation, helper locked/terminal.
- `FE/src/features/tasks/utils/task-query-keys.ts` — tập trung key React Query (`taskKeys`).
- `FE/src/features/tasks/hooks/useTaskListFilters.ts` — helper state filter UI.
- `FE/src/features/realtime/socket.ts` — singleton Socket.IO với auth + reconnect.
- `FE/src/features/realtime/hooks/useTaskSocket.ts` — hook join/leave theo `taskId`, sync cache theo event.
- `FE/src/components/tasks/schedule/task-schedule-fields.tsx` — field date / time native.
- `FE/src/components/tasks/schedule/task-schedule-reminder-menu.tsx` — DropdownMenu 6 preset.
- `FE/src/components/tasks/schedule/task-schedule-lock-alert.tsx` — banner lock kèm `lockReason` + `lockedAt`.
- `FE/src/components/tasks/schedule/task-schedule-form.tsx` — form chính: draft, validation, submit.
- `FE/src/components/tasks/schedule/task-schedule-chip.tsx` — trigger trong meta bar.
- `FE/src/components/tasks/schedule/task-schedule-badge.tsx` — compact badge cho task card.
- `FE/src/components/tasks/schedule/task-schedule-filter.tsx` — dropdown filter cho board.
- `FE/src/components/tasks/schedule/index.ts` — barrel exports.

## C file chỉnh sửa

- `FE/src/features/tasks/types/index.ts` — bổ sung response field schedule, `TaskListFilters`, `ClearTaskScheduleRequest`, `UnlockTaskRequest`, `ReminderPresetId`; thu hẹp `TaskStatusAction` enum.
- `FE/src/features/tasks/api/task-api.ts` — `clearSchedule` truyền body, thêm `unlock`, `getAllByListId` nhận filter.
- `FE/src/features/tasks/utils/task-cache.ts` — dùng `taskKeys.lists()` + iterate cache qua `queryCache.findAll` để cập nhật mọi list cache (cả cache có filter). Thêm `removeTaskAcrossCaches`.
- `FE/src/features/tasks/hooks/useTasks.ts` — nhận `{ filters?, enabled? }` và truyền vào query key + params.
- `FE/src/features/tasks/hooks/useTaskSchedule.ts` — `intent: "set" | "reschedule"`, mapping lỗi BE thân thiện, dùng `replaceTaskAcrossCaches`. Thêm `useUnlockTask`.
- `FE/src/features/tasks/hooks/useMoveTask.ts` — dùng `taskKeys.list(listId)` + invalidate để cache có filter sync.
- `FE/src/features/tasks/hooks/useAssignTask.ts` / `useUnassignTask.ts` — dùng `replaceTaskAcrossCaches`/`removeTaskAcrossCaches`.
- `FE/src/features/tasks/hooks/useCreateTask.ts` — invalidate theo `taskKeys.lists()`.
- `FE/src/features/tasks/hooks/useUpdateTask.ts` — bỏ tham số listId không dùng, dùng `replaceTaskAcrossCaches`.
- `FE/src/features/tasks/hooks/useDeleteTask.ts` — dùng `removeTaskAcrossCaches`.
- `FE/src/components/tasks/task-detail/task-detail-meta-bar.tsx` — chuyển sang dùng `<TaskScheduleChip />`.
- `FE/src/components/tasks/task-detail/task-detail-header.tsx` / `task-detail-description.tsx` — dùng `isTaskLocked(task)` từ utility.
- `FE/src/components/tasks/task-detail-content.tsx` — mount `useTaskSocket(task.id)` khi mở detail.
- `FE/src/components/tasks/task-card.tsx` — render `<TaskScheduleBadge />`.
- `FE/src/components/boards/board-dnd-provider.tsx` — dùng `taskKeys.list(listId)`, truyền `taskFilters` xuống `TaskListWrapper`.
- `FE/src/components/boards/detail-board.tsx` — toolbar có `<TaskScheduleFilter />`, disable reorder khi có filter.

## Quyết định kỹ thuật đáng chú ý

- Helper `isTaskLocked`, `isTerminalTask`, `validateTaskScheduleDraft`, `getTaskSchedulePresentation` được dùng xuyên suốt để tránh duplicate logic trong component.
- Cache update phải duyệt mọi query key thuộc `taskKeys.lists()` (kể cả cache có filter) vì BE contract trả `scheduleState` canonical. Vì React Query v5 không truyền `query` vào `setQueriesData` updater, dùng `queryCache.findAll({ queryKey })` rồi `setQueryData` cho từng entry.
- Reorder list bị disable khi filter active để tránh mutation trên cache filtered.
- `useTaskSocket` gọi `socket.connect()` lười biếng, chỉ join/leave khi đang mở detail. Cleanup handler an toàn với React 19 + StrictMode.
- UI không thu thập reason: khi task locked mà BE bắt buộc `reason`, FE gửi fallback constant `"Task rescheduled from overdue lock state via frontend fallback."` rồi surface lỗi BE ra toast.
- Date/time sử dụng native `<input type="date">` / `<input type="time">` và `new Date(y, m, d, hh, mm).toISOString()` để tránh lệch ngày khi múi giờ ≠ UTC. Reminder không bắt buộc timezone hint dài — task detail hiển thị `formatLocalDateTime` (ví dụ `08 Aug 2026, 17:00 (UTC+7)`) ở summary.
- Thư mục realtime đặt dưới `features/realtime` (sockets có thể dùng cho module khác sau này, không chỉ task).

## Kết quả build + lint

- `npm run build` → pass (TypeScript và Vite đều OK).
- `npm run lint` → 4 lỗi pre-existing (xác nhận bằng `git stash` rồi lint trước khi sửa). Mình không tạo thêm lỗi lint mới. Các lỗi pre-existing nằm trong `task-detail-description.tsx`, `task-detail-header.tsx`, `button.tsx`, `sidebar.tsx` — không thuộc scope phase 1 schedule.

## Kiểm tra tích hợp (TODO thủ công)

Cần chạy khi dev mở app + BE chạy:

1. Tạo task chỉ với `name`/`description`, mở detail, bấm chip schedule, đặt deadline + reminder.
2. Reschedule task thường, kiểm tra `rescheduleCount` tăng.
3. Reschedule task `OVERDUE_LOCKED` → form gửi fallback reason, BE phản hồi 200 → trạng thái chuyển `scheduled`.
4. Clear task bình thường.
5. Clear task `OVERDUE_LOCKED` → button Clear disabled.
6. Đợi cron BE đẩy `task:due_soon` / `task:overdue_locked` (hoặc kích hoạt tay) → FE tự cập nhật cache.
7. Mở board, chọn filter `Due soon` → chỉ task `due_soon` hiển thị, drag/drop bị disable.
8. Đổi timezone trình duyệt, tạo task ở UTC+7, kiểm tra hiển thị summary giờ + offset chính xác.

## Đề xuất follow-up

- Bổ sung test ESLint fix cho `task-detail-description.tsx` và `task-detail-header.tsx` (set-state-in-effect) — tách riêng issue.
- Filter UX: thêm date range filter `Due before` / `Due after` (type đã có sẵn trong `TaskListFilters`).
- Thay vì constant fallback reason, hỗ trợ cấu hình qua env hoặc i18n.
- Cân nhắc dùng calendar popover khi cần range picker.
- Khi BE cho phép manual lock, expose nút unlock trong `TaskScheduleChip` thay vì giấu (đã có hook `useUnlockTask`).
- Realtime: nếu user mở nhiều detail cùng lúc, xem xét join global `user:{userId}` để cập nhật badge task card ngay cả khi không mở detail.