# Plan realtime cho update/delete task và list

## 1. Mục tiêu

Đồng bộ realtime các thao tác sửa và xóa task/list giữa mọi tab có quyền xem
board, giữ dữ liệu canonical từ BE và không để detail, board card, list column
hoặc React Query cache hiển thị dữ liệu stale.

Phạm vi:

- Update task: `name`, `description`.
- Delete task: soft-delete task.
- Update list: `name`, `description`, và `order` nếu endpoint được dùng.
- Delete list: soft-delete list.
- Dedupe, reconnect, permission/error handling và race HTTP/socket.

Không mở rộng sang create, assign, tag, comment, schedule hoặc drag-drop
reorder; các phần đó có plan realtime riêng.

## 2. Code đã đọc

### BE

- `Manage -Task/BE/src/modules/tasks/task.service.ts`
- `Manage -Task/BE/src/modules/tasks/task.controller.ts`
- `Manage -Task/BE/src/modules/tasks/task.router.ts`
- `Manage -Task/BE/src/modules/tasks/task.repository.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/updateTask.req.ts`
- `Manage -Task/BE/src/modules/lists/list.service.ts`
- `Manage -Task/BE/src/modules/lists/list.controller.ts`
- `Manage -Task/BE/src/modules/lists/list.router.ts`
- `Manage -Task/BE/src/modules/lists/list.repository.ts`
- `Manage -Task/BE/src/modules/lists/dtos/requests/updateList.req.ts`
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts`
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts`

### FE

- `FE/src/features/tasks/api/task-api.ts`
- `FE/src/features/tasks/hooks/useUpdateTask.ts`
- `FE/src/features/tasks/hooks/useDeleteTask.ts`
- `FE/src/features/tasks/utils/task-cache.ts`
- `FE/src/features/lists/api/list-api.ts`
- `FE/src/features/lists/hooks/useUpdateList.ts`
- `FE/src/features/lists/hooks/useDeleteList.ts`
- `FE/src/features/lists/utils/list-cache.ts`
- `FE/src/features/realtime/contracts/realtime-events.ts`
- `FE/src/features/realtime/hooks/useTaskSocket.ts`
- `FE/src/features/realtime/hooks/useBoardRoom.ts`
- `FE/src/features/realtime/rooms/board-room-registry.ts`
- `FE/src/components/boards/board-dnd-provider.tsx`
- `FE/src/components/tasks/task-detail-provider.tsx`

## 3. HTTP contract và business rule

### 3.1. Update task

```http
PUT /task/:id
```

```ts
{ name?: string; description?: string }
```

Response là `TaskResponse` canonical, gồm `listId`, `updatedAt`, assignments,
tags và schedule/lock fields. BE yêu cầu `UPDATE_TASK`, task phải tồn tại và
không bị lock.

### 3.2. Delete task

```http
DELETE /task/:id
```

BE soft-delete (`deletedAt = now`, `status = INACTIVE`) và trả task sau delete.
Route yêu cầu `DELETE_TASK`; đây không phải hard-delete.

### 3.3. Update list

```http
PUT /list/:id/update
```

```ts
{ name?: string; description?: string; order?: number }
```

Response là `ListResponse` canonical, route yêu cầu `UPDATE_LIST`. Nếu endpoint
này thay đổi `order`, event phải mang order mới; bulk reorder có plan riêng.

### 3.4. Delete list

```http
DELETE /list/:id/delete
```

BE soft-delete list (`deletedAt = now`, `status = INACTIVE`) và trả list sau
delete, route yêu cầu `DELETE_LIST`.

**Điểm phải chốt trước khi code:** `ListRepository.deleteList` hiện chỉ update
list, không soft-delete task trong list, trong khi UI dialog mô tả mọi task bị
xóa. Có hai lựa chọn:

- Giữ semantics hiện tại: event chỉ xóa list khỏi active cache, FE invalidate
  task query của list và không đánh dấu task deleted.
- Đổi BE sang cascade soft-delete trong transaction; event phải chứa
  `deletedTaskIds` hoặc task deletion snapshots.

FE không được tự suy đoán cascade khi BE chưa commit cascade.

## 4. Khoảng trống hiện tại

- `RealtimeEventService` chưa có event update/delete task hoặc update/delete
  list.
- `TaskService.updateTask/deleteTask` và `ListService.updateList/deleteList`
  chưa nhận actor id, chưa emit sau canonical read.
- FE task mutation đã có `applyCanonicalTaskSnapshot` và
  `removeTaskAcrossCaches`; list mutation chủ yếu invalidate query, chưa có
  socket handler.
- Delete handler phải xử lý detail đang mở, query filters/pagination và DnD
  state; không chỉ xóa một query key cụ thể.
- `eventId` dedupe đã có, nhưng cần ordering/version để HTTP response cũ không
  ghi đè socket snapshot mới.

## 5. Realtime contract đề xuất

### 5.1. `task:updated`

```ts
type TaskUpdatedPayload = RealtimeEnvelope<{
  boardId: string;
  task: TaskResponseDto;
}>;
```

Emit tới `boardRoom(boardId)` và `taskRoom(task.id)`. BE resolve boardId từ
task -> list, payload là full task canonical, không chỉ patch name/description.

### 5.2. `task:deleted`

```ts
type TaskDeletedPayload = RealtimeEnvelope<{
  boardId: string;
  taskId: string;
  listId: string;
  task: TaskResponseDto;
}>;
```

Emit tới board room và task room trước khi detail bị đóng. `deletedAt/status`
trong snapshot là authority.

### 5.3. `list:updated`

```ts
type ListUpdatedPayload = RealtimeEnvelope<{
  boardId: string;
  list: ListResponseDto;
}>;
```

Emit tới `boardRoom(boardId)`. Nếu list đổi order riêng lẻ, payload vẫn canonical;
bulk order event của plan DnD chịu trách nhiệm snapshot toàn board.

### 5.4. `list:deleted`

```ts
type ListDeletedPayload = RealtimeEnvelope<{
  boardId: string;
  listId: string;
  list: ListResponseDto;
  deletedTaskIds?: string[];
}>;
```

`deletedTaskIds` chỉ bắt buộc khi BE chọn cascade. Với semantics hiện tại, FE
remove list, invalidate task queries của list và không tự remove task detail.

Mọi event có `eventId`, `occurredAt`, `actorId`, emit sau DB commit và không emit
khi permission/validation/update thất bại.

## 6. Ordering và mutation race

- Bổ sung `entityVersion`/revision server-side cho task/list, hoặc dùng
  `updatedAt` canonical làm fallback. `eventId` chỉ dedupe, không giải quyết
  ordering.
- FE giữ version theo `taskId`/`listId`, bỏ qua snapshot cũ hơn snapshot đã áp
  dụng. Nếu cần chống concurrent update tuyệt đối, version phải bền vững khi BE
  chạy nhiều instance.
- HTTP response và socket event cùng gọi canonical helper; echo không tạo toast
  success lần hai.
- Nếu delete event đến trước HTTP success, mutation không được reinsert entity.
- Delete idempotent: không giảm pagination nhiều lần, không mở lại detail stale.

## 7. FE handlers và cache

Tạo `features/realtime/handlers/task-list-lifecycle-event-handlers.ts` và đăng
ký trong `useGlobalRealtime`.

### Task updated

- Validate envelope, board/task id và `rememberEvent(eventId)`.
- Gọi `applyCanonicalTaskSnapshot` cho mọi task list query có filter và task
  detail; cập nhật `TaskDetailProvider.selectedTask` nếu đang mở.

### Task deleted

- Dedupe/version guard, gọi `removeTaskAcrossCaches(taskId)`.
- Remove detail query; nếu detail đang mở thì đóng hoặc hiển thị “task no
  longer available”.
- Invalidate query của `listId` để bù pagination/ordering và không toast cho
  tab nhận event.

### List updated

- Dùng list-cache helper cho mọi board query có name/status filter.
- Đồng bộ `orderedLists` trong `BoardDndProvider`; canonical event thắng local
  state cũ.
- Nếu snapshot không đủ cho thứ tự hiện hành, invalidate board list query.

### List deleted

- Remove list khỏi mọi board query và invalidate `listKeys.boardPrefix(boardId)`.
- Invalidate task queries của `listId`.
- Chỉ remove task caches/detail khi event xác nhận cascade bằng
  `deletedTaskIds`/task snapshots.
- Nếu list đang là drag target hoặc dialog đang mở, clear/disable local UI state.

## 8. Room lifecycle và reconnect

- Board room là kênh chính cho list/task lifecycle event.
- Task detail tiếp tục join task room để nhận update/delete ngoài board.
- Khi reconnect, rejoin rồi invalidate board lists, visible task lists và open
  detail; Socket.IO không replay event bị lỡ.
- Join bị `FORBIDDEN/NOT_FOUND` thì dừng retry và không áp dụng event ngoài board.

## 9. Trình tự triển khai

### Phase 1 - Chốt semantics và contract

- Quyết định list delete có cascade hay không; đồng bộ BE response, UI copy và
  event payload.
- Chốt event names, envelope, actor, version strategy và room routing.
- Bổ sung type/schema realtime ở BE và FE.

### Phase 2 - BE publish

- Cho update/delete task và update/delete list nhận `actorUserId` từ controller.
- Resolve board/list relation server-side.
- Emit canonical event sau repository update và canonical read.
- Nếu cascade list delete, dùng transaction và trả đủ deleted task ids.
- Test permission failure không emit, success emit đúng một event và publish
  failure không rollback DB đã commit.

### Phase 3 - FE handlers

- Implement validation, dedupe, version map và lifecycle handlers.
- Bổ sung list update/remove helper nếu cache helper hiện tại chưa đủ.
- Đồng bộ selected task, detail close state, DnD state và pagination.

### Phase 4 - HTTP race

- Dùng cùng canonical helper cho HTTP response và socket event.
- Chặn reinsert entity đã deleted; rollback/invalidate đúng khi 403/404/conflict.
- Không để form/local state tab khác ghi đè snapshot server mới hơn.

### Phase 5 - Verification

- Rejoin room và refetch sau reconnect.
- Test hai tab update task/list, delete task/list, detail đang mở, filter,
  pagination, stale/duplicate event và board permission.
- Chạy BE typecheck/test, FE `npm run build` và `npm run lint`.

## 10. Acceptance criteria

- Update task ở tab A cập nhật card/detail tab B bằng full canonical task.
- Delete task làm task biến mất khỏi mọi list cache và detail tab B đóng hoặc
  báo task không còn tồn tại.
- Update list cập nhật name/description/order ở mọi board tab.
- Delete list làm list biến mất, pagination đúng và task query được invalidate
  theo semantics delete đã chốt.
- Mutation thành công phát đúng event sau commit, có envelope/actor/eventId;
  mutation thất bại không phát event.
- Duplicate event không tạo toast, giảm pagination hai lần hoặc reinsert entity.
- Snapshot cũ không ghi đè snapshot mới; HTTP/socket race nhất quán.
- Reconnect bù dữ liệu bị lỡ và không lộ event giữa các board.

## 11. Rủi ro cần giữ rõ

- List delete hiện không cascade task ở BE; phải chốt trước khi implement, không
  để FE giả định theo nội dung dialog.
- Soft-delete response vẫn là entity có dữ liệu; event delete phải truyền đủ
  `deletedAt/status`.
- Nếu chưa có version bền vững, concurrent edits chỉ có last-write-wins.
- Reconnect refetch là bắt buộc vì Socket.IO không đảm bảo delivery khi mất mạng.
