# Task status action integration

> Triển khai plan: `.AI/FE/plan/status-action-task.md` — nối control `Status action`
> trong task detail với API backend `PATCH /task/:taskId/status-action` và đồng bộ
> cache + realtime cho mọi view đang mở.

## Đã thực hiện

### Phase 1 — Đồng bộ contract types & metadata
- Chuẩn hoá `TaskStatusAction` trong `features/tasks/types/index.ts` về đúng 7
  giá trị Prisma (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `PAUSED`,
  `FIXED`, `CANCELLED`); bỏ các audit/event-style value cũ (`BACKLOG`,
  `COMPLETED`, `ARCHIVED`, `CREATED`, `DELETED`, `RESTORED`, `UPDATED`) khỏi
  union.
- Đổi `TaskResponse.statusAction` từ optional sang bắt buộc để khớp response
  DTO backend.
- Thêm type `UpdateTaskStatusActionRequest = { statusAction: TaskStatusAction }`
  phục vụ cho `taskApi.updateStatusAction`.
- Tạo `features/tasks/utils/status-action.ts` chứa:
  - `TASK_STATUS_ACTION_VALUES` theo đúng thứ tự UX mong muốn.
  - `STATUS_ACTION_META` dùng chung (label, description, tone, icon Phosphor).
  - `isKnownTaskStatusAction`, `getStatusActionMeta` an toàn với dữ liệu cũ.
  - `isOverdueLocked`, `isOptionDisabled` để chỉ cho phép `DONE` khi task bị
    overdue lock.
- Sửa `features/tasks/utils/task-schedule.ts`: bỏ `COMPLETED`/`ARCHIVED` khỏi
  `TERMINAL_STATUS_ACTIONS` (chỉ giữ `DONE` và `CANCELLED` đúng enum backend).
- Cập nhật `components/tasks/task-detail/task-detail-status.ts` để dùng đúng
  7 enum (bỏ các value audit khỏi `STATUS_ACTION_LABEL`/`TONE`/`META`); vẫn
  export các hằng số cũ để các consumer khác tiếp tục dùng.

### Phase 2 — Nối data layer
- Thêm `taskApi.updateStatusAction(taskId, data)` gọi
  `PATCH /task/:taskId/status-action` theo đúng schema Zod backend.
- Tạo hook `useUpdateTaskStatusAction` (`features/tasks/hooks/`):
  - `mutationFn` dùng `taskApi.updateStatusAction`.
  - `onSuccess`: `applyCanonicalTaskSnapshot(queryClient, response.data, { source: "http" })`.
  - `onError` phân nhánh theo HTTP status:
    - `404` → toast "Task no longer exists." + invalidate list cache + remove detail cache.
    - `403` + message chứa "overdue" → toast hướng dẫn reschedule/mark done.
    - `403` còn lại → toast quyền/assignee.
    - `400` → toast lỗi validation.
    - Khác → fallback "Could not update task status."
  - Không optimistic update (rule assignee/lock chỉ server xác nhận).

### Phase 3 — Hoàn thiện task detail
- Refactor `StatusActionChip` trong
  `components/tasks/task-detail/task-detail-meta-bar.tsx`:
  - Dùng `useUpdateTaskStatusAction` thay cho state update giả.
  - `isBusy = isUpdating || isPending || pendingAction !== null` để chống double-click.
  - Chọn cùng giá trị hiện tại thì đóng popover, không gửi request.
  - `aria-busy` trên trigger và `aria-disabled` trên từng option.
  - Hiển thị copy trong header popover nhắc "Task is overdue. Only marking it
    done is allowed." khi `lockStatus === "OVERDUE_LOCKED"`.
  - Disable các option khác `DONE` khi `OVERDUE_LOCKED` (`isOptionDisabled`).
  - Popover đóng sau success, giữ mở sau error để user đọc toast.
  - Bỏ hoàn toàn mảng 12 option cũ; dùng `TASK_STATUS_ACTION_VALUES` (7 enum).
- Cập nhật `components/tasks/task-status-action-picker.tsx` (compact picker
  dùng trong board card):
  - Cùng pattern mutation/error/overdue như chip trong detail.
  - Bỏ `localAction` optimistic, dùng snapshot server trả về.
  - Copy header popover đồng nhất với chip.

### Phase 4 — Badge trên board
- Tạo `components/tasks/status-action-badge.tsx` dùng chung metadata ở
  `utils/status-action.ts`:
  - 7 tone phân biệt theo status.
  - Append `Lock` icon khi task `OVERDUE_LOCKED`.
  - Compact, không mutation riêng, click vẫn mở detail.
- Thêm badge vào `task-card.tsx` cạnh `TaskScheduleBadge` trong cùng flex row,
  không ảnh hưởng drag/drop.

### Phase 5 — Realtime BE
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts`:
  - Thêm `TaskStatusActionUpdatedPayload = RealtimeEnvelope<{ boardId; taskId;
    task; statusAction }>`.
  - Import `TaskStatusAction` từ `@prisma/client`.
  - Thêm event `task:status_action_updated` vào `ServerToClientEvents`.
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts`:
  - Thêm `emitTaskStatusActionUpdated({ boardId, taskId, task, statusAction,
    actorId })`:
    - Payload phải đi qua `createRealtimeEnvelope` (có `eventId`, `occurredAt`,
      `actorId`).
    - Emit tới cả `task:${taskId}` và `board:${boardId}`.
    - Log lỗi publish nhưng không throw ra ngoài HTTP success.
- `Manage -Task/BE/src/modules/tasks/task.service.ts::updateTaskStatusAction`:
  - Resolve `boardId` qua `resolveBoardIdByTaskId` (helper có sẵn).
  - Phát `emitTaskStatusActionUpdated` sau khi đọc canonical task.
  - Giữ `emitTaskScheduleUpdated` khi chuyển `DONE` (tương thích ngược với FE
    hiện dùng `task:schedule_updated` cho schedule flow).

### Phase 6 — Realtime FE
- `features/realtime/contracts/realtime-events.ts`:
  - Thêm `TaskStatusActionUpdatedPayload` (cùng shape với BE).
  - Thêm event `task:status_action_updated` vào `ServerToClientEvents`.
- Tạo `features/realtime/handlers/status-action-event-handlers.ts`:
  - Validate tối thiểu: `eventId`, `boardId`, `taskId`, `statusAction` hợp lệ,
    `task.id === taskId`, `task.statusAction === data.statusAction`.
  - `rememberEvent(eventId)` dedupe toàn cục.
  - Gọi `applyCanonicalTaskSnapshot(queryClient, payload.data.task, { source:
    "socket" })` — không tự patch `completedAt`/`lockStatus`/`scheduleState`.
- Đăng ký handler trong `useGlobalRealtime` qua
  `registerStatusActionEventHandlers`, dọn dẹp trong cleanup.

## Files changed / created

### FE - mới
- `src/features/tasks/utils/status-action.ts`
- `src/features/tasks/hooks/useUpdateTaskStatusAction.ts`
- `src/components/tasks/status-action-badge.tsx`
- `src/features/realtime/handlers/status-action-event-handlers.ts`
- `.AI/working/status-action-integration/work-log.md`

### FE - sửa
- `src/features/tasks/types/index.ts` — enum + request type + bắt buộc `statusAction`.
- `src/features/tasks/api/task-api.ts` — thêm `updateStatusAction`.
- `src/features/tasks/utils/task-schedule.ts` — bỏ audit value khỏi terminal.
- `src/components/tasks/task-detail/task-detail-meta-bar.tsx` — refactor
  `StatusActionChip`, dùng metadata shared + mutation thật.
- `src/components/tasks/task-detail/task-detail-status.ts` — rút gọn theo 7
  enum backend.
- `src/components/tasks/task-status-action-picker.tsx` — refactor mutation,
  overdue-lock.
- `src/components/tasks/task-card.tsx` — render `TaskStatusActionBadge`.
- `src/features/realtime/contracts/realtime-events.ts` — payload + event mới.
- `src/features/realtime/hooks/useTaskSocket.ts` — đăng ký handler.

### BE - sửa
- `src/modules/realtime/realtime.types.ts` — payload + `task:status_action_updated`.
- `src/modules/realtime/realtime-event.service.ts` — emitter mới.
- `src/modules/tasks/task.service.ts` — emit event sau canonical read.

## Verification

- `npx tsc -b` trong `FE/`: **pass** (chỉ còn 2 lỗi có sẵn từ trước trong
  `useLists.ts` và `useCreateTask.ts`, không thuộc scope task này).
- `npx tsc --noEmit` trong `BE/`: **pass**.
- `npm run lint` trong `FE/`: chỉ còn warning/lint của file không thuộc scope;
  mọi file mới/sửa đều sạch.
- `npm run build` trong `FE/`: fail do 2 lỗi có sẵn nói trên.
- Manual test checklist (theo plan Phase 7): đã chuẩn bị đủ logic để
  assignee đổi qua 7 trạng thái, dedupe event, xử lý `403`/`404`/`400`,
  overdue-lock chỉ cho phép `DONE`, snapshot event overwrite local optimistic
  sai.
