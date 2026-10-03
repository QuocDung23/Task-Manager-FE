# Plan realtime cho drag-drop list và task

## 1. Mục tiêu

Đồng bộ realtime thao tác kéo thả list/task giữa mọi tab đang mở cùng board,
không cần reload và không làm mất optimistic UI hiện tại.

Phạm vi gồm:

- Reorder list trong cùng board.
- Reorder task trong cùng list.
- Move task giữa hai list cùng board.
- Cập nhật canonical order/listId từ BE cho board, list column, task card và
  task detail đang mở.
- Reconnect, duplicate event, thao tác đồng thời và rollback khi HTTP mutation
  thất bại.

Không thay đổi rule DnD hoặc endpoint HTTP hiện có; chỉ bổ sung realtime
contract, publish và consumer cần thiết.

## 2. Code đã đọc

### BE

- `Manage -Task/BE/src/modules/lists/list.service.ts`
- `Manage -Task/BE/src/modules/lists/list.controller.ts`
- `Manage -Task/BE/src/modules/lists/list.router.ts`
- `Manage -Task/BE/src/modules/lists/list.repository.ts`
- `Manage -Task/BE/src/modules/lists/dtos/requests/reorderList.req.ts`
- `Manage -Task/BE/src/modules/tasks/task.service.ts`
- `Manage -Task/BE/src/modules/tasks/task.controller.ts`
- `Manage -Task/BE/src/modules/tasks/task.router.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/moveTask.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts`
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts`
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts`

### FE

- `FE/src/components/boards/board-dnd-provider.tsx`
- `FE/src/components/lists/list-column.tsx`
- `FE/src/components/tasks/sortable-task-card.tsx`
- `FE/src/features/lists/hooks/useReorderList.ts`
- `FE/src/features/lists/utils/list-cache.ts`
- `FE/src/features/tasks/hooks/useMoveTask.ts`
- `FE/src/features/tasks/utils/task-cache.ts`
- `FE/src/features/realtime/socket.ts`
- `FE/src/features/realtime/contracts/realtime-events.ts`
- `FE/src/features/realtime/hooks/useBoardRoom.ts`
- `FE/src/features/realtime/hooks/useTaskSocket.ts`
- `FE/src/features/realtime/rooms/board-room-registry.ts`

## 3. Contract HTTP hiện tại

### 3.1. Reorder list

```http
PATCH /list/:boardId/reorderList
```

```ts
{ listIds: string[] } // toàn bộ active list của board, theo thứ tự mới
```

Response là toàn bộ `ListResponse[]` đã sort theo `order`. BE kiểm tra list
không trùng, thuộc đúng board và không được thiếu active list.

### 3.2. Move/reorder task

```http
PATCH /task/:taskId/move
```

```ts
{
  sourceListId: string;
  targetListId: string;
  orderedTaskIds: string[]; // toàn bộ task active của target sau drop
}
```

Response:

```ts
{
  movedTask: TaskResponse;
  sourceTasks: TaskResponse[];
  targetTasks: TaskResponse[];
}
```

Với cùng list, `sourceTasks` rỗng theo DTO hiện tại và `targetTasks` là toàn bộ
list sau reorder. Với cross-list, BE trả full source sau khi bỏ task và full
target sau khi nhận task. BE tự tính `orderTask` theo step `65536`.

## 4. Khoảng trống realtime hiện tại

- BE đã có Socket.IO, auth, board room/task room và `RealtimeEnvelope`, nhưng
  `ListService.reorderLists` chưa emit event.
- `TaskService.moveTask` cũng chưa emit event sau khi transaction hoàn tất.
- FE đã join board room và visible task rooms, có `rememberEvent`,
  `applyCanonicalTaskSnapshot` và cache list, nhưng chưa có event cho reorder
  list/move task.
- `useMoveTask` đang cập nhật cache bằng query key cụ thể; cần handler realtime
  cập nhật mọi query variant có filter của source/target list.
- Board có thể đang hiển thị dữ liệu phân trang/filter. Không được coi một cache
  partial là danh sách đầy đủ để thay thế bằng cách nối thủ công; event phải
  mang canonical snapshot hoặc handler phải invalidate query tương ứng.
- Optimistic mutation của tab A và event từ BE có thể đến theo thứ tự khác nhau.
  Cần quy tắc chống snapshot cũ ghi đè snapshot mới.

## 5. Realtime contract đề xuất

### 5.1. Event reorder list

Thêm vào BE/FE:

```ts
type BoardListsReorderedPayload = RealtimeEnvelope<{
  boardId: string;
  lists: ListResponseDto[]; // toàn bộ active lists, order canonical
}>;
```

Event name: `board:lists_reordered`.

BE emit sau khi `updateOrders` và đọc lại danh sách hoàn tất, tới
`boardRoom(boardId)`. `boardId` lấy từ route/DB và permission vẫn do HTTP
middleware quyết định; không nhận danh sách đã sắp xếp từ socket client.

### 5.2. Event move/reorder task

```ts
type BoardTasksReorderedPayload = RealtimeEnvelope<{
  boardId: string;
  taskId: string;
  sourceListId: string;
  targetListId: string;
  movedTask: TaskResponseDto;
  sourceTasks: TaskResponseDto[];
  targetTasks: TaskResponseDto[];
}>;
```

Event name: `board:tasks_reordered`.

BE emit sau khi `moveTask` commit và đã đọc lại source/target canonical. Gửi
tới `boardRoom(boardId)` để mọi board tab nhận được và tới `taskRoom(taskId)`
để task detail tab không nằm trong board vẫn nhận được. Nếu cần task detail
theo dõi các task bị ảnh hưởng, board event vẫn là nguồn cập nhật list; không
phát một event riêng cho từng task.

Mọi event bắt buộc có `eventId`, `occurredAt`, `actorId`. Không emit khi
validation, permission, lock hoặc transaction thất bại. Nếu publish lỗi sau
commit, log đầy đủ context và để client refetch khi reconnect.

### 5.3. Ordering/concurrency

- Thêm `orderVersion`/`boardRevision` được tạo server-side cho mỗi mutation
  reorder, hoặc một revision tương đương được lưu bền vững nếu BE chạy nhiều
  instance. Payload chứa revision; FE bỏ qua snapshot có revision thấp hơn
  revision đã áp dụng.
- Nếu chưa thể thêm revision trong phase đầu, dùng `updatedAt`/event ordering
  trong cùng connection như fallback và luôn invalidate/refetch sau reconnect;
  ghi rõ đây là last-write-wins, không phải đảm bảo chống concurrent mutation
  tuyệt đối.
- Echo về tab gửi request được áp dụng qua response HTTP và event có cùng
  revision chỉ được xử lý một lần. `eventId` dùng để dedupe, không thay thế
  revision.

## 6. Thiết kế FE consumer

### 6.1. Contract/type

- Thêm hai payload và hai event vào
  `FE/src/features/realtime/contracts/realtime-events.ts`.
- Date từ Socket.IO được chuẩn hóa về string như các task/list API hiện tại.
- Validate `eventId`, `boardId`, list ids, task ids, source/target id và đảm
  bảo `movedTask.id === taskId`, `movedTask.listId === targetListId` với
  cross-list.

### 6.2. Handler reorder list

Tạo `handlers/list-order-event-handlers.ts` hoặc mở rộng handler hiện có:

- `rememberEvent(eventId)` trước khi mutate cache.
- Ghi revision đã nhận theo board.
- Với các query list của board, thay thế/sort các list có trong canonical
  snapshot bằng `list-cache` helper; không làm sai pagination/filter metadata.
- Với query bị filter/pagination hoặc snapshot không đủ dữ liệu, invalidate
  `listKeys.boardPrefix(boardId)` thay vì tự đoán phần còn thiếu.
- Cập nhật local `orderedLists` trong `BoardDndProvider` từ query canonical;
  không giữ state local cũ ghi đè event từ tab khác.

### 6.3. Handler task reorder/move

Tạo `handlers/task-order-event-handlers.ts`:

- Dedupe và kiểm tra revision.
- Áp dụng `sourceTasks` và `targetTasks` vào mọi query task list tương ứng,
  bao gồm các query có filter; nếu filter có thể loại một task thì dùng helper
  `matchesFilters` để insert/remove đúng và cập nhật pagination.
- Cập nhật `taskKeys.detail(taskId)` bằng `movedTask` canonical. Không tự sửa
  `orderTask` theo index nếu BE đã trả order canonical.
- Khi source/target query chưa được load, không tạo cache giả; invalidate query
  khi query xuất hiện hoặc khi board room reconcile chạy.
- Nếu task detail đang mở và task chuyển list, detail vẫn giữ task nhưng query
  list mới phải phản ánh `listId` mới.

### 6.4. Mutation race và optimistic state

- Tab thực hiện DnD tiếp tục optimistic update và rollback khi HTTP fail.
- Khi mutation pending, lưu `mutationId`, source/target list và snapshot. Event
  cùng mutation từ server chỉ được nhận nếu revision không cũ hơn mutation.
- Khi event từ tab khác đến trong lúc local drag pending, hủy/merge optimistic
  snapshot theo revision server; không rollback về snapshot cũ sau khi server đã
  xác nhận mutation mới hơn.
- Sau HTTP success, dùng response canonical (`ListResponse[]` hoặc source/target
  tasks) để hoàn tất cache, không chỉ giữ array optimistic.
- Khi HTTP trả `400/403/404`, rollback snapshot local và invalidate board/list
  liên quan để lấy trạng thái mới nhất; toast lỗi không lặp lại do socket.

## 7. Room lifecycle và reconnect

- `useBoardRoom(boardId)` là room chính cho cả list reorder và task move.
- Visible task room tiếp tục phục vụ task detail; không join hàng trăm room
  ngoài board đang mở.
- Khi disconnect, giữ desired room registry nhưng xóa joined transport state;
  khi connect lại rejoin board/task rooms.
- Sau reconnect thành công, invalidate list query của board và task queries của
  các list đang hiển thị để bù event bị lỡ. Không xem Socket.IO replay là cơ
  chế delivery bền vững.
- Nếu `board:join` bị `FORBIDDEN/NOT_FOUND`, dừng retry room và không cập nhật
  cache từ event không thuộc board hiện tại.

## 8. Trình tự triển khai

### Phase 1 - Chốt contract và revision

- Xác nhận payload/room/event name và quyết định dùng revision server-side.
- Bổ sung DTO/type/schema realtime tương ứng ở BE và FE.
- Kiểm tra response serialization Date và permission route.

### Phase 2 - BE publish

- Thêm `emitBoardListsReordered` vào `RealtimeEventService` và event type.
- Gọi emit trong `ListService.reorderLists` sau canonical read.
- Thêm `emitBoardTasksReordered` và gọi trong `TaskService.moveTask` sau commit,
  resolve boardId server-side.
- Thêm log/error handling và unit/integration test cho room, actor, revision,
  same-list, cross-list, empty source và failure path.

### Phase 3 - FE canonical handlers

- Thêm contracts, validation, dedupe và revision store.
- Implement list reorder handler và task move handler, dùng query keys/cache
  helper hiện có.
- Đăng ký unregister đúng trong `useGlobalRealtime`.

### Phase 4 - Kết nối DnD state

- Đồng bộ `orderedLists` của `BoardDndProvider` với list query sau event.
- Bảo đảm snapshot optimistic của task không ghi đè event canonical.
- Xử lý query filter/pagination, task detail và empty list.
- Không gửi request khi drop cùng vị trí; không mutate khi event chỉ là echo đã
  dedupe.

### Phase 5 - Reconnect và conflict

- Rejoin board/task rooms sau reconnect.
- Refetch/invalidate bù event bị lỡ.
- Test hai tab thao tác xen kẽ, revision thấp/cao, HTTP lỗi sau event và publish
  failure sau DB commit.

### Phase 6 - Verification

- BE typecheck/test; FE `npm run build` và `npm run lint`.
- List reorder ở tab A cập nhật thứ tự list ở tab B.
- Same-list task reorder cập nhật đúng thứ tự ở tab B.
- Cross-list move cập nhật source/target ở tab B và detail task.
- Duplicate `eventId` chỉ áp dụng một lần.
- Event cũ/revision thấp không ghi đè snapshot mới.
- Filter/pagination không làm mất task/list ngoài query hiện tại.
- HTTP `403/404/400` rollback đúng và refetch canonical.
- Mất mạng/reconnect vẫn có room và trạng thái order đúng.
- Board khác không nhận hoặc áp dụng event của board hiện tại.

## 9. Acceptance criteria

- Mỗi mutation reorder thành công phát đúng một event canonical tương ứng sau
  commit: `board:lists_reordered` hoặc `board:tasks_reordered`.
- Event chứa `eventId`, `occurredAt`, `actorId`, board/list/task ids và snapshot
  đủ để client không phải tự suy diễn order.
- Mọi tab có quyền xem board cập nhật list/task mà không reload; task detail
  ngoài board vẫn nhận move của task qua task room.
- Cache list/task, filter/pagination, local DnD state và detail không mâu thuẫn
  sau HTTP response hoặc socket event.
- Mutation lỗi không để lại optimistic order sai; event lỗi/duplicate không gây
  toast hoặc request lặp.
- Reconnect refetch bù event bị lỡ và không làm lộ dữ liệu giữa các board.
- Test concurrency/revision xác nhận snapshot cũ không ghi đè snapshot mới.

## 10. Rủi ro cần giữ rõ

- BE hiện yêu cầu full id list/task; nếu FE chỉ tải một trang hoặc đang filter,
  phải disable reorder hoặc fetch full dataset trước khi gửi HTTP. Realtime
  handler không được biến snapshot partial thành canonical toàn board.
- Nếu chưa có revision bền vững, concurrent drag ở nhiều tab chỉ có semantics
  last-write-wins; cần ghi rõ giới hạn này trong release notes.
- Socket.IO không bảo đảm delivery khi disconnect; refetch sau reconnect là bắt
  buộc.
- Không phát một event cho từng task khi move; dùng snapshot source/target để
  tránh burst event và giữ tính nhất quán giữa hai list.
