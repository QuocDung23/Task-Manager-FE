# Review: Task Schedule Feature (FE)

> Review date: 2026-09-15
> Scope: `FE/src/features/tasks/utils/task-schedule.ts`, `FE/src/features/tasks/hooks/useTaskSchedule.ts`, `FE/src/components/tasks/schedule/*`

---

## Follow-up Review (2026-09-15) — Re-check "đã ổn chưa"

> Re-review toàn bộ thay đổi sau khi fix (BE + FE). `tsc --noEmit` cả 2 repo đều pass.
> Vẫn còn 1 bug thật + 1 behavior issue cần quyết định, và vài issue nhỏ.

### [P1] `task.res.ts:174` — Nhánh `due_soon` (Case 2) cho task không có `reminderAt` là dead code

**File:** `Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts:174`

```ts
this.dueSoonBefore = dueDate ? new Date(dueDate.getTime() - reminderMs) : null;  // = dueDate - 30ph

// Case 2
if (
  !this.reminderAt &&
  this.dueSoonBefore &&
  dueDateMs <= this.dueSoonBefore.getTime() &&   // dueDate <= dueDate - 30ph → luôn false
  dueDateMs > now
) {
  return "due_soon";
}
```

`dueDate <= (dueDate - reminderMs)` không thể đúng với `reminderMs > 0`, nên Case 2 không bao
giờ chạy. Hệ quả: task **không có** `reminderAt` **không bao giờ** được DTO trả
`scheduleState = "due_soon"` — dù cron `processDueReminders` (task.service.ts:1027) và filter
`due_soon` của repository (task.repository.ts:153) vẫn coi nó là due_soon
(dùng `dueDate <= now + window`, tương đương toán học).

Kết quả: task trong cửa sổ nhắc sẽ vẫn **lọc ra ở filter `due_soon`** nhưng **FE hiển thị
"scheduled"** (neutral) cho tới khi quá hạn thì nhảy thẳng sang `overdue_locked`.

**Fix:** Điều kiện đúng phải so với `now`, không so với `dueDate`:

```ts
if (
  !this.reminderAt &&
  this.dueSoonBefore &&
  dueDateMs > now &&
  now >= this.dueSoonBefore.getTime()
) {
  return "due_soon";
}
```

---

### [P2] `task.service.ts:818` — `startDate: dto.startDate ?? null` sẽ xoá sạch `startDate` cũ khi client không truyền

**File:** `Manage -Task/BE/src/modules/tasks/task.service.ts:818`

`startDate` là **optional** trong `SetTaskScheduleRequestDto`, nhưng repository `updateTaskSchedule`
(task.repository.ts:600) dùng `?? null` nên không phân biệt được "không truyền" với "muốn xoá".
Client gọi `PATCH /schedule` chỉ với `dueDate` sẽ vô tình mất `startDate` đang có.

Form FE luôn gửi `startDate` nên trong app không xảy ra — nhưng API contract nên rõ ràng:
dùng `undefined` để giữ nguyên khi không truyền, hoặc bắt buộc `startDate` như field của schedule.

---

### [P3] JSDoc bị gắn nhầm method — `task.service.ts:1191`

Block comment `Process overdue locks / NOTE (BE-4)...` đang nằm trên `updateTaskStatusAction`
thay vì `processOverdueLocks` (task.service.ts:1106), và làm mất JSDoc cũ của
`updateTaskStatusAction` (quy tắc "chỉ assignee active mới đổi statusAction").

---

### [P3] Audit `taskScheduleEvents` mất `oldStartDate` — `task.repository.ts:623`

Metadata của schedule event hardcode `oldStartDate: null` dù `setTaskSchedule` có sẵn `task.startDate`
(service ghi đúng vào `taskActivity`, nhưng không vào event). Không nhất quán với `clearTaskSchedule`
vốn có truyền `oldStartDate`.

---

### [P3] FE `due_soon` — `labelBase` (date range) là dead code — `FE/src/features/tasks/utils/task-schedule.ts:213`

Trong nhánh `due_soon`, `relative = formatRelativeFromIso(...)` luôn khác null (vì `dueDate` hợp lệ),
nên `label` luôn là `"Due soon · <relative>"` và `labelBase` (tính `formatDateRange(startDate, ...)`)
không bao giờ được dùng. Chip ở trạng thái due_soon không hiển thị dải "start → due";
nếu đó là ý đồ, `labelBase` nên được ưu tiên khi có `startDate`.

### Typos doc (ngoài lề)

- `Manage -Task/AI/Learning/realtime-learning.md:1` — tiêu đề dính `lc#`.
- `Manage -Task/AI/Learning/01-realtime.types.md` — `task:。`, `Record<strixng, never>`, table comment kèm dòng trống thừa.

---

## Turn 3 Review (2026-09-15) — Re-check sau khi fix P1/P2

> Các bug P1 (resolveScheduleState dead code) và P2 (startDate `?? null`) trước đây đã được fix.
> Chỉ còn lại 1 issue Medium + vài Low/Info.

### [P2] `clearTaskSchedule` (repository) không ghi `oldStartDate` vào audit metadata

**File:** `Manage -Task/BE/src/modules/tasks/task.repository.ts:675-683`

Service truyền đúng `oldStartDate` vào args (`oldStartDate?: Date | null`), nhưng method
`clearTaskSchedule` trong repository **bỏ qua** nó trong `taskScheduleEvents.create`:

```ts
await tx.taskScheduleEvents.create({
  data: {
    taskId: args.taskId,
    actorId: args.actorId,
    type: TaskScheduleEventType.SCHEDULE_CLEARED,
    oldDueDate: args.oldDueDate ?? null,
    newDueDate: null,
    reason: args.reason,
    // missing: oldStartDate
  },
});
```

`updateTaskSchedule` đã ghi đủ `oldStartDate`/`newStartDate` vào metadata — `clearTaskSchedule`
nên ghi `metadata: { oldStartDate: args.oldStartDate?.toISOString() ?? null }` để audit trail đầy đủ.

---

### [P3] Tip + typos doc

- `Manage -Task/AI/Learning/realtime-learning.md:1` — tiêu đề bị dính `lc#` **chưa được fix**.
- `Manage -Task/AI/Learning/01-realtime.types.md:189` — typo `Record<strixng, never>` **chưa được fix**. (Bản in-line `task:。` và table reformat đã dọn.)

---

### [P3] Error message "Start date must be before" — misleading

**File:** `FE/src/features/tasks/utils/task-schedule.ts:135-136`

```ts
} else if (new Date(startIso).getTime() > new Date(dueIso).getTime()) {
  errors.startDate = "Start date must be before the deadline.";
}
```

Validation dùng `>` nên `start == due` là hợp lệ, nhưng message nói "must be before" (ngụ ý
equal không được phép). BE (`task.service.ts:104`) cùng dùng `>`, nên logic nhất quán — chỉ
message nên đổi thành "Start date must be on or before the deadline."

---

### [P3] `inferPresetFromInterval` — `diffMinutes <= 0` trả `AT_TIME` che giấu lỗi data

**File:** `FE/src/features/tasks/utils/task-schedule.ts:328`

```ts
if (diffMinutes <= 0) return "AT_TIME";
```

Nếu `reminderAt` vô tình bằng hoặc sau `dueDate` (data lỗi / timezone edge case), hàm trả
`AT_TIME` thay vì `CUSTOM` — che đi state bất thường. Nên trả `CUSTOM` cho `diffMinutes < 0`
để user nhìn thấy và sửa.

---

### Info: `getDurationDays` export nhưng chưa dùng — `task-schedule.ts:270-275`

Xóa hoặc giữ lại nếu kế hoạch dùng sau.

---

Feature schedule task FE có cấu trúc tốt, tách responsibilities rõ ràng. Tuy nhiên
có 3 vấn đề logic cần sửa và 2 code smell nên xử lý.

## Findings

### [P1] `task-schedule-chip.tsx:67` — Relative time hiển thị bị stale do memo capture `now`

**File:** `FE/src/components/tasks/schedule/task-schedule-chip.tsx:66-69`

```ts
const presentation = useMemo(
  () => getTaskSchedulePresentation(task, new Date()),
  [task],
);
```

`new Date()` chỉ được gọi 1 lần khi `task` thay đổi. Dependency array không
include `now`, nên khi task ở trạng thái `due_soon`, label hiển thị dạng
`"Due soon · in 10 minutes"` sẽ không bao giờ cập nhật lại dù thời gian trôi qua.

**Kịch bản:** Task due sau 5 phút. User mở task detail và để nguyên 30 phút.
Label vẫn hiển thị `"in 5 minutes"` thay vì `"due now"` hoặc thay đổi trạng thái
sang `overdue_locked`.

**Fix:** Dùng interval để refresh `now` mỗi phút, hoặc dùng `useEffect` với
`requestAnimationFrame`/`setInterval` để cập nhật presentation theo chu kỳ.

---

### [P1] `task-schedule-reminder-menu.tsx:89` — `AT_TIME` không tuân theo `disabled`

**File:** `FE/src/components/tasks/schedule/task-schedule-reminder-menu.tsx:89`

```ts
disabled={!enabled && option.id !== "AT_TIME"}
```

Khi `disabled=true` (parent truyền vào, ví dụ task terminal hoặc form đang busy),
tất cả menu items đều bị disabled **ngoại trừ** `AT_TIME`. Điều này có nghĩa
người dùng vẫn có thể click chọn `AT_TIME` khi form đang ở trạng thái terminal
hoặc đang submitting.

**Kịch bản:** Task ở trạng thái DONE. Form render với `disabled=true`.
User mở reminder menu, thấy `AT_TIME` vẫn active, click chọn → callback
`onPresetChange` và `onEnabledChange(true)` vẫn fire, thay đổi draft state
mặc dù form đã disable toàn bộ.

**Fix:** Thay đổi condition thành:

```ts
disabled={disabled || (!enabled && option.id !== "AT_TIME")}
```

Hoặc đơn giản hơn:

```ts
disabled={disabled || !enabled}
```

vì khi `enabled=true` thì mọi option đều nên selectable.

---

### [P2] `task-schedule-form.tsx:48` — `reminderPreset` mặc định luôn `"AT_TIME"` bất kể điều kiện

**File:** `FE/src/components/tasks/schedule/task-schedule-form.tsx:48`

```ts
reminderPreset: task.reminderAt ? "AT_TIME" : "AT_TIME",
```

Cả hai nhánh của ternary đều trả về `"AT_TIME"`. Ternary trở thành dead code.

**Vấn đề thực tế:** Khi task đã có `reminderAt` từ server (ví dụ preset
`BEFORE_60`), khi mở form, `reminderPreset` luôn được set thành `"AT_TIME"`
thay vì preserving preset thật. Users thấy "At due time" thay vì "1 hour before"
mà task thực sự đang dùng.

**Fix:** Nếu backend chỉ lưu ISO datetime cho `reminderAt` mà không lưu preset
ID, cần suy ra preset từ khoảng cách giữa `dueDate` và `reminderAt`:

```ts
reminderPreset: task.reminderAt && task.dueDate
  ? inferPresetFromInterval(task.dueDate, task.reminderAt)
  : "AT_TIME",
```

Hoặc nếu backend có lưu preset, truyền nó xuống trong `TaskResponse`.

---

### [P2] `task-schedule-form.tsx:60` — `now` bị stale trong validation

**File:** `FE/src/components/tasks/schedule/task-schedule-form.tsx:60`

```ts
const now = useMemo(() => new Date(), []);
```

`now` chỉ được capture 1 lần khi component mount. Validation tại dòng 121 so sánh
`deadline <= now` dùng giá trị cũ này.

**Kịch bản:** User mở form lúc 10:00. Chọn deadline 10:05. Validation pass.
User để nguyên form đến 10:10 mà không submit. Lúc này deadline đã trong quá khứ
nhưng validation vẫn pass (vì `now` vẫn là 10:00). User submit → gửi deadline
đã qua tới server.

**Mức độ:** Backend vẫn sẽ validate `dueDate > server_now`, nên server sẽ reject.
Nhưng UX hiển thị không có lỗi trong khi đáng lẽ nên có. Nếu backend lỏng hơn
hoặc timezone lệch, đây có thể thành bug thật.

**Fix:** Tính lại `now` khi submit hoặc dùng `Date.now()` inline tại thời điểm
validate thay vì capture 1 lần.

---

### [P3] `task-schedule.ts:280-305` — `resolveScheduleState` và `deriveFallbackState` là dead code

**File:** `FE/src/features/tasks/utils/task-schedule.ts:271-311`

Hàm `resolveScheduleState` và `deriveFallbackState` được export nhưng không có
file nào import hoặc gọi. `TaskResponse` đã có sẵn `scheduleState` từ backend
nên các hàm fallback này không cần thiết.

Nếu giữ lại làm defensive coding, nên có test coverage. Nếu không, nên xóa
để tránh maintainer nhầm lẫn về source of truth cho schedule state.
