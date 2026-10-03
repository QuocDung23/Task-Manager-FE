# Work Log: Schedule Task Fixes + Start-Due Feature

> Ngày thực hiện: 2026-09-15 (cập nhật follow-up sau review vòng 2)
> Plan: `FE/.AI/plan/schedule-task-fix-and-start-due.md`
> Follow-up source: `FE/.AI/review-code/task-schedule-review.md`
> Scope: Sửa 10 lỗi review vòng 1 (BE-1..5, FE-1..5) + phát triển Start-Due + fix 5 lỗi review vòng 2

---

## 1. Mục tiêu đã hoàn thành

### 1.1 Review Fixes vòng 1 (P1+P2+P3)

| ID    | Mức | Trạng thái | Mô tả |
|-------|------|------------|-------|
| BE-1  | P1   | DONE       | Filter `scheduled` đã exclude overlap với `due_soon` |
| BE-2  | P1   | DONE       | `resolveScheduleState` DTO hỗ trợ case `reminderAt = null` + `dueSoonBefore`; thêm computed field `dueSoonBefore` |
| BE-3  | P2   | DONE       | `clearTaskSchedule` kiểm tra terminal status (DONE/CANCELLED) |
| BE-4  | P2   | DOCUMENTED | Batch size limitation đã được comment vào source code |
| BE-5  | P3   | DOCUMENTED | In-memory flag limitation đã được note |
| FE-1  | P1   | DONE       | Relative time trong chip tự refresh mỗi phút (state + interval) |
| FE-2  | P1   | DONE       | `AT_TIME` cũng bị disabled khi form disabled |
| FE-3  | P2   | DONE       | Thêm utility `inferPresetFromInterval` để preset từ reminderAt |
| FE-4  | P2   | DONE       | Validation dùng `new Date()` inline thay vì capture once |
| FE-5  | P3   | DONE       | Xóa dead code `resolveScheduleState`, `deriveFallbackState`, `deriveIsOverdue`, `ResolvedScheduleState` |

### 1.2 Review Fixes vòng 2 (follow-up)

| ID   | Mức | Trạng thái | Mô tả |
|------|------|------------|-------|
| BE-2 FU | P1 | DONE | Case 2 `due_soon` logic sai: so `now >= dueSoonBefore` thay vì `dueDateMs <= dueSoonBefore` (biểu thức cũ luôn false) |
| BE-3 FU | P2 | DONE | `updateTaskSchedule` phân biệt `undefined` (giữ nguyên) vs `null` (xoá) cho `startDate` |
| BE-4 FU | P3 | DONE | JSDoc `NOTE (BE-4)` di chuyển về đúng method `processOverdueLocks`; `updateTaskStatusAction` có JSDoc riêng |
| REPO FU | P3 | DONE | `taskScheduleEvents` metadata ghi đúng `oldStartDate` và `newStartDate` (tương tự `clearTaskSchedule`) |
| FE FU | P3 | DONE | `due_soon` presentation ưu tiên `formatDateRange` khi có `startDate` (helper text dùng `formatRelativeFromIso`) |

### 1.3 Start-Due Feature

### 1.4 Calendar Picker (shadcn)

Thay `<Input type="date">` bằng `<Calendar>` của shadcn + `<Popover>` (Linear/Notion-style compact picker).

**File:** `FE/src/components/tasks/schedule/task-schedule-fields.tsx`

- `TaskScheduleDateField` dùng `<Popover>` + `<Calendar mode="single">` thay vì native date input
- Trigger button giữ nguyên `h-9 px-2.5 text-[12.5px]` + icon `CalendarIcon` để grid 2-col không bị reflow
- Format hiển thị: `MMM d, yyyy` (Linear-style)
- `min` áp dụng qua prop `disabled` của `<Calendar>` (block pick past date)
- `TaskScheduleTimeField` giữ native `<input type="time">` (không có TimePicker shadcn tương đương)
- `parseLocalDateValue` parse `yyyy-MM-dd` local-date contract giữ nguyên API với form

### 1.5 Reminder Picker — chọn luôn = bật (single source of truth)

**File:** `FE/src/components/tasks/schedule/task-schedule-reminder-menu.tsx`

**Vấn đề UX cũ:** Toggle on/off riêng → rồi mới chọn preset. 2 lần chạm cho 1 quyết định. Toggle riêng là LLM-default "configure rồi mới apply".

**Fix UX:** Single source of truth — radio group duy nhất, với option "No reminder" ở vị trí đầu. Mở menu → chọn row → menu đóng → xong. Tắt reminder = chọn "No reminder".

**Design (skill `design-taste-frontend`):**
- VARIANCE 5, MOTION 2, DENSITY 6 (compact in-form picker, Linear-style)
- 1 trigger button đồng nhất `h-9 px-2.5 text-[12.5px]` với date picker → grid 2-col thẳng hàng
- Leading icon đổi theo state: `BellRing` (on, primary tint) / `BellOff` (off, muted)
- Pill `On/Off` thu gọn ở trailing; pill `On` dùng `bg-primary/12 text-primary` (subtle, không lạm accent)
- Popover width 280px, `collisionPadding={12}` không tràn viewport
- Active row: `bg-accent/60` + leading circle check (`bg-primary` + `<Check strokeWidth={3} />`)
- Inactive row: leading ring-only circle → visual contrast rõ ràng
- "No reminder" row: label muted để không "tranh vai" với preset thật
- Dùng `<Popover>` (z-60) — fix luôn stacking mismatch với form + date picker (ghi nhận ở §1.5 cũ)
- `role="radiogroup"` + `role="radio"` — screen reader đọc đúng "1 of 6"
- ZERO em-dash trong copy (skill §9.G)

### 1.5 Reminder Picker — sửa bị che sau popover khác

### 1.4 Calendar Picker (shadcn)

- DB Schema: thêm `startDate DateTime?` vào `tasks` model + index
- Migration: `20260915000000_add_task_start_date`
- BE: DTO, repository, service, validation, schedule event metadata đều handle `startDate`
- FE: Thêm Start Date field vào form, badge hiển thị start-due range, utility `formatDateRange`/`getDurationDays`, mở rộng `TaskScheduleDraft`

---

## 2. Files thay đổi

### 2.1 Backend (`Manage -Task/BE`)

| File | Loại thay đổi |
|------|--------------|
| `prisma/schema.prisma` | Thêm `startDate DateTime?` + index |
| `prisma/migrations/20260915000000_add_task_start_date/migration.sql` | Tạo mới - ALTER TABLE + CREATE INDEX |
| `src/modules/tasks/dtos/response/task.res.ts` | Thêm `startDate`, `dueSoonBefore` vào DTO; mở rộng `resolveScheduleState` |
| `src/modules/tasks/dtos/request/createTask.req.ts` | Thêm `startDate` |
| `src/modules/tasks/dtos/request/setTaskSchedule.req.ts` | Thêm `startDate` |
| `src/modules/tasks/task.repository.ts` | Fix BE-1 (filter scheduled), hỗ trợ `startDate` trong `updateTaskSchedule`/`clearTaskSchedule` |
| `src/modules/tasks/task.service.ts` | Fix BE-3, BE-4, mở rộng `assertValidSchedule` cho startDate, update notifications metadata |

### 2.2 Frontend (`FE`)

| File | Loại thay đổi |
|------|--------------|
| `src/features/tasks/types/index.ts` | Thêm `startDate`, `dueSoonBefore` vào `TaskResponse`, `CreateTaskRequest`, `SetTaskScheduleRequest` |
| `src/features/tasks/utils/task-schedule.ts` | Fix FE-5 (xóa dead code), thêm `inferPresetFromInterval`, `formatDateRange`, `getDurationDays`, mở rộng `validateTaskScheduleDraft` |
| `src/components/tasks/schedule/task-schedule-chip.tsx` | Fix FE-1: state + interval refresh mỗi phút |
| `src/components/tasks/schedule/task-schedule-reminder-menu.tsx` | Fix FE-2: disable `AT_TIME` đúng |
| `src/components/tasks/schedule/task-schedule-form.tsx` | Fix FE-3 (preset inference), FE-4 (fresh `now`), thêm Start Date field; layout grid 2-col (Start date ↔ Due date, Time ↔ Reminder) đối xứng + helper text cố định `h-4` cho đồng đều |
| `src/components/tasks/schedule/task-schedule-badge.tsx` | Hiển thị start-due range |

---

## 3. Acceptance Criteria đã đạt được

### Review Fixes

- [x] Filter `scheduleState=scheduled` không trả task `due_soon`
- [x] Filter `scheduleState=due_soon` trả đúng task
- [x] `TaskResponseDto.scheduleState` consistent với DB filter (`dueSoonBefore` computed)
- [x] `clearTaskSchedule` trả 400 cho task DONE/CANCELLED
- [x] Schedule chip relative time cập nhật mỗi phút
- [x] Reminder menu disabled hoàn toàn khi form disabled
- [x] `reminderPreset` hiển thị đúng preset từ server (infer từ dueDate/reminderAt)
- [x] Validation deadline dùng fresh `now`
- [x] Không còn dead code trong FE utils

### Start-Due Feature

- [x] User có thể chọn start date (optional) khi schedule task
- [x] Start date phải trước due date (validation ở BE + FE)
- [x] Task card hiển thị range "Start → Due" hoặc chỉ due nếu không có start
- [x] API response chứa `startDate` (`TaskResponse`)
- [x] DB migration tạo file SQL (BE-1 SCHEMA)
- [x] Schedule events metadata log `startDate` thay đổi

---

## 4. Ghi chú & rủi ro

- **Migration safety**: `startDate` nullable nên an toàn cho data hiện có.
- **Backward compatible**: FE cũ không gửi `startDate` vẫn hoạt động (BE treat as `null`).
- **Cron job**: Không cần thay đổi cron vì `startDate` không ảnh hưởng reminder/lock logic.
- **Permission**: Giữ nguyên permission hiện tại.
- **Timezone**: `startDate` chỉ là date (không có time), hiển thị theo local timezone.
- **Design-taste-frontend** note: UI giữ identity hiện tại (không phải landing page), nên không áp dụng marketing design system. Các component được refine với `text-[11px]` typography đã có, layout 2-col, không thêm AI tells.

---

## 5. Bước tiếp theo (nếu cần)

- [ ] Test thủ công: tạo task với start-due, kiểm tra badge và chip
- [ ] Test API: gọi `POST /tasks`, `PATCH /tasks/:id/schedule` với startDate payload
- [ ] Chạy `prisma migrate dev` để apply migration vào local DB
- [ ] Chạy `npm run lint && npm run build` ở cả FE và BE
- [ ] (Tùy chọn) Unit test cho `assertValidSchedule`, `validateTaskScheduleDraft`
