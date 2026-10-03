# Work Log: Realtime Create Task/List

**Ngày:** Tuesday Aug 18, 2026  
**Feature:** Realtime tạo Task và List trên Board  
**Plan:** `FE/.AI/FE/plan/realtime-create-task-list.md`

---

## Trạng thái: ✅ Hoàn thành

---

## Backend Changes

### BE-1: Contract và Publisher
**Files:**
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts`
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts`

**Thay đổi:**
- Thêm `TaskCreatedPayload` và `ListCreatedPayload` vào types
- Thêm `task:created` và `list:created` vào `ServerToClientEvents`
- Thêm `emitTaskCreated()` và `emitListCreated()` methods

### BE-2: Phát event sau khi tạo Task
**File:** `Manage -Task/BE/src/modules/tasks/task.service.ts`

**Thay đổi:**
- Resolve `boardId` từ `listRepository.getListById()` (server-side)
- Gọi `emitTaskCreated()` sau khi DB commit
- Broadcast tới `board:{boardId}` room

### BE-3: Phát event sau khi tạo List
**Files:**
- `Manage -Task/BE/src/modules/lists/list.service.ts`
- `Manage -Task/BE/src/modules/lists/list.controller.ts`

**Thay đổi:**
- Cập nhật signature `createList()` nhận `actorUserId`
- Gọi `emitListCreated()` sau khi DB commit
- Controller truyền `actorUserId` từ request

---

## Frontend Changes

### FE-9: Mirror Contract với BE
**File:** `FE/src/features/realtime/contracts/realtime-events.ts`

**Thay đổi:**
- Thêm `ListResponse` import từ lists types
- Thêm `TaskCreatedPayload` và `ListCreatedPayload` types
- Thêm `task:created` và `list:created` vào `ServerToClientEvents`

### FE-1: List Query Key và Cache Reducer
**Files:**
- `FE/src/features/lists/utils/list-query-keys.ts` (NEW)
- `FE/src/features/lists/utils/list-cache.ts` (NEW)
- `FE/src/features/lists/hooks/useLists.ts`

**Thay đổi:**
- Tạo `listKeys` factory với `boardPrefix()` và `board()`
- Tạo `applyCreatedList()` reducer với upsert theo ID, sort theo order
- Cập nhật `useLists` dùng `listKeys.board()`

### FE-2: Reducer tạo Task
**File:** `FE/src/features/tasks/utils/task-cache.ts`

**Ghi chú:**
- `applyCanonicalTaskSnapshot` đã có sẵn, chỉ cần export
- Reused cho cả HTTP và socket events

### FE-3: Handler Realtime
**Files:**
- `FE/src/features/realtime/handlers/create-event-handlers.ts` (NEW)
- `FE/src/features/realtime/hooks/useTaskSocket.ts`

**Thay đổi:**
- Tạo `registerCreateEventHandlers()` với validation payload
- Tích hợp vào `useGlobalRealtime()` làm owner duy nhất
- Sử dụng `rememberEvent()` cho deduplication

### FE-4: HTTP Mutation dùng Reducer
**Files:**
- `FE/src/features/tasks/hooks/useCreateTask.ts`
- `FE/src/features/lists/hooks/useCreateList.ts`

**Thay đổi:**
- `useCreateTask`: gọi `applyCanonicalTaskSnapshot()` thay vì invalidate
- `useCreateList`: gọi `applyCreatedList()` thay vì invalidate

### FE-5: Bù dữ liệu sau Reconnect
**File:** `FE/src/features/realtime/hooks/useBoardRoom.ts`

**Thay đổi:**
- Thêm invalidate `listKeys.boardPrefix(boardId)` trong reconcile handler
- Đảm bảo list queries được refetch sau khi reconnect

---

## Definition of Done Checklist

- [x] BE và FE có typed contract giống nhau cho `task:created` và `list:created`
- [x] BE emit sau DB success tới đúng `board:{boardId}` với envelope và actor
- [x] HTTP response và socket event dùng chung idempotent cache reducer
- [x] Task create đúng filter và đúng `orderTask`
- [x] List create đúng filter/page và đúng `order`
- [x] `useGlobalRealtime()` là owner duy nhất của listener
- [x] Reconnect invalidate list query
- [x] Actor nhận socket echo nhưng không bị duplicate
- [x] FE lint/build pass

---

## Files Created (FE)
```
FE/src/features/lists/utils/list-query-keys.ts
FE/src/features/lists/utils/list-cache.ts
FE/src/features/realtime/handlers/create-event-handlers.ts
```

## Files Modified (BE)
```
Manage -Task/BE/src/modules/realtime/realtime.types.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
Manage -Task/BE/src/modules/tasks/task.service.ts
Manage -Task/BE/src/modules/lists/list.service.ts
Manage -Task/BE/src/modules/lists/list.controller.ts
```

## Files Modified (FE)
```
FE/src/features/realtime/contracts/realtime-events.ts
FE/src/features/realtime/hooks/useTaskSocket.ts
FE/src/features/realtime/hooks/useBoardRoom.ts
FE/src/features/lists/hooks/useLists.ts
FE/src/features/lists/hooks/useCreateList.ts
FE/src/features/tasks/hooks/useCreateTask.ts
```
