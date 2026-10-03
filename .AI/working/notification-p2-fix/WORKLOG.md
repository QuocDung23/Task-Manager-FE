# Work Log: Notification P2 Fix

> Ngày: 2026-08-25

## Mục tiêu

Fix 2 issues P2 từ notification-review.md, bỏ qua P1 (contract realtime mismatch và migration git ignore):

1. **P2-1**: Retry cùng dedupeKey vẫn emit notification cũ
2. **P2-2**: Read/unread realtime không cập nhật unread count của bell

## Files đã sửa

### BE - P2-1: Dedupe notification emission

**`Manage -Task/BE/src/modules/notification/notification.repository.ts`**
- Thêm type `NotificationRow` và `CreateNotificationResult` với field `created: boolean`
- Viết method `upsertOne()` để check existing trước khi create
- `createMany()` now trả về `CreateNotificationResult[]` thay vì chỉ rows

**`Manage -Task/BE/src/modules/notification/notification-inbox.service.ts`**
- Import thêm `NotificationRow` type
- `createForRecipients()` chỉ emit `notification:created` khi `result.created === true`
- `toResponse()` nhận `result.notification` để convert sang `NotificationResponse`

### FE - P2-2: Unread count sync

**`FE/src/features/realtime/handlers/notification-event-handlers.ts`**
- Thêm helper `findNotificationInCache()` để tìm notification trong cache
- `handleReadState()`:
  - Tính delta: `-1` (read), `+1` (unread), `0` (không đổi)
  - Chỉ update count khi delta !== 0
  - Dùng `Math.max(0, ...)` để tránh count âm
- `handleReadAll()`:
  - Đếm số item bị ảnh hưởng trong cache trước khi patch
  - Giảm count tương ứng với số item thực sự chuyển từ unread sang read
- Bỏ unused helper `countUnreadInCache()`

### BE - P1: Realtime contract Date -> string (2026-08-25)

**`Manage -Task/BE/src/modules/realtime/realtime.types.ts`**
- `NotificationReadStateChangedPayload.readAt`: `Date | null` → `string | null`
- `NotificationReadAllPayload.before`: `Date` → `string`
- `NotificationReadAllPayload.readAt`: `Date` → `string`

**`Manage -Task/BE/src/modules/realtime/realtime-event.service.ts`**
- Service đã emit ISO string (dùng `toISOString()`), giờ contract match với runtime behavior

## Kết quả verify

### BE
```bash
cd "Manage -Task/BE" && npx tsc --noEmit
```
- ✅ Thành công (không còn lỗi nào)

### FE
```bash
cd "../../FE" && npm run build
```
- ✅ Build thành công

## Trạng thái sau fix

| Issue | Trước | Sau |
|-------|-------|-----|
| P2-1: Retry emit | Luôn emit mọi notification | Chỉ emit khi `created === true` |
| P2-2: handleReadState | Không update count | Update delta chính xác |
| P2-2: handleReadAll | Không update count | Giảm count theo affected items |
| P2-1: BE compile | Fail (P1) | Fail (P1 - chưa fix) |
| FE build | Pass | Pass |

## Chưa làm (P1 - bỏ qua theo yêu cầu)

1. ~~Sửa realtime contract Date -> string~~ ✅ Đã fix
2. Bỏ ignore migration trong .gitignore

## Tiếp theo

- Review P1: Fix contract realtime và migration
- Test hai tab mark read/unread
- Test dedupe retry không emit duplicate
