# Kế hoạch realtime khi tạo List và Task trên Board

> Phạm vi: đồng bộ việc tạo list và tạo task giữa các tab/browser đang mở cùng
> board. Các thao tác update, delete, reorder và move là phase riêng.

## 1. Mục tiêu

- User A tạo list, user B thấy list mới không cần reload.
- User A tạo task trong một list, user B thấy task trong đúng list, đúng thứ tự
  và đúng bộ lọc.
- HTTP response và socket echo không tạo bản ghi trùng.
- Event bị bỏ lỡ khi mất mạng được bù bằng refetch sau reconnect.
- Board dùng `board:{boardId}`, không join từng task room để hiển thị board.

## 2. Hiện trạng đã đọc

### Backend

Đã có:

- Socket.IO, JWT socket authentication và room `user:{userId}`.
- `board:join`/`board:leave` với kiểm tra quyền và room `board:{boardId}`.
- `RealtimeEnvelope` gồm `eventId`, `occurredAt`, `actorId`, `data`.
- `RealtimeEventService` và mẫu broadcast board cho tag/assignment.
- `TaskService.createTask()` trả `TaskResponseDto` canonical.
- `ListService.createList()` trả `ListResponseDto` canonical.

Chưa có:

- Event `task:created` và `list:created` trong contract.
- Publisher cho hai event.
- `TaskService.createTask()` broadcast task mới tới board room.
- `ListService.createList()` nhận actor và broadcast list mới.
- Test runner thực tế ở BE.

Lưu ý: lúc tạo task có schedule, BE hiện chỉ phát `task:schedule_updated` vào
task room. Task room mới chưa có subscriber nên event này không đủ để làm task
xuất hiện trên board của client khác.

### Frontend

Đã có:

- Socket singleton, board room registry, ack timeout, rejoin và reconcile.
- `DetailBoard` gọi `useBoardRoom(boardId, listIds)`.
- `useGlobalRealtime()` làm owner của các listener toàn cục.
- `task-cache.ts` có upsert theo ID, sort, filter-aware và chống duplicate.
- `event-dedupe.ts` lưu các `eventId` gần nhất.

Chưa có:

- Contract và handler cho create task/list.
- List query-key factory và list cache reducer dùng chung.
- Reconnect invalidate list query.
- `useCreateTask()`/`useCreateList()` áp dụng HTTP response trực tiếp vào cache.

Ràng buộc hiện tại:

- Board load page 1 với `limit = 200`, list sort theo `order`.
- Task query có filter tag, schedule, lock và ngày đến hạn.
- BE gán list mới ở cuối bằng `order = maxOrder + 65536`.

## 3. Kiến trúc và nguyên tắc

```text
REST POST -> kiểm tra quyền -> DB commit -> DTO canonical
                                      |-> HTTP response -> cache local
                                      `-> Socket event -> cache các client
```

- REST là command; Socket.IO chỉ phát snapshot đã commit.
- Không emit từ repository hoặc trước khi DB commit.
- Payload chứa full DTO canonical, không chỉ request body.
- `boardId` do BE lấy từ resource/context đã xác thực.
- HTTP handler và socket handler dùng cùng một reducer.
- `eventId` dùng để dedupe socket; resource ID dùng để idempotent HTTP + socket.

## 4. Contract realtime

Thêm vào `Manage -Task/BE/src/modules/realtime/realtime.types.ts` và mirror ở
`FE/src/features/realtime/contracts/realtime-events.ts`:

```ts
type TaskCreatedPayload = RealtimeEnvelope<{
  boardId: string;
  listId: string;
  task: TaskResponseDto;
}>;

type ListCreatedPayload = RealtimeEnvelope<{
  boardId: string;
  list: ListResponseDto;
}>;

type ServerToClientEvents = {
  "task:created": (payload: TaskCreatedPayload) => void;
  "list:created": (payload: ListCreatedPayload) => void;
};
```

FE dùng `TaskResponse`/`ListResponse`; `occurredAt` là ISO string.

Trước khi cập nhật cache, FE kiểm tra:

- ID và `boardId` không rỗng.
- `task.listId === listId`, `list.boardId === boardId`.
- Resource ở trạng thái active và chưa bị soft-delete.
- Payload không hợp lệ chỉ debug-log trong development rồi bỏ qua.

Hai event chỉ broadcast tới `board:{boardId}`. Không cần phát `task:created` tới
task room vì task chưa tồn tại trước khi create.

## 5. Thay đổi Backend

### BE-1: Contract và publisher

Files:

```text
Manage -Task/BE/src/modules/realtime/realtime.types.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
```

Việc cần làm:

1. Thêm hai payload và hai event vào `ServerToClientEvents`.
2. Thêm `emitTaskCreated()` và `emitListCreated()` nhận `boardId`, DTO
   canonical và `actorId`.
3. Tạo envelope một lần rồi emit một lần tới `boardRoom(boardId)`.
4. Nếu publish lỗi sau khi DB đã commit, không trả HTTP 500; log eventId,
   boardId, resource ID và lỗi.

### `BE-2: Phát event sau khi tạo task

Files:

```text
Manage -Task/BE/src/modules/tasks/task.service.ts
Manage -Task/BE/src/modules/tasks/task.controller.ts
```

1. Giữ `actorUserId` từ controller.
2. Trong service, resolve list active bằng `ListRepository.getListById()` để
   lấy `boardId` từ server, không suy ra từ dữ liệu client.
3. Sau khi có `TaskResponseDto` canonical, gọi `emitTaskCreated()`.
4. Payload HTTP và socket phải dùng cùng snapshot, gồm order, schedule, tag,
   assignment và các version.
5. Có thể giữ `task:schedule_updated` cho task detail; `task:created` là event
   làm task xuất hiện trên board.

### BE-3: Phát event sau khi tạo list

Files:

```text
Manage -Task/BE/src/modules/lists/list.controller.ts
Manage -Task/BE/src/modules/lists/list.service.ts
```

1. Controller lấy `(req as any).user.id` và truyền actor vào service.
2. Sau repository create, tạo `ListResponseDto` canonical.
3. Đối chiếu `createList.boardId` với `response.boardId`.
4. Gọi `emitListCreated()` sau commit và trước khi trả response.

## 6. Thay đổi Frontend

### FE-1: Chuẩn hóa list query key và cache

Tạo:

```text
FE/src/features/lists/utils/list-query-keys.ts
FE/src/features/lists/utils/list-cache.ts
```

Sửa `useLists`, `useCreateList`, `useUpdateList`, `useDeleteList` và
`useReorderList` để dùng factory:

```ts
const listKeys = {
  all: ["lists"] as const,
  boardPrefix: (boardId: string) => ["lists", boardId] as const,
  board: (boardId, page, limit, name?, status?) =>
    ["lists", boardId, page, limit, name, status] as const,
};
```

`applyCreatedList(queryClient, list)` phải:

- Chỉ quét query của đúng board.
- Kiểm tra filter name/status trong query key.
- Dedupe theo `list.id`, merge snapshot nếu đã tồn tại.
- Sort theo `order`.
- Cập nhật pagination đúng một lần.
- Không chèn vượt `limit`; nếu page đầy thì invalidate/refetch.

Board hiện dùng page 1, limit 200 nên list mới thường được append và render
ngay. Logic page đầy vẫn cần để bảo đảm đúng khi pagination thay đổi.

### FE-2: Reducer tạo task

Sửa:

```text
FE/src/features/tasks/utils/task-cache.ts
FE/src/features/tasks/hooks/useCreateTask.ts
```

1. Export `applyCreatedTask()` hoặc mở rộng `applyCanonicalTaskSnapshot()` để
   HTTP và socket dùng chung reducer.
2. Reuse filter matching, merge version, sort `orderTask` và pagination hiện có.
3. `useCreateTask.onSuccess()` apply response vào cache list đích ngay; không
   invalidate toàn bộ task prefix.
4. Socket echo cùng task ID chỉ replace/merge, không append và không tăng tổng
   số lần hai.
5. Task không match tag/schedule/lock/due filter không được chèn vào query đó.

### FE-3: Handler realtime

Tạo:

```text
FE/src/features/realtime/handlers/create-event-handlers.ts
```

Sửa contract và `useGlobalRealtime()` trong
`FE/src/features/realtime/hooks/useTaskSocket.ts`.

Handler:

1. Validate payload.
2. Gọi `rememberEvent(eventId)`; event đã xử lý thì return.
3. `task:created` gọi `applyCreatedTask()`.
4. `list:created` gọi `applyCreatedList()`.
5. Không toast cho socket event; success toast chỉ đến từ HTTP mutation.
6. Đăng ký và hủy listener đúng một lần ở global owner, không đặt listener
   trong `ListColumn` hoặc dialog.

### FE-4: Dùng reducer cho HTTP create list

Sửa `FE/src/features/lists/hooks/useCreateList.ts`:

1. `onSuccess()` gọi `applyCreatedList(queryClient, response.data)`.
2. Giữ success toast hiện tại.
3. Socket echo không duplicate nhờ upsert theo ID.
4. Chỉ background refetch khi page/filter không thể cập nhật chính xác bằng cache.

### FE-5: Bù dữ liệu sau reconnect

Sửa `FE/src/features/realtime/hooks/useBoardRoom.ts`:

1. Invalidate `listKeys.boardPrefix(boardId)`.
2. Invalidate task query của các list đã biết.
3. Giữ tag và task-detail invalidation hiện có.
4. Khi list mới được refetch và mount, `useTasks(newListId)` tự lấy task canonical.

Socket.IO không replay event cũ sau reconnect; chỉ rejoin room là chưa đủ.

## 7. Thứ tự triển khai

1. BE contract và publisher.
2. BE phát `list:created` và `task:created` sau commit.
3. FE mirror contract.
4. FE list query key và cache reducer.
5. FE task/list HTTP mutation dùng reducer.
6. FE global event handler.
7. FE reconnect invalidate list query.
8. Chạy typecheck, lint, build và kiểm thử hai browser.

## 8. Kế hoạch kiểm thử

### Backend

Do BE chưa có test runner, cần thêm Vitest/Jest hoặc tách publisher để test bằng
fake Socket.IO server:

- Đúng event name, board room, envelope và actor ID.
- Create fail không emit.
- Create success emit đúng một lần với DTO canonical.
- Publish throw không làm HTTP response đã commit thành lỗi.
- Event không đi sang board khác.

### Frontend

Nên thêm Vitest + jsdom:

- Apply hai lần cùng list/task ID không duplicate và pagination chỉ tăng một.
- Sort đúng theo `order`/`orderTask`.
- Tôn trọng filter search/status/tag/schedule/lock/due date.
- Event ID lặp bị bỏ qua.
- Payload sai board/resource ID bị bỏ qua.
- Cleanup gọi `socket.off` đúng callback.
- Reconnect invalidate list và task query liên quan.

### Manual acceptance

1. Hai browser cùng board: A tạo list, cả hai thấy list mới ở cuối.
2. Tạo task trong list mới, browser còn lại thấy task ngay.
3. Kiểm tra task create với filter schedule và tag.
4. Tạo liên tiếp 5 task, kiểm tra đúng order và không duplicate.
5. Ngắt mạng B, A tạo list/task, nối mạng B và kiểm tra refetch đầy đủ.
6. Hai browser mở hai board khác nhau, event không rò sang board còn lại.
7. React StrictMode không tạo listener/resource trùng.

## 9. Rủi ro và quyết định

- **Event mất sau DB commit:** MVP dùng reconnect reconcile để bù; transactional
  outbox dành cho phase sau.
- **Nhiều BE instance:** production cần Redis adapter cho Socket.IO; nếu không,
  request vào instance A không tới socket ở instance B.
- **Pagination:** page đầy thì invalidate/refetch, không chèn mù quáng qua limit.
- **Event đến sai thứ tự:** nếu task event đến trước list event, không tạo task
  cache mồ côi; khi list mount, `useTasks()` sẽ fetch canonical.

## 10. Definition of Done

- [ ] BE và FE có typed contract giống nhau cho hai event create.
- [ ] BE emit sau DB success tới đúng `board:{boardId}` với envelope và actor.
- [ ] HTTP response và socket event dùng chung idempotent cache reducer.
- [ ] Task create đúng filter và đúng `orderTask`.
- [ ] List create đúng filter/page và đúng `order`.
- [ ] `useGlobalRealtime()` là owner duy nhất của listener.
- [ ] Reconnect invalidate list query.
- [ ] Actor nhận socket echo nhưng không bị duplicate.
- [ ] FE lint/build và BE typecheck pass.
- [ ] Manual acceptance hai browser pass, gồm offline/reconnect và hai board.

## 11. Ngoài phạm vi

- `list:updated`, `list:deleted`, `list:reordered`.
- `task:updated`, `task:deleted`, `task:moved`.
- Presence, cursor, typing indicator và offline mutation queue.
- Notification/toast cho remote create.
- Transactional outbox và Redis adapter implementation.
