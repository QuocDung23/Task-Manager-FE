# Plan phát triển Task Schedule trên Frontend

## 1. Mục tiêu

Hoàn thiện tính năng schedule trên FE dựa trên contract hiện có của BE tại `Manage -Task/BE/src/modules/tasks`, thay vì chỉ dừng ở date picker MVP.

Kết quả mong muốn:

- Người dùng vào task detail mới có nút schedule; create-task form không cần kèm deadline hay reminder.
- Có thể schedule, reschedule và clear schedule đúng endpoint và rule nghiệp vụ của BE.
- Hiển thị đầy đủ trạng thái `none`, `scheduled`, `due_soon`, `overdue_locked`, `done` trên task detail và task card.
- Task bị quá hạn/khóa phải có UX rõ ràng: giải thích nguyên nhân, chặn hành động không hợp lệ và ưu tiên luồng reschedule.
- Dữ liệu schedule được cập nhật đồng bộ giữa dialog đang mở và React Query cache của board.
- Chuẩn bị được lớp tích hợp realtime cho các event schedule của BE.
- Xử lý ngày giờ theo local timezone ở UI và gửi ISO UTC cho API để tránh lệch ngày.
- Loại bỏ trường reason trong UI: FE không hiển thị input reason khi schedule/reschedule/clear.

## 2. Nguồn đã khảo sát

### Backend

- `Manage -Task/BE/src/modules/tasks/task.router.ts`
- `Manage -Task/BE/src/modules/tasks/task.controller.ts`
- `Manage -Task/BE/src/modules/tasks/task.service.ts`
- `Manage -Task/BE/src/modules/tasks/task.repository.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/createTask.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/setTaskSchedule.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/clearTaskSchedule.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/unlockTask.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/getAllTask.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts`
- `Manage -Task/BE/src/common/service/taskSchedule-cron.service.ts`
- `Manage -Task/BE/src/configs/task-schedule.config.ts`
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts`
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts`

### Frontend

- `FE/src/features/tasks/types/index.ts`
- `FE/src/features/tasks/api/task-api.ts`
- `FE/src/features/tasks/hooks/useTaskSchedule.ts`
- `FE/src/features/tasks/hooks/useTasks.ts`
- `FE/src/features/tasks/utils/task-cache.ts`
- `FE/src/components/tasks/create-task-dialog.tsx`
- `FE/src/components/tasks/task-card.tsx`
- `FE/src/components/tasks/task-detail-content.tsx`
- `FE/src/components/tasks/task-detail/task-detail-meta-bar.tsx`
- `FE/src/components/tasks/task-detail/task-detail-header.tsx`
- `FE/src/components/tasks/task-detail-context.ts`
- `FE/.AI/design/ui.md`

## 3. Contract backend cần tuân thủ

### 3.1. Task response

BE trả các field schedule sau trong mọi response task:

```ts
type TaskScheduleState =
  | "none"
  | "scheduled"
  | "due_soon"
  | "overdue_locked"
  | "done";

type TaskResponseScheduleFields = {
  dueDate: string | null;
  reminderAt: string | null;
  reminderSentAt: string | null;
  overdueNotifiedAt: string | null;
  lockedAt: string | null;
  lockStatus: "UNLOCKED" | "OVERDUE_LOCKED" | "MANUAL_LOCKED";
  lockReason: string | null;
  rescheduleCount: number;
  completedAt: string | null;
  isLocked: boolean;
  isOverdue: boolean;
  scheduleState: TaskScheduleState;
};
```

Lưu ý:

- FE hiện mới khai báo một phần các field trên.
- `scheduleState` và `isOverdue` nên được xem là dữ liệu canonical từ server; chỉ dùng local derivation làm fallback khi response cũ thiếu field.
- `due_soon` được BE xác định khi `reminderAt <= now < dueDate`.
- `done` dựa trên terminal status action của BE.
- `overdue_locked` có ưu tiên cao hơn trạng thái deadline thông thường.

### 3.2. Tạo task có schedule

```http
POST /task/:listId/tasks
Content-Type: application/json

{
  "name": "Prepare release",
  "description": "Optional",
  "dueDate": "2026-08-08T10:00:00.000Z",
  "reminderAt": "2026-08-08T09:00:00.000Z"
}
```

Rule:

- `name`: bắt buộc, 1–255 ký tự.
- `description`: tối đa 2000 ký tự.
- `reminderAt` chỉ hợp lệ khi có `dueDate`.
- `dueDate` phải ở tương lai.
- `reminderAt` phải ở tương lai và nhỏ hơn `dueDate`.

### 3.3. Set schedule lần đầu

```http
PATCH /task/:taskId/schedule
Content-Type: application/json

{
  "dueDate": "2026-08-08T10:00:00.000Z",
  "reminderAt": "2026-08-08T09:00:00.000Z",
  "reason": "Optional reason"
}
```

- Permission BE: `SCHEDULE_TASK`.
- Không schedule task đã `DONE` hoặc `CANCELLED`.
- Response: `ApiResponse<TaskResponse>`.

### 3.4. Reschedule

```http
PATCH /task/:taskId/reschedule
Content-Type: application/json

{
  "dueDate": "2026-08-10T10:00:00.000Z",
  "reminderAt": "2026-08-10T09:00:00.000Z",
  "reason": "Blocked by dependency"
}
```

- Permission BE: `RESCHEDULE_TASK`.
- FE dùng endpoint này khi task đã có `dueDate` hoặc đang bị khóa.
- Khi task đang locked, `reason` sau trim là bắt buộc.
- Reschedule thành công sẽ reset trạng thái khóa ở repository, tăng `rescheduleCount` và emit `task:rescheduled`.

### 3.5. Clear schedule

```http
DELETE /task/:taskId/schedule
Content-Type: application/json

{
  "reason": "Optional reason"
}
```

- Permission BE: `CLEAR_TASK_SCHEDULE`.
- Body là optional nhưng API client nên hỗ trợ truyền `{ reason }`.
- Không được clear task có `lockStatus === "OVERDUE_LOCKED"`; người dùng phải reschedule trước.
- Response: `ApiResponse<TaskResponse>`.

### 3.6. Unlock riêng

```http
PATCH /task/:taskId/unlock
Content-Type: application/json

{
  "reason": "Required reason"
}
```

- Permission BE: `UNLOCK_TASK`.
- `reason` bắt buộc, 1–1000 ký tự.
- Đây là capability riêng; với overdue schedule, UX chính vẫn nên hướng người dùng sang reschedule để có deadline hợp lệ mới.
- Chỉ bổ sung nút unlock nếu product thực sự muốn expose manual unlock và FE có dữ liệu permission tương ứng.

### 3.7. Filter danh sách task

`GET /task/:listId/tasks` hỗ trợ query:

- `dueBefore=<ISO date>`
- `dueAfter=<ISO date>`
- `scheduleState=none|scheduled|due_soon|overdue_locked|done`
- `lockStatus=UNLOCKED|OVERDUE_LOCKED|MANUAL_LOCKED`

Nếu cùng gửi `dueAfter` và `dueBefore`, `dueAfter` phải nhỏ hơn `dueBefore`.

### 3.8. Realtime và notification

BE emit các event:

- `task:schedule_updated` với `{ taskId, task }`.
- `task:rescheduled` với `{ taskId, task }`.
- `task:unlocked` với `{ taskId, task }`.
- `task:due_soon` với `{ taskId, dueDate, reminderAt }`.
- `task:overdue_locked` với `{ taskId, dueDate, lockedAt, lockStatus }`.
- `notification:new` với các type `TASK_DUE_SOON`, `TASK_OVERDUE_LOCKED`, `TASK_RESCHEDULED`, `TASK_SCHEDULE_UPDATED`, `TASK_UNLOCKED`.
- Client phải emit `task:join` với `{ taskId }` khi mở task detail và `task:leave` khi đóng/đổi task; backend tự join `user:{userId}` khi socket connect.
- Khi join nên xử lý acknowledgement `{ success, error }`, đồng thời cleanup listener và room membership khi unmount.

FE hiện chưa có `socket.io-client` và chưa có realtime layer, nên realtime được tách thành phase sau MVP thay vì chặn schedule form.

## 4. Hiện trạng FE và gap analysis

### Đã có

- `TaskResponse` đã có `dueDate`, `reminderAt`, `lockStatus`, `lockReason`, `isLocked`, `isOverdue`, `scheduleState`.
- `taskApi` đã có `setSchedule`, `reschedule`, `clearSchedule`.
- `useSetTaskSchedule` và `useClearTaskSchedule` đã update list cache và hiển thị toast.
- Task detail đã có `ScheduleChip` trong meta bar.
- UI hiện chọn được ngày, dùng reschedule endpoint nếu task đã có deadline, yêu cầu reason khi task locked và chặn clear `OVERDUE_LOCKED`.
- `updateSelectedTask` đã đồng bộ response mutation vào dialog đang mở.

### Còn thiếu hoặc chưa đúng contract

1. Type response thiếu `reminderSentAt`, `overdueNotifiedAt`, `lockedAt`, `rescheduleCount`, `completedAt`.
2. Tạo task hiện tại đã đúng MVP: chỉ `name` + `description`. KHÔNG cần thêm `dueDate`/`reminderAt` vì schedule sẽ được đặt trong task detail.
3. Form schedule chỉ chọn `date` và luôn ép deadline về cuối ngày; chưa chọn giờ cụ thể.
4. UI chưa cho thiết lập hoặc xóa `reminderAt`.
5. `clearSchedule` không truyền body nên chưa hỗ trợ `reason`.
6. UI đang có input reason; loại bỏ hoàn toàn để giảm gánh nặng UX. FE gửi fallback nếu backend bắt buộc.
7. Chưa chặn schedule/reschedule khi task ở terminal state ngay trên UI.
8. Chưa hiển thị đầy đủ `scheduleState`, `lockReason`, `lockedAt`, `rescheduleCount`.
9. Task card chưa hiển thị due date/due-soon/locked indicator.
10. `useTasks` và API list chưa nhận filter schedule của BE.
11. Cache helper chỉ update đúng `['tasks', task.listId]`; khi query key mở rộng có filters, cần update/invalidate tất cả cache task list liên quan.
12. Chưa có realtime client để phản ánh cron chuyển `due_soon` hoặc `overdue_locked` khi người dùng đang mở board.
13. Chưa có test hạ tầng; cần ít nhất verify TypeScript, ESLint và checklist integration thủ công.
14. FE `TaskStatusAction` đang khai báo thiên về audit action và chưa explicit `DONE`/`CANCELLED`; terminal-state helper phải hỗ trợ chính xác enum BE và vẫn backward-compatible.

## 5. Thiết kế UX đề xuất

### 5.1. Task detail schedule chip

Giữ vị trí `ScheduleChip` trong `task-detail-meta-bar.tsx`, nhưng tách phần popover thành component schedule riêng để giảm kích thước file.

Trigger hiển thị theo state:

- `none`: icon calendar, label `No deadline`.
- `scheduled`: ngày giờ deadline, tone trung tính.
- `due_soon`: icon clock, tone warning, label `Due soon`.
- `overdue_locked`: icon lock, tone destructive, label `Overdue · Locked`.
- `done`: icon check, tone success, hiển thị deadline/completed time ở dạng read-only.

Popover gồm:

- Deadline date.
- Deadline time.
- Reminder toggle.
- Reminder mode dạng preset: `At time`, `15 minutes before`, `30 minutes before`, `1 hour before`, `1 day before`, và `Custom`.
- Summary local timezone trước khi submit, ví dụ `08 Aug 2026, 17:00 (UTC+7)`.
- Primary action `Set schedule` hoặc `Reschedule` theo intent.
- Secondary destructive/ghost action `Clear schedule` khi được phép.

Không cần input reason trên UI. Khi BE yêu cầu `reason` (ví dụ reschedule task đang `OVERDUE_LOCKED`), FE truyền giá trị mặc định hoặc để trống theo rule BE và xử lý lỗi 400 bằng toast.

Không cần thêm thư viện calendar ở phase đầu; dùng native `input[type="date"]` và `input[type="time"]` để phù hợp dependency hiện tại. Chỉ thêm calendar library nếu product yêu cầu range picker hoặc calendar popover nâng cao.

### 5.2. Locked task UX

Khi `scheduleState === "overdue_locked"` hoặc `lockStatus === "OVERDUE_LOCKED"`:

- Trigger schedule chuyển tone destructive.
- Mở popover trực tiếp ở mode `Reschedule required`.
- Hiển thị `lockReason` và `lockedAt` nếu có.
- Deadline mới là bắt buộc; FE không thu thập reason nên backend vẫn có thể trả 400 nếu thiếu. MVP có thể fallback gửi `reason: "Task rescheduled from overdue lock state"`; phase hoàn chỉnh nên cấu hình message qua constant/i18n.
- Ẩn/disable `Clear schedule` kèm giải thích.
- Các phần edit name/description/assignee hiện đã chặn locked; cần giữ cùng ngôn ngữ UX và cung cấp CTA mở schedule để tránh dead-end.

### 5.3. Task card

Bổ sung compact due badge dưới task name hoặc cạnh assignee group:

- Calendar + ngày cho `scheduled`.
- Clock + thời gian tương đối/ngày cho `due_soon`.
- Lock + `Overdue` cho `overdue_locked`.
- Không render badge cho `none`.
- `done` có thể dùng check icon nếu card vẫn còn trong board.

Card không tự tính canonical state từ thời gian mỗi render nếu server đã trả `scheduleState`; chỉ fallback khi field thiếu.

### 5.4. Create task

Không thêm section schedule trong create task. Form chỉ thu thập `name` và `description`. Sau khi tạo, task tồn tại với `scheduleState === "none"` và người dùng vào task detail để schedule.

Behavior kỳ vọng:

- Create task request KHÔNG chứa `dueDate`, `reminderAt`.
- `CreateTaskRequest` type FE bỏ hoặc giữ nhưng optional các field lịch; backend BE có sẵn contract cho phép mở rộng sau nếu cần.
- Sau create thành công, mở detail dialog hoặc highlight task mới để người dùng bấm nút `Schedule`.

### 5.5. Filters

Phase sau UI core:

- Filter `Schedule`: All, No deadline, Scheduled, Due soon, Overdue/locked, Done.
- Optional date range `Due after` / `Due before`.
- Filter được đưa vào query key React Query để cache đúng theo từng tổ hợp.
- Khi mutation schedule làm task không còn thỏa filter hiện tại, invalidate list query thay vì chỉ replace item tại chỗ.

## 6. Kiến trúc FE đề xuất

### 6.1. Types

Cập nhật `FE/src/features/tasks/types/index.ts`:

```ts
export type TaskResponse = {
  // existing fields
  dueDate: string | null;
  reminderAt: string | null;
  reminderSentAt: string | null;
  overdueNotifiedAt: string | null;
  lockedAt: string | null;
  lockStatus: TaskLockStatus;
  lockReason: string | null;
  rescheduleCount: number;
  completedAt: string | null;
  isLocked: boolean;
  isOverdue: boolean;
  scheduleState: TaskScheduleState;
};

export type CreateTaskRequest = {
  name: string;
  description?: string;
  dueDate?: string;
  reminderAt?: string;
};

export type ClearTaskScheduleRequest = {
  reason?: string;
};

export type TaskListFilters = {
  dueBefore?: string;
  dueAfter?: string;
  scheduleState?: TaskScheduleState;
  lockStatus?: TaskLockStatus;
};
```

Nên giữ response schedule fields non-optional để phản ánh đúng contract BE. Nếu cần rollout an toàn với mock cũ, normalize response tại API boundary thay vì phát tán optional field khắp component.

### 6.2. Date/time utilities

Tạo `FE/src/features/tasks/utils/task-schedule.ts` với các pure functions:

- `toLocalDateValue(iso)`.
- `toLocalTimeValue(iso)`.
- `combineLocalDateTimeToIso(date, time)`.
- `resolveReminderAt(dueDateIso, preset, customDate, customTime)`.
- `validateTaskScheduleDraft(draft, now)`.
- `getTaskSchedulePresentation(task, now)`.
- `isTerminalTask(task)`.

Nguyên tắc timezone:

- Input hiển thị local browser time.
- Khi submit, kết hợp local date/time bằng `new Date(year, monthIndex, day, hour, minute)` rồi gọi `.toISOString()`.
- Không parse `YYYY-MM-DD` bằng `new Date(dateString)` vì chuỗi này bị hiểu là UTC và có thể lệch ngày ở UTC+7.
- Khi edit, convert ISO về local date/time bằng getter local.
- Dùng một `now` nhất quán trong validation để tránh boundary race.

### 6.3. API client

Cập nhật `FE/src/features/tasks/api/task-api.ts`:

- `create` nhận request schedule đã mở rộng.
- `clearSchedule(taskId, data?)` truyền body qua Axios config:

```ts
axiosLocal.delete(`/task/${taskId}/schedule`, { data });
```

- `getAllByListId(listId, filters?)` truyền `params`.
- Có thể bổ sung `unlock(taskId, { reason })` ở phase unlock nếu product expose action này.

### 6.4. Query keys và cache

Tạo hoặc chuẩn hóa task query keys:

```ts
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (listId: string, filters?: TaskListFilters) =>
    [...taskKeys.lists(), listId, filters ?? {}] as const,
  detail: (taskId: string) => [...taskKeys.all, "detail", taskId] as const,
};
```

Lưu ý migration:

- Code hiện dùng `['tasks', listId]`; đổi query key cần thực hiện đồng bộ ở `useTasks`, cache helpers, drag/drop cache và mọi mutation liên quan.
- Nếu chưa muốn migration rộng ở phase 1, giữ key hiện tại nhưng dùng `setQueriesData({ queryKey: ['tasks'] })` có predicate/shape guard để update mọi list chứa task.
- Sau set/reschedule/clear, update selected task và mọi list cache phù hợp.
- Khi có filter, invalidate list queries để server quyết định task còn thuộc kết quả hay không.
- Nếu có detail query riêng, set `taskKeys.detail(task.id)` bằng response mới.

### 6.5. Hooks

Refactor `FE/src/features/tasks/hooks/useTaskSchedule.ts`:

- Tách mutation hoặc giữ một hook nhưng dùng intent rõ ràng: `set`, `reschedule`, `clear`.
- `useClearTaskSchedule` nhận `data?: ClearTaskScheduleRequest`.
- Toast success theo action: `Schedule set`, `Task rescheduled`, `Schedule cleared`.
- Map lỗi BE sang message dễ hiểu nhưng vẫn fallback message server.
- Không quyết định `isReschedule` bằng flag rời từ caller nếu có thể derive từ intent helper; locked task luôn dùng reschedule.
- `onSuccess` gọi cache sync chung.

Tạo `useTaskScheduleForm(task)` nếu state form tiếp tục phức tạp, gồm:

- Initial values từ task.
- Derived `mode`, `requiresReason`, `canClear`, `isTerminal`.
- Validation errors theo field.
- Payload ISO đã normalize.
- Reset khi popover mở lại hoặc task response thay đổi.

### 6.6. Components

Đề xuất file mới:

- `FE/src/components/tasks/schedule/task-schedule-chip.tsx`: trigger và state presentation.
- `FE/src/components/tasks/schedule/task-schedule-form.tsx`: form dùng cho detail.
- `FE/src/components/tasks/schedule/task-schedule-fields.tsx`: date/time/reminder fields.
- `FE/src/components/tasks/schedule/task-schedule-badge.tsx`: compact badge cho task card.
- `FE/src/components/tasks/schedule/task-schedule-lock-alert.tsx`: lock reason và CTA reschedule.
- `FE/src/components/tasks/schedule/index.ts`: barrel exports.

File sửa:

- `FE/src/components/tasks/task-detail/task-detail-meta-bar.tsx`: thay implementation schedule inline bằng `TaskScheduleChip`.
- `FE/src/components/tasks/create-task-dialog.tsx`: KHÔNG thêm schedule section; chỉ giữ form name + description như hiện tại.
- `FE/src/components/tasks/task-card.tsx`: render `TaskScheduleBadge`.
- `FE/src/components/tasks/task-detail/task-detail-header.tsx`: dùng terminal/locked helper thống nhất.
- `FE/src/components/tasks/task-detail/task-detail-description.tsx`: dùng locked helper thống nhất.

Lưu ý quan trọng:

- Không thêm trường `reason` ở mọi nơi trong UI. Nếu BE yêu cầu (reschedule locked) thì hook tự gửi giá trị fallback; người dùng không nhập.
- Create task form không truyền `dueDate` hoặc `reminderAt` vì MVP chưa cần.

### 6.7. Permission handling

BE kiểm tra các permission khác nhau cho schedule, reschedule, clear và unlock. FE hiện chưa thấy capability map dành cho task action.

Ma trận tối thiểu cần phản ánh trong UX:

- Board member thông thường có thể `SCHEDULE_TASK`, `RESCHEDULE_TASK`, `CLEAR_TASK_SCHEDULE`.
- `UNLOCK_TASK` không nên hiển thị cho board member thông thường; chỉ project/board admin hoặc capability tương ứng mới thấy action.
- `UPDATE_TASK_STATUS_ACTION` chỉ thành công với assignee active; FE nên disable status action nếu user hiện tại không phải assignee khi đã có đủ dữ liệu identity.
- Với `OVERDUE_LOCKED`, chỉ status action `DONE` được BE cho phép; các trạng thái khác phải ẩn/disable.

Triển khai theo hai mức:

- MVP: luôn render action theo state, để BE là source of truth; khi `403`, toast message rõ và không đóng form. Riêng nút `Unlock` không render nếu chưa có dữ liệu capability.
- Hoàn chỉnh: nếu auth/board API expose permissions, bổ sung `canSchedule`, `canReschedule`, `canClearSchedule`, `canUnlock`, `canComplete`; disable/ẩn action tương ứng và giải thích bằng helper text/tooltip.

Không hard-code role name ở component vì permission thực tế nằm ở BE.

## 7. Validation phía FE

Trước submit phải kiểm tra:

- Có deadline date và time.
- Deadline là thời điểm tương lai, không chỉ so sánh ngày.
- Nếu bật reminder thì reminder phải ở tương lai.
- Reminder phải nhỏ hơn deadline.
- Không submit nếu task là terminal `DONE` hoặc `CANCELLED`.
- Không gọi mutation nếu payload không đổi so với task hiện tại.
- Nếu backend trả 400 về missing reason, hiển thị toast lỗi rõ ràng; FE không tự thu thập reason từ người dùng.

Thông báo lỗi đặt sát field, không chỉ toast. Toast dành cho API/network error hoặc kết quả mutation.

## 8. Error mapping

Các lỗi cần UX riêng:

- `dueDate must be in the future`: focus deadline, báo `Deadline must be in the future`.
- `reminderAt must be in the future`: focus reminder.
- `reminderAt must be before dueDate`: báo ngay dưới reminder.
- `reason is required when rescheduling a locked task`: FE không thu thập reason; hiển thị toast thông báo cần liên hệ admin hoặc fallback reason tự động theo constant nếu backend yêu cầu.
- `Cannot schedule a completed or cancelled task`: chuyển form read-only, refresh task cache.
- `Task is locked because it is overdue...`: hiển thị CTA reschedule, không cho clear/update action liên quan.
- `403`: không có quyền thực hiện action.
- `404`: task không còn tồn tại; đóng detail sau khi thông báo và invalidate list.
- Network/5xx: giữ draft để người dùng retry.

## 9. Realtime phase

### Phase realtime prerequisite

- Thêm `socket.io-client` bằng package manager.
- Tạo socket singleton theo base URL hiện tại và gửi access token theo cơ chế auth của BE.
- Join/leave task room theo contract Socket.IO của BE; cần xác nhận event join room nếu server không tự join từ handshake.

### Event handling

- `task:schedule_updated`, `task:rescheduled`, `task:unlocked`: dùng full `task` payload để sync list/detail cache.
- `task:due_soon`: vì payload partial, invalidate/refetch task hoặc merge cẩn thận rồi set `scheduleState: 'due_soon'`.
- `task:overdue_locked`: invalidate/refetch task để lấy đầy đủ `lockReason`, `isLocked`, `scheduleState`; không chỉ merge partial payload.
- `notification:new`: đưa vào notification store/toast/inbox, tránh hiển thị duplicate nếu mutation local vừa phát toast.

Lifecycle:

- Subscribe khi task detail mở.
- Unsubscribe khi đổi task hoặc đóng dialog.
- Board-level freshness có thể dùng user notifications để invalidate task list ngay cả khi chưa join từng task room.
- Dedupe theo event + taskId + timestamp/payload version nếu sau này BE bổ sung event id.

## 10. Phân kỳ triển khai

### Phase 1 — Contract và utilities

1. Mở rộng `TaskResponse`, `CreateTaskRequest`, clear request và list filter types.
2. Tạo utilities convert local date/time ↔ ISO và validation.
3. Sửa API clear body và API list filters.
4. Chuẩn hóa helper terminal/locked/schedule presentation.

Definition of done:

- Type FE khớp response BE.
- Utilities không dùng parsing `YYYY-MM-DD` theo UTC ngoài ý muốn.
- API payload đúng endpoint và body contract.

### Phase 2 — Task detail hoàn chỉnh

1. Tách schedule UI khỏi `task-detail-meta-bar.tsx`.
2. Thêm deadline time và reminder controls.
3. Thêm reason optional/required theo state.
4. Hiển thị schedule state, lock reason, locked time, reschedule count.
5. Hoàn thiện loading, disabled, error và retry behavior.
6. Đồng bộ selected task + list cache sau mutation.

Definition of done:

- Set, reschedule và clear chạy đúng.
- Locked task chỉ đi được luồng hợp lệ.
- Terminal task read-only.
- Timezone local/UTC không lệch ngày giờ.

### Phase 3 — Task card

1. Thêm schedule badge trên task card.
2. Đảm bảo responsive và keyboard accessibility.
3. Sau khi tạo task không có schedule, người dùng mở detail và bấm `Schedule` để đặt deadline.

Definition of done:

- Tạo task không có schedule thành công.
- Board phản ánh due state mà không cần mở detail.
- Người dùng vào task detail có sẵn nút `Schedule`.

### Phase 4 — Filters và cache theo filter

1. Mở rộng `useTasks(listId, filters)`.
2. Thêm schedule/date filters vào board UI.
3. Chuẩn hóa query keys.
4. Invalidate/remove task đúng khi mutation làm thay đổi kết quả filter.

Definition of done:

- Query gửi đúng params BE.
- Không còn task stale trong filtered view sau schedule mutation.

### Phase 5 — Realtime và notification

1. Thêm socket client.
2. Subscribe schedule events.
3. Sync/invalidate task cache theo full/partial payload.
4. Kết nối `notification:new` vào notification UX.
5. Xử lý reconnect và cleanup listener.

Definition of done:

- Cron chuyển due-soon/overdue được phản ánh khi FE đang mở.
- Không đăng ký listener trùng sau reconnect/remount.

## 11. Thứ tự file implement khuyến nghị

1. `FE/src/features/tasks/types/index.ts`.
2. `FE/src/features/tasks/utils/task-schedule.ts`.
3. `FE/src/features/tasks/api/task-api.ts`.
4. `FE/src/features/tasks/utils/task-cache.ts` hoặc query-key module mới.
5. `FE/src/features/tasks/hooks/useTaskSchedule.ts`.
6. `FE/src/components/tasks/schedule/task-schedule-fields.tsx`.
7. `FE/src/components/tasks/schedule/task-schedule-form.tsx`.
8. `FE/src/components/tasks/schedule/task-schedule-chip.tsx`.
9. `FE/src/components/tasks/task-detail/task-detail-meta-bar.tsx`.
10. `FE/src/components/tasks/create-task-dialog.tsx`: không sửa logic schedule.
11. `FE/src/components/tasks/schedule/task-schedule-badge.tsx`.
12. `FE/src/components/tasks/task-card.tsx`.
13. Filter/query-key files.
14. Realtime/socket files sau cùng.

## 12. Acceptance criteria

### Schedule form

- Chọn được ngày và giờ deadline.
- Chọn/tắt được reminder.
- Reminder preset tạo đúng ISO timestamp.
- Không gửi deadline/reminder quá khứ.
- Không gửi reminder sau hoặc bằng deadline.
- Set lần đầu gọi `/schedule`.
- Đổi schedule hiện có gọi `/reschedule`.
- Clear gọi DELETE đúng endpoint.
- Không clear `OVERDUE_LOCKED`.
- Không schedule terminal task.
- Không hiển thị/không yêu cầu người dùng nhập reason.

### Create task

- Form create task chỉ có `name` và `description`.
- Không gửi `dueDate`/`reminderAt`.
- Sau khi tạo, task có `scheduleState === "none"` và chip schedule trong detail hiển thị CTA `Schedule`.

### Data consistency

- Mutation success cập nhật task đang mở.
- Mutation success cập nhật/invalidate mọi task list cache liên quan.
- Filtered view không giữ item sai state.
- API error không làm mất draft.
- Đóng/mở lại form reset theo dữ liệu task mới nhất.

### Presentation

- Mỗi schedule state có label/tone/icon rõ ràng.
- Task card hiển thị deadline compact.
- Locked state có giải thích và CTA hợp lệ.
- Date/time luôn hiển thị theo local timezone và có timezone hint.
- Light/dark theme dùng semantic token trong `.AI/design/ui.md`.
- Keyboard: tab order hợp lý, Enter submit, Escape đóng khi không đang submit.
- Screen reader: input có label, lỗi có `aria-describedby`, trạng thái async có `aria-live`.

### Realtime

- Full task payload replace cache an toàn.
- Partial cron payload trigger refetch hoặc merge có kiểm soát.
- Listener cleanup khi unmount/đổi task.
- Reconnect không tạo duplicate listener.

## 13. Verify checklist

Chạy tại `FE/` sau từng phase:

```bash
npm run build
npm run lint
```

Integration thủ công tối thiểu:

1. Tạo task chỉ với name và description; không có deadline.
2. Mở task detail, bấm nút `Schedule`, đặt deadline.
3. Reschedule task bình thường.
4. Reschedule locked task: submit và dùng fallback reason của FE.
5. Clear task bình thường.
6. Clear overdue locked task: action bị chặn.
7. Deadline/reminder quá khứ: FE chặn; nếu bypass thì hiển thị lỗi BE đúng.
8. Reminder bằng/sau deadline: FE chặn.
9. Task terminal: schedule form read-only.
10. Reload trang: schedule state vẫn đúng từ server.
11. Kiểm tra timestamp ở timezone UTC+7 và một timezone khác trong DevTools.
12. Sau mutation, task card và dialog cùng cập nhật.
13. Với filter active, task được thêm/xóa khỏi view đúng state.
14. Khi realtime được bật, chờ cron due-soon/overdue và xác nhận UI tự cập nhật.
15. Verify create task form không hiển thị trường schedule.

## 14. Rủi ro và quyết định cần giữ rõ

- BE dùng permission riêng cho từng action nhưng FE chưa có permission map: MVP dựa vào `403`, phase hoàn chỉnh cần capability data.
- BE hỗ trợ `MANUAL_LOCKED` nhưng flow tạo manual lock chưa thấy trong scope task router đã khảo sát; UI không nên giả định cách unlock ngoài contract hiện có.
- `due_soon` phụ thuộc vào điều kiện cron/filter của BE: `reminderAt <= now` hoặc, khi `reminderAt` là null, `dueDate <= now + reminderBeforeMinutes` (mặc định 30 phút). FE không nên chỉ dựa vào `reminderAt` để suy ra state; dùng `scheduleState` từ response/refetch làm canonical.
- Event `task:due_soon` và `task:overdue_locked` trả partial payload, nên refetch an toàn hơn merge tại chỗ.
- Native date/time input là lựa chọn MVP để không tăng dependency; visual calendar nâng cao là enhancement, không phải prerequisite.
- Không tự động gọi `/unlock` sau reschedule; BE đã xử lý schedule state trong transaction, response task mới là source of truth.
- Backend `statusAction` thực tế có các giá trị `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `PAUSED`, `FIXED`, `CANCELLED`; FE type/helper phải không giả định chỉ có các audit action cũ như `CREATED` hoặc `UPDATED`.

## 15. Scope khuyến nghị cho lượt implement đầu tiên

Ưu tiên Phase 1–3 để tạo vertical slice dùng được ngay:

- Contract type đầy đủ.
- Date + time + reminder.
- Set/reschedule/clear đúng rule.
- Không thêm schedule vào create task.
- Không có input reason trên UI.
- Task card badge.
- Cache sync cho board hiện tại.

Để Phase 4–5 thành lượt riêng vì filter query-key migration và realtime socket chạm phạm vi rộng hơn, cần kiểm tra thêm toàn bộ drag/drop cache và auth/socket handshake.
