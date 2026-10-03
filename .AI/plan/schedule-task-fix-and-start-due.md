# Plan: Fix Schedule Task Reviews + Start-Due Feature

> Created: 2026-09-15
> Scope: Fix all review findings (BE + FE) và phát triển tính năng Start Date (start-due)
> Source: `Manage -Task/BE/AI/review-code/task-schedule-review.md`, `FE/.AI/review-code/task-schedule-review.md`

---

## 1. Tổng quan

Plan này bao gồm 3 phần chính:

1. **Fix review findings** — 5 lỗi BE + 5 lỗi FE từ code review
2. **Start-Due feature** — Thêm `startDate` để người dùng trải nghiệm better scheduling
3. **Sync consistency** — Đảm bảo DB filter, response DTO và FE logic dùng chung 1 source of truth

---

## 2. Review Fixes

### 2.1 BE Fixes

#### Fix BE-1 [P1] — `task.repository.ts:135-141` Filter `scheduled` overlap `due_soon`

**Vấn đề:** Filter `scheduled` không exclude task thuộc `due_soon`,导致 kết quả không mutually exclusive.

**File:** `BE/src/modules/tasks/task.repository.ts`

**Thay đổi:**

```ts
// TRƯỚC
if (scheduleState === "scheduled") {
  andConditions.push({
    dueDate: { not: null, gt: now },
    lockStatus: TaskLockStatus.UNLOCKED,
    statusAction: { notIn: [TaskStatusAction.DONE, TaskStatusAction.CANCELLED] },
  });
}

// SAU
if (scheduleState === "scheduled") {
  andConditions.push({
    dueDate: { not: null, gt: now },
    lockStatus: TaskLockStatus.UNLOCKED,
    statusAction: { notIn: [TaskStatusAction.DONE, TaskStatusAction.CANCELLED] },
    OR: [
      { reminderAt: { gt: now } },
      { reminderAt: null, dueDate: { gt: dueSoonBefore ?? now } },
    ],
  });
}
```

**Kiểm tra:** Filter `scheduled` và `due_soon` giờ mutually exclusive. Task có `reminderAt <= now` hoặc `dueDate <= dueSoonBefore` (và `reminderAt = null`) sẽ chỉ xuất hiện trong `due_soon`.

---

#### Fix BE-2 [P1] — `task.res.ts:136-159` `resolveScheduleState` thiếu case `reminderAt = null` + `dueSoonBefore`

**Vấn đề:** Response DTO chỉ set `due_soon` cho task có `reminderAt`. Task không có `reminderAt` nhưng nằm trong cửa sổ `reminderBeforeMinutes` luôn trả `"scheduled"`.

**File:** `BE/src/modules/tasks/dtos/response/task.res.ts`

**Thay đổi:** Thêm computed property `dueSoonBefore` vào DTO, dùng `taskScheduleConfig.reminderBeforeMinutes`:

```ts
import { taskScheduleConfig } from "@/configs";

// Trong constructor:
const reminderMs = taskScheduleConfig.reminderBeforeMinutes * 60 * 1000;
this.dueSoonBefore = this.dueDate
  ? new Date(this.dueDate.getTime() - reminderMs)
  : null;

// Sửa resolveScheduleState:
private resolveScheduleState(): TaskScheduleState {
  if (this.isTerminalAction()) return "done";
  if (this.lockStatus === TaskLockStatus.OVERDUE_LOCKED) return "overdue_locked";
  if (!this.dueDate) return "none";

  const now = Date.now();
  const dueDateMs = this.dueDate.getTime();

  // Case 1: có reminderAt đã qua
  if (this.reminderAt && this.reminderAt.getTime() <= now && dueDateMs > now) {
    return "due_soon";
  }

  // Case 2: không có reminderAt nhưng nằm trong cửa sổ reminderBeforeMinutes
  if (!this.reminderAt && this.dueSoonBefore && dueDateMs <= this.dueSoonBefore.getTime() && dueDateMs > now) {
    return "due_soon";
  }

  return "scheduled";
}
```

**Thêm field mới vào DTO class:**
```ts
dueSoonBefore: Date | null;
```

**Thêm vào schema:**
```ts
dueSoonBefore: z.date().nullable(),
```

---

#### Fix BE-3 [P2] — `task.service.ts:866-876` `clearTaskSchedule` thiếu terminal status check

**Vấn đề:** `clearTaskSchedule` chỉ check `OVERDUE_LOCKED`, không check `DONE/CANCELLED`.

**File:** `BE/src/modules/tasks/task.service.ts`

**Thay đổi:**

```ts
async clearTaskSchedule(...) {
  const task = await this.getActiveTaskOrThrow(dto.taskId);

  // Thêm check terminal status
  if (this.isTerminalAction(task.statusAction)) {
    throw new BadRequest("Cannot clear schedule of a completed or cancelled task");
  }

  if (task.lockStatus === TaskLockStatus.OVERDUE_LOCKED) {
    throw new ForbiddenException(...);
  }
  // ...
}
```

---

#### Fix BE-4 [P2] — `task.service.ts:1064-1070` `processOverdueLocks` batch size limitation

**Vấn đề:** Không phải bug, chỉ là limitation. Không cần fix ngay.

**Action:** Không thay đổi. Ghi chú trong code bằng comment nếu cần.

---

#### Fix BE-5 [P3] — `taskSchedule-cron.service.ts:5` `isCronRunning` multi-instance

**Vấn đề:** In-memory flag không hoạt động multi-instance.

**Action:** Không thay đổi ở phase này. Nếu scale, dùng Redis distributed lock. Ghi chú trong code.

---

### 2.2 FE Fixes

#### Fix FE-1 [P1] — `task-schedule-chip.tsx:67` Relative time stale

**Vấn đề:** `useMemo` capture `new Date()` 1 lần, relative time không cập nhật.

**File:** `FE/src/components/tasks/schedule/task-schedule-chip.tsx`

**Thay đổi:** Dùng `useState` + `useEffect` với interval để refresh mỗi phút:

```ts
const [now, setNow] = useState(() => new Date());

useEffect(() => {
  const interval = setInterval(() => setNow(new Date()), 60_000);
  return () => clearInterval(interval);
}, []);

const presentation = useMemo(
  () => getTaskSchedulePresentation(task, now),
  [task, now],
);
```

---

#### Fix FE-2 [P1] — `task-schedule-reminder-menu.tsx:89` `AT_TIME` bypass disabled

**Vấn đề:** `AT_TIME` không bị disabled khi form disabled.

**File:** `FE/src/components/tasks/schedule/task-schedule-reminder-menu.tsx`

**Thay đổi:**

```ts
// TRƯỚC
disabled={!enabled && option.id !== "AT_TIME"}

// SAU
disabled={disabled || !enabled}
```

---

#### Fix FE-3 [P2] — `task-schedule-form.tsx:48` `reminderPreset` dead code

**Vấn đề:** `task.reminderAt ? "AT_TIME" : "AT_TIME"` — cả 2 nhánh đều trả về `"AT_TIME"`.

**File:** `FE/src/components/tasks/schedule/task-schedule-form.tsx`

**Thay đổi:** Thêm utility `inferPresetFromInterval` trong `task-schedule.ts`:

```ts
export function inferPresetFromInterval(
  dueDateIso: string,
  reminderAtIso: string,
): ReminderPresetId {
  const due = new Date(dueDateIso).getTime();
  const reminder = new Date(reminderAtIso).getTime();
  const diffMinutes = Math.round((due - reminder) / 60_000);

  if (diffMinutes <= 0) return "AT_TIME";
  if (diffMinutes <= 15) return "BEFORE_15";
  if (diffMinutes <= 30) return "BEFORE_30";
  if (diffMinutes <= 60) return "BEFORE_60";
  if (diffMinutes <= 60 * 24) return "BEFORE_DAY";
  return "CUSTOM";
}
```

Sử dụng trong form:
```ts
reminderPreset: task.reminderAt && task.dueDate
  ? inferPresetFromInterval(task.dueDate, task.reminderAt)
  : "AT_TIME",
```

---

#### Fix FE-4 [P2] — `task-schedule-form.tsx:60` `now` stale trong validation

**Vấn đề:** `now` chỉ capture 1 lần khi mount, validation dùng giá trị cũ.

**File:** `FE/src/components/tasks/schedule/task-schedule-form.tsx`

**Thay đổi:** Dùng `Date.now()` inline tại thời điểm validate thay vì capture:

```ts
// TRƯỚC
const now = useMemo(() => new Date(), []);
// ... dùng now trong validate

// SAU
// Bỏ useMemo, dùng Date.now() inline khi validate
const validation = validateTaskScheduleDraft(draft, new Date());
// Hoặc nếu cần gọi ở nhiều nơi:
const getNow = () => new Date();
```

---

#### Fix FE-5 [P3] — `task-schedule.ts:280-305` Dead code `resolveScheduleState` + `deriveFallbackState`

**Vấn đề:** Hàm `resolveScheduleState` và `deriveFallbackState` trong `task-schedule.ts` không được import ở đâu.

**File:** `FE/src/features/tasks/utils/task-schedule.ts`

**Action:** Xóa `resolveScheduleState`, `deriveFallbackState`, `deriveIsOverdue`, và type `ResolvedScheduleState` (dòng 271-311). FE dùng `scheduleState` từ server response làm canonical.

---

## 3. Start-Due Feature

### 3.1 Mục tiêu

Cho phép người dùng đặt **Start Date** (ngày bắt đầu) bên cạnh **Due Date** (deadline). Điều này giúp:

- Hiển thị khoảng thời gian thực tế task cần thực hiện
- Task card có thể render timeline/progress bar
- Board view có thể hiển thị task theo Gantt-like range
- UX tốt hơn cho planning và tracking

### 3.2 DB Schema Change

**File:** `BE/prisma/schema.prisma`

Thêm field `startDate` vào model `tasks`:

```prisma
model tasks {
  // ... existing fields
  startDate       DateTime?        @map("start_date")
  dueDate           DateTime?        @map("due_date")
  // ... rest
}
```

**Migration:**

```bash
cd "Manage -Task/BE"
npx prisma migrate dev --name add-task-start-date
```

### 3.3 BE Changes

#### 3.3.1 DTO Update — `task.res.ts`

Thêm `startDate` vào response:

```ts
export class TaskResponseDto {
  // ... existing
  startDate: Date | null;
  dueDate: Date | null;

  constructor(data) {
    // ...
    this.startDate = data.startDate ?? null;
    this.dueDate = data.dueDate ?? null;
  }
}
```

Cập nhật schema:
```ts
startDate: z.date().nullable(),
```

#### 3.3.2 Request DTOs

**`createTask.req.ts`:**
```ts
// Thêm optional startDate
startDate?: Date;
```

**`setTaskSchedule.req.ts`:**
```ts
// Thêm optional startDate
startDate?: Date;
```

**Zod schema:**
```ts
startDate: z.coerce.date().optional(),
```

#### 3.3.3 Validation — `task.service.ts`

```ts
private assertValidSchedule(
  startDate: Date | null,
  dueDate: Date,
  reminderAt?: Date | null,
): void {
  const now = new Date();

  if (Number.isNaN(dueDate.getTime())) {
    throw new BadRequest("dueDate is invalid");
  }
  if (dueDate.getTime() <= now.getTime()) {
    throw new BadRequest("dueDate must be in the future");
  }

  // Validate startDate
  if (startDate) {
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequest("startDate is invalid");
    }
    if (startDate.getTime() > dueDate.getTime()) {
      throw new BadRequest("startDate must be before dueDate");
    }
  }

  if (reminderAt) {
    // ... existing reminderAt validation
  }
}
```

#### 3.3.4 Repository — `task.repository.ts`

Cập nhật `updateTaskSchedule` và `createTask` để handle `startDate`:

```ts
// Trong updateTaskSchedule:
data: {
  startDate: args.startDate ?? null,
  dueDate: args.dueDate,
  reminderAt: args.reminderAt ?? null,
  // ...
}

// Trong createTask:
const data: Prisma.tasksCreateInput = {
  // ...
  startDate: createTaskDto.startDate ?? null,
  dueDate: createTaskDto.dueDate,
  reminderAt: createTaskDto.reminderAt ?? null,
};
```

#### 3.3.5 Schedule Events

Cập nhật `taskScheduleEvents` metadata để track `startDate`:

```ts
metadata: {
  oldStartDate: task.startDate?.toISOString() ?? null,
  newStartDate: args.startDate?.toISOString() ?? null,
  reminderAt: args.reminderAt?.toISOString() ?? null,
}
```

### 3.4 FE Changes

#### 3.4.1 Types — `types/index.ts`

```ts
export type TaskResponse = {
  // ... existing
  startDate: string | null;
  dueDate: string | null;
};

export type CreateTaskRequest = {
  name: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  reminderAt?: string;
};

export type SetTaskScheduleRequest = {
  startDate?: string;
  dueDate: string;
  reminderAt?: string;
  reason?: string;
};
```

#### 3.4.2 Utilities — `task-schedule.ts`

Thêm utility functions:

```ts
export type TaskScheduleDraft = {
  startDate: string;    // NEW
  date: string;         // dueDate
  time: string;
  reminderEnabled: boolean;
  reminderPreset: ReminderPresetId;
  reminderDate: string;
  reminderTime: string;
};

// Validation: startDate <= dueDate
export function validateTaskScheduleDraft(
  draft: TaskScheduleDraft,
  now: Date,
): TaskScheduleValidation {
  const errors: TaskScheduleValidation["errors"] = {};

  // Validate startDate
  if (draft.startDate) {
    const startIso = combineLocalDateTimeToIso(draft.startDate, "00:00");
    if (startIso && new Date(startIso).getTime() > now.getTime()) {
      // startDate in the future is OK, but should be <= dueDate
    }
  }

  // Validate dueDate (existing logic)
  // ...

  // Validate startDate <= dueDate
  if (draft.startDate && draft.date) {
    const startIso = combineLocalDateTimeToIso(draft.startDate, "00:00");
    const dueIso = combineLocalDateTimeToIso(draft.date, draft.time);
    if (startIso && dueIso && new Date(startIso).getTime() > new Date(dueIso).getTime()) {
      errors.date = "Start date must be before the deadline.";
    }
  }

  // ... rest of existing validation
}

// Presentation: hiển thị start-due range
export function getTaskSchedulePresentation(
  task: TaskResponse,
  now: Date,
): TaskSchedulePresentation {
  // ... existing logic

  // Enhanced: hiển thị start-due range
  if (task.startDate && task.dueDate) {
    const startStr = formatLocalDate(task.startDate);
    const dueStr = formatLocalDate(task.dueDate);
    return {
      label: `${startStr} → ${dueStr}`,
      // ... tone, icon based on state
    };
  }

  // ... fallback to existing logic
}

// Utility mới
export function formatDateRange(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return formatLocalDateTime(endIso ?? startIso ?? "");
  const start = formatLocalDate(startIso);
  const end = formatLocalDate(endIso);
  return `${start} → ${end}`;
}

export function getDurationDays(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
```

#### 3.4.3 Form Component — `task-schedule-form.tsx`

Thêm Start Date field vào form:

```tsx
<div className="space-y-2">
  <Label>Start Date (optional)</Label>
  <Input
    type="date"
    value={draft.startDate}
    onChange={(e) => updateDraft({ startDate: e.target.value })}
    disabled={isTerminal}
  />
  <p className="text-xs text-muted-foreground">
    When will this task begin?
  </p>
</div>

<div className="space-y-2">
  <Label>Due Date</Label>
  <div className="flex gap-2">
    <Input
      type="date"
      value={draft.date}
      onChange={(e) => updateDraft({ date: e.target.value })}
      disabled={isTerminal}
    />
    <Input
      type="time"
      value={draft.time}
      onChange={(e) => updateDraft({ time: e.target.value })}
      disabled={isTerminal}
    />
  </div>
</div>
```

#### 3.4.4 Task Card Badge — `task-schedule-badge.tsx`

Hiển thị start-due range trên task card:

```tsx
function ScheduleBadge({ task }: { task: TaskResponse }) {
  if (!task.startDate && !task.dueDate) return null;

  const label = task.startDate && task.dueDate
    ? `${formatLocalDate(task.startDate)} → ${formatLocalDate(task.dueDate)}`
    : task.dueDate
      ? formatLocalDate(task.dueDate)
      : null;

  if (!label) return null;

  return (
    <Badge variant={getBadgeVariant(task.scheduleState)}>
      <CalendarIcon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}
```

#### 3.4.5 API Client — `task-api.ts`

Không cần thay đổi vì đã dùng typed request/response.

---

## 4. Implementation Phases

### Phase 1: Review Fixes (Priority: P1)

**Thời gian:** 1-2 ngày

1. **BE:** Fix BE-1, BE-2, BE-3
2. **FE:** Fix FE-1, FE-2, FE-3, FE-4, FE-5
3. **Test:** Chạy `npm run lint` và `npm run build` ở cả FE và BE

**Definition of Done:**
- [ ] Filter `scheduled` và `due_soon` mutually exclusive
- [ ] `resolveScheduleState` consistent giữa DB và response
- [ ] `clearTaskSchedule` check terminal status
- [ ] Relative time chip tự cập nhật
- [ ] Reminder menu disabled đúng
- [ ] `reminderPreset` inference từ `reminderAt`
- [ ] Validation dùng `now` fresh
- [ ] Xóa dead code

### Phase 2: Start-Due Schema + BE (Priority: Medium)

**Thời gian:** 1-2 ngày

1. **DB:** Tạo migration `add-task-start-date`
2. **BE:** Cập nhật DTOs, services, repositories
3. **Test:** Unit test validation, integration test API

**Definition of Done:**
- [ ] `startDate` field tồn tại trong DB
- [ ] API response chứa `startDate`
- [ ] Validation `startDate <= dueDate` hoạt động
- [ ] Schedule events track `startDate`

### Phase 3: Start-Due FE (Priority: Medium)

**Thời gian:** 1-2 ngày

1. **Types:** Thêm `startDate` vào types
2. **Utilities:** Thêm validation, formatting cho start-due
3. **Form:** Thêm start date picker
4. **Badge:** Hiển thị start-due range trên task card
5. **Chip:** Cải thiện presentation cho start-due

**Definition of Done:**
- [ ] User có thể chọn start date khi schedule
- [ ] Task card hiển thị start-due range
- [ ] Validation đúng: start <= due
- [ ] Timezone handling đúng

### Phase 4: Polish + Integration (Priority: Low)

**Thời gian:** 1 ngày

1. **UX:** Responsive, keyboard accessibility
2. **Error handling:** Toast messages cho start-due errors
3. **Cache:** Invalidate đúng khi start-due thay đổi

---

## 5. Acceptance Criteria

### Review Fixes

- [ ] Filter `scheduleState=scheduled` không trả task `due_soon`
- [ ] Filter `scheduleState=due_soon` trả đúng task (có `reminderAt` passed hoặc `dueDate <= dueSoonBefore`)
- [ ] `TaskResponseDto.scheduleState` consistent với DB filter
- [ ] `clearTaskSchedule` trả 400 cho task DONE/CANCELLED
- [ ] Schedule chip relative time cập nhật mỗi phút
- [ ] Reminder menu disabled hoàn toàn khi form disabled
- [ ] `reminderPreset` hiển thị đúng preset từ server
- [ ] Validation deadline dùng fresh `now`
- [ ] Không còn dead code `resolveScheduleState`/`deriveFallbackState` trong FE utils

### Start-Due Feature

- [ ] User có thể chọn start date (optional) khi schedule task
- [ ] Start date phải trước due date
- [ ] Task card hiển thị range "Start → Due" hoặc chỉ due nếu không có start
- [ ] API response chứa `startDate`
- [ ] DB migration chạy thành công
- [ ] Schedule events log `startDate` thay đổi

---

## 6. Risk & Notes

- **Migration risk:** `startDate` là nullable field, migration an toàn cho data hiện có
- **Backward compatible:** FE cũ không gửi `startDate` sẽ vẫn hoạt động (BE treat as `null`)
- **Cron job:** Không cần thay đổi cron vì `startDate` không ảnh hưởng reminder/lock logic
- **Permission:** Giữ nguyên permission hiện tại, `startDate` là optional enhancement
- **Timezone:** `startDate` chỉ là date (không có time), hiển thị theo local timezone
