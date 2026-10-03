# Kế hoạch triển khai realtime cho Task Assignment

> Baseline được khảo sát ngày 2026-08-18 trên hai codebase:
> `Manage -Task/BE` và `FE`.
>
> Phạm vi: đồng bộ realtime danh sách assignee của task giữa các tab/browser
> đang mở cùng board hoặc cùng task. REST tiếp tục là command; Socket.IO chỉ
> broadcast snapshot đã commit.

## 1. Kết luận kiến trúc

Feature nên dùng event duy nhất:

```text
task:assignments_updated
```

Backend phát cùng một payload tới union của hai room:

```text
task:{taskId} + board:{boardId}
```

- `board:{boardId}` cập nhật avatar/count trên mọi task card đang mở.
- `task:{taskId}` cập nhật task detail ngay cả khi task được mở ở một context
  không mount board room trong tương lai.
- Dùng một chained broadcast của Socket.IO để socket đã join cả hai room chỉ
  nhận một bản event.
- Payload chứa full `TaskResponseDto` canonical, không chỉ gửi `userIds`, để FE
  không tự dựng task snapshot và không bỏ sót field khác.
- TanStack Query là server-state source of truth. Event handler ghi vào query
  cache; cơ chế sync hiện có trong `TaskDetailContent` sẽ đưa detail đang mở về
  snapshot mới.
- Không hiển thị success toast cho event socket. Client tạo mutation đã có toast
  từ HTTP hook; toast socket sẽ gây lặp và gây nhiễu cho client khác.

Luồng mục tiêu:

```text
User A
  -> PATCH/DELETE assignment
  -> DB transaction commit
  -> response canonical + assignmentVersion
       |-> HTTP response -> cache của A
       `-> Socket event  -> board/task room -> cache của A, B, C
```

## 2. Hiện trạng đã xác minh

### 2.1. Backend đã có

- REST assignment đã hoạt động:
  - `PATCH /task/:taskId/assign`: replace-all, body `userIds` có ít nhất một ID.
  - `DELETE /task/:taskId/assign/:userId`: gỡ một assignee, kể cả assignee cuối.
- `TaskService.assignTask()` kiểm tra task lock và active board members.
- `TaskService.unassignTask()` kiểm tra assignment active trước khi soft-delete.
- Cả hai flow trả `TaskResponseDto` với `assign: string[]` canonical.
- Controller assign đã truyền `actorUserId`; controller unassign chưa truyền actor.
- Socket.IO đã có:
  - JWT authentication;
  - `task:join` / `task:leave`;
  - `board:join` / `board:leave`;
  - `RealtimeEnvelope` gồm `eventId`, `occurredAt`, `actorId`, `data`;
  - `RealtimeEventService` và helper `taskRoom`, `boardRoom`.
- Board room đã được permission-check trước khi join.
- Realtime tag đã có pattern broadcast tới union task room + board room.

Backend còn thiếu:

- Contract `task:assignments_updated`.
- Publisher sau assign/unassign commit.
- `actorId` cho unassign.
- Revision riêng để phân biệt snapshot assignment mới/cũ.
- Automated test cho realtime assignment.

### 2.2. Frontend đã có

- REST API, hooks và UI assignment đã hoàn chỉnh:
  - `taskApi.assign()` / `taskApi.unassign()`;
  - `useAssignTask()` / `useUnassignTask()`;
  - picker board members;
  - assignee chips trong detail;
  - avatar group trên task card.
- Hai mutation hook đã apply response qua `applyCanonicalTaskSnapshot()`.
- `DetailBoard` đã gọi `useBoardRoom(boardId, listIds)`.
- Task detail đã gọi `useTaskSocket(task.id)`.
- `useGlobalRealtime()` là owner duy nhất của global event listeners.
- `TaskDetailContent` subscribe detail query cache và gọi
  `updateSelectedTask()`, nên remote assignment chỉ cần cập nhật đúng detail
  query cache.
- Board-room reconnect đã invalidate task list/detail để bù event bị lỡ.

Frontend còn thiếu:

- Typed payload và event `task:assignments_updated`.
- Handler apply assignment snapshot vào cache.
- Listener registration/unregistration trong `useGlobalRealtime()`.
- Revision-aware merge cho field `assign`.
- Test reducer/idempotency và manual test hai browser.

### 2.3. Lỗi liên quan cần sửa trong cùng feature

`useUnassignTask.onError(404)` hiện gọi `removeTaskAcrossCaches(taskId)`. Đây là
hành vi sai: `404` của endpoint này có thể chỉ có nghĩa assignment đã bị một
client khác gỡ trước, không có nghĩa task đã bị xóa. Kết quả hiện tại là task có
thể biến mất khỏi board local.

Hướng sửa:

- Không xóa task khỏi cache ở lỗi unassign `404`.
- Invalidate/refetch detail task và các task-list query chứa `listId`.
- Sau refetch, chỉ đóng detail nếu API task thật sự trả `404`.

## 3. Contract realtime mục tiêu

### 3.1. Event envelope

Giữ envelope đang dùng cho realtime tag:

```ts
type RealtimeEnvelope<T> = {
  eventId: string;
  occurredAt: Date; // serialize thành ISO string ở FE
  actorId: string | null;
  data: T;
};
```

### 3.2. Payload

Backend:

```ts
type TaskAssignmentsUpdatedPayload = RealtimeEnvelope<{
  boardId: string;
  taskId: string;
  task: TaskResponseDto;
}>;

type ServerToClientEvents = {
  "task:assignments_updated": (
    payload: TaskAssignmentsUpdatedPayload,
  ) => void;
};
```

Frontend mirror:

```ts
type TaskAssignmentsUpdatedPayload = RealtimeEnvelope<{
  boardId: string;
  taskId: string;
  task: TaskResponse;
}>;
```

Invariant bắt buộc trước khi apply ở FE:

- `eventId`, `boardId`, `taskId` là string hợp lệ.
- `payload.data.task.id === payload.data.taskId`.
- `payload.data.task.assign` là `string[]`.
- `payload.data.task.assignmentVersion` là integer không âm.
- Payload invalid bị bỏ qua và chỉ debug-log ở development.

### 3.3. Broadcast semantics

`RealtimeEventService` tạo envelope một lần và broadcast một lần:

```ts
io.to(taskRoom(taskId))
  .to(boardRoom(boardId))
  .emit("task:assignments_updated", payload);
```

Không gọi hai lệnh emit riêng. Một socket thường join cả task room và board
room; chained broadcast dùng union room và tránh duplicate delivery.

Event chỉ được phát sau transaction thành công. Lỗi publish không rollback
HTTP mutation đã commit; backend phải log `eventId`, `taskId`, `boardId` để có
thể trace và FE reconnect/refetch sẽ reconcile.

## 4. Revision và xử lý concurrent update

### 4.1. Vì sao `updatedAt` hiện tại chưa đủ

Assign/unassign chỉ thay đổi bảng `taskAssignments`; parent row `tasks` không
được update. Vì vậy `tasks.updatedAt` có thể giữ nguyên dù `assign` đã đổi.

Ngoài ra HTTP response và socket echo có thể tới FE theo thứ tự khác thứ tự
commit. Nếu chỉ replace toàn bộ task, snapshot cũ có thể ghi đè assignment mới.

### 4.2. Thêm `assignmentVersion`

Thêm vào Prisma model `tasks`:

```prisma
assignmentVersion Int @default(0) @map("assignment_version")
```

Trong cùng transaction với replace/remove assignment:

```ts
await tx.tasks.update({
  where: { id: taskId },
  data: { assignmentVersion: { increment: 1 } },
});
```

Sau đó query canonical task bằng cùng transaction và trả version mới trong
`TaskResponseDto`.

Yêu cầu transaction:

- `replaceTaskAssignments`: update join table + increment version + read
  canonical snapshot trong một transaction.
- `removeTaskAssignment`: soft-delete + increment version + read canonical
  snapshot trong một transaction.
- Không increment nếu mutation thất bại hoặc không thay đổi dữ liệu.

### 4.3. Merge theo từng field ở FE

`task-cache.ts` hiện bảo vệ `tags` bằng `tagVersion`. Mở rộng merge để bảo vệ
độc lập cả hai sub-resource:

```ts
function mergeTaskSnapshot(current, incoming) {
  const merged = { ...current, ...incoming };

  if (current && incoming.tagVersion < current.tagVersion) {
    merged.tags = current.tags;
    merged.tagVersion = current.tagVersion;
  }

  if (current && incoming.assignmentVersion < current.assignmentVersion) {
    merged.assign = current.assign;
    merged.assignmentVersion = current.assignmentVersion;
  }

  return merged;
}
```

Không reject toàn bộ incoming task chỉ vì một revision cũ hơn. Ví dụ event
schedule mới có thể mang `assignmentVersion` cũ nhưng vẫn có schedule mới; FE
chỉ giữ lại field assignment có revision cao hơn.

Các response/task event khác phải luôn serialize cả `tagVersion` và
`assignmentVersion`. FE normalize missing version về `0` trong giai đoạn rollout
để cache cũ không làm crash UI.

### 4.4. Giới hạn của replace-all và lựa chọn concurrency

`assignmentVersion` giải quyết thứ tự apply snapshot ở client, nhưng không tự
ngăn lost update ở command layer. Ví dụ A và B cùng đọc `[X]`, A gửi `[X, Y]`, B
gửi `[X, Z]`; nếu cả hai request hợp lệ thì state cuối theo last-write-wins có
thể là `[X, Z]` và mất `Y`.

MVP realtime có thể chấp nhận last-write-wins nếu product chỉ yêu cầu các client
hội tụ về state canonical cuối cùng. Khi đó:

- picker reconcile draft với event mới nhất trước lúc confirm;
- version chỉ quyết định snapshot nào mới hơn;
- acceptance test không được kỳ vọng merge union cho hai request thật sự chạy
  đồng thời.

Nếu product yêu cầu không mất assignment concurrent, bổ sung optimistic
concurrency vào `PATCH /assign`:

```ts
type AssignTaskRequest = {
  userIds: string[];
  expectedAssignmentVersion: number;
};
```

Backend compare version trong cùng transaction. Version không khớp thì trả
`409 Conflict` kèm canonical task hiện tại và không mutate/emit. FE nhận `409`,
apply canonical task, rebase `pendingIds` lên danh sách mới rồi cho user confirm
lại; chỉ auto-retry một lần nếu thao tác picker thuần add và không có remove.

Plan mặc định triển khai MVP last-write-wins. Optimistic concurrency là phase
P1 riêng, không nên ngầm tuyên bố đã giải quyết concurrent write chỉ nhờ socket.

## 5. Thay đổi Backend theo file

### 5.1. Prisma và response DTO

Files:

```text
Manage -Task/BE/prisma/schema.prisma
Manage -Task/BE/prisma/migrations/<timestamp>_add_task_assignment_version/
Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts
```

Công việc:

1. Thêm `assignmentVersion` default `0` vào `tasks`.
2. Tạo migration chỉ thêm column, không rewrite assignment hiện tại.
3. Map field trong `TaskResponseDto`.
4. Thêm field vào `taskResponseSchema` để OpenAPI đúng contract.
5. Bảo đảm toàn bộ endpoint task cũ vẫn trả field này.

### 5.2. Repository transaction

File:

```text
Manage -Task/BE/src/modules/tasks/task.repository.ts
```

Công việc:

1. Trong `replaceTaskAssignments()`, increment `assignmentVersion` sau khi các
   assignment changes thành công và trước canonical query.
2. Trong `removeTaskAssignment()`, thực hiện soft-delete, increment và query
   task trong cùng `$transaction` nếu hiện tại các bước còn tách rời.
3. `taskDetailsInclude` không cần đổi vì `assignmentVersion` là scalar của task.
4. Trả snapshot với active `taskAssignments` đúng như hiện tại.

Nếu muốn tránh phát event/version khi PATCH gửi đúng tập assignee hiện tại,
repository có thể compare set trước khi write. Đây là optimization; MVP có thể
coi mỗi request hợp lệ là một revision mới miễn snapshot vẫn canonical.

### 5.3. Typed realtime contract và publisher

Files:

```text
Manage -Task/BE/src/modules/realtime/realtime.types.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
```

Công việc:

1. Thêm `TaskAssignmentsUpdatedPayload` và event vào
   `ServerToClientEvents`.
2. Thêm method:

```ts
emitTaskAssignmentsUpdated(args: {
  boardId: string;
  taskId: string;
  task: TaskResponseDto;
  actorId?: string | null;
}): void
```

3. Tạo `RealtimeEnvelope` bằng `createRealtimeEnvelope()`.
4. Broadcast tới union task + board room.
5. Catch/log publish error với `eventId`; không throw ngược làm HTTP trả lỗi sau
   khi DB đã commit.

### 5.4. Publish sau assign/unassign

Files:

```text
Manage -Task/BE/src/modules/tasks/task.controller.ts
Manage -Task/BE/src/modules/tasks/task.service.ts
```

`assignTask()`:

1. Đã resolve được `boardId` và `actorUserId`.
2. Sau repository commit, map `updatedTask` thành `response` đúng một lần.
3. Gọi `emitTaskAssignmentsUpdated({ boardId, taskId, task: response,
   actorId })`.
4. Trả cùng object `response` qua HTTP.

`unassignTask()`:

1. Controller lấy `actorUserId` giống assign và truyền vào service.
2. Service resolve `boardId` trước mutation hoặc dùng task/list context đã load.
3. Sau commit, map response một lần, emit cùng contract rồi trả HTTP.

Không publish trong controller hoặc repository. Service là nơi có đủ canonical
response, actor và board context sau commit.

## 6. Thay đổi Frontend theo file

### 6.1. Task type và field-aware cache merge

Files:

```text
FE/src/features/tasks/types/index.ts
FE/src/features/tasks/utils/task-cache.ts
```

Công việc:

1. Thêm `assignmentVersion: number` vào `TaskResponse`.
2. Normalize payload cũ thiếu field về `0` trong cache boundary.
3. Refactor `mergeTaskSnapshot()` để merge `tags/tagVersion` và
   `assign/assignmentVersion` độc lập.
4. Giữ `applyCanonicalTaskSnapshot()` là entry point chung cho cả HTTP và
   socket.
5. Không thêm cache riêng cho assignment.

### 6.2. Typed socket contract

File:

```text
FE/src/features/realtime/contracts/realtime-events.ts
```

Công việc:

1. Thêm `TaskAssignmentsUpdatedPayload` mirror backend.
2. Thêm `task:assignments_updated` vào `ServerToClientEvents`.
3. Không dùng `unknown` hoặc type assertion ở listener business logic ngoài
   runtime validation boundary.

### 6.3. Event handler

Tạo file:

```text
FE/src/features/realtime/handlers/assignment-event-handlers.ts
```

Handler gồm ba phần:

1. Runtime guard cho envelope/task invariants.
2. Event ID dedupe bounded.
3. Apply canonical snapshot:

```ts
export function applyTaskAssignmentsUpdated(
  queryClient: QueryClient,
  payload: TaskAssignmentsUpdatedPayload,
): void {
  if (!isValid(payload) || !rememberEvent(payload.eventId)) return;
  applyCanonicalTaskSnapshot(queryClient, payload.data.task, {
    source: "socket",
  });
}
```

Nên tách `rememberEvent()` đang nằm private trong `tag-event-handlers.ts` thành
helper dùng chung:

```text
FE/src/features/realtime/utils/event-dedupe.ts
```

Như vậy mọi event envelope dùng chung một bounded set, tránh mỗi handler tự có
policy khác nhau. Dedupe chỉ là lớp bảo vệ delivery; revision vẫn là lớp bảo vệ
ordering.

Không invalidate sau mỗi event hợp lệ vì full task snapshot đã đủ để cập nhật
card/detail. Invalidate chỉ dùng khi payload invalid, reconnect hoặc phát hiện
version gap trong một thiết kế tương lai.

### 6.4. Global listener ownership

File:

```text
FE/src/features/realtime/hooks/useTaskSocket.ts
```

Công việc:

1. Import và register `registerAssignmentEventHandlers(socket, queryClient)`
   trong `useGlobalRealtime()`.
2. Gọi unregister trong cleanup, cùng vị trí task/tag handlers.
3. Không register listener trong `TaskAssignees`, `TaskCard` hoặc
   `useAssignTask`; StrictMode sẽ gây duplicate listeners nếu ownership bị rải
   vào component.
4. Không cần join room mới: board và task room hiện có đã đủ.

Về sau nên đổi tên/refactor `useTaskSocket.ts` thành provider/module rõ ownership
hơn, nhưng không cần mở rộng scope chỉ để hoàn thành feature assignment.

### 6.5. Sửa REST mutation edge case

File:

```text
FE/src/features/tasks/hooks/useUnassignTask.ts
```

Công việc:

1. Bỏ `removeTaskAcrossCaches()` khỏi nhánh unassign `404`.
2. Invalidate các list query của `variables.listId` và detail query của task.
3. Giữ toast `Assignee was already removed.`.
4. Không rollback một socket snapshot mới hơn bằng state trước mutation.

`useAssignTask` và `useUnassignTask` tiếp tục apply HTTP response bằng
`applyCanonicalTaskSnapshot()`. Với `assignmentVersion`, HTTP response và socket
echo trở nên idempotent dù đến theo thứ tự nào.

### 6.6. UI không cần thay đổi layout

Không cần sửa layout của:

- `TaskAssignees`;
- `TaskAssigneePicker`;
- `TaskCard`;
- `AssigneeAvatarGroup`.

Các component này đã render từ `task.assign`. Khi query cache nhận canonical
snapshot:

- task card re-render avatar/count;
- detail query update;
- subscription trong `TaskDetailContent` gọi `updateSelectedTask()`;
- chip/picker nhận `currentAssignIds` mới.

Nếu picker đang mở và remote event thêm một member đang được chọn local, UI cần
reconcile draft:

- cập nhật `currentAssignIds` ngay;
- loại ID vừa được remote-assign khỏi `pendingIds` hoặc đánh dấu assigned;
- khi confirm luôn merge với `currentAssignIds` mới nhất, không dùng snapshot
  lúc dialog vừa mở.

Việc này tránh PATCH replace-all vô tình xóa assignment vừa được client khác
thêm.

## 7. Trình tự triển khai

### Phase 0 - Chốt contract và baseline

1. Chốt tên event `task:assignments_updated`.
2. Chốt `assignmentVersion` và migration.
3. Ghi fixture một canonical task có `assign`, `assignmentVersion`,
   `tagVersion`.
4. Chạy baseline:

```bash
cd "Manage -Task/BE" && npx tsc --noEmit
cd FE && npm run build
```

Gate: cả hai codebase compile trước khi sửa; lỗi baseline được ghi riêng.

### Phase 1 - Backend revision và event publishing

1. Schema/migration/DTO.
2. Repository increment version trong transaction.
3. Realtime contract + publisher.
4. Service publish sau assign và unassign.
5. Controller truyền actor cho unassign.

Gate:

- Mỗi mutation hợp lệ tăng `assignmentVersion` đúng một lần.
- HTTP response và socket payload chứa cùng `task.id`, `assign`, version.
- Socket đang ở cả board và task room chỉ nhận một event.
- Mutation lỗi không phát event.

### Phase 2 - Frontend contract, merge và listener

1. Thêm task type/version.
2. Refactor field-aware `mergeTaskSnapshot()`.
3. Thêm socket contract.
4. Tạo assignment handler + shared dedupe.
5. Register một lần trong global realtime owner.
6. Sửa unassign `404` cache behavior.

Gate:

- Remote event cập nhật card và detail không reload.
- Socket echo không tạo duplicate toast hoặc duplicate assignee.
- Snapshot assignment version thấp hơn không ghi đè version cao hơn.
- Tag version mới hơn vẫn được giữ khi assignment event mang tag snapshot cũ.

### Phase 3 - Concurrent picker và reconnect hardening

1. Reconcile `pendingIds` khi `currentAssignIds` thay đổi trong picker đang mở.
2. Confirm dùng props/current state mới nhất.
3. Xác minh board-room reconnect refetch list/detail có bao phủ assignment.
4. Dev log event invalid/version regression có `eventId`, không log token.

Gate:

- Event tới khi picker còn mở được reconcile vào draft; với hai request thực sự
  đồng thời, MVP hội tụ theo last-write-wins đã công bố.
- Offline rồi online lại: board/detail khớp REST canonical state.

### Phase 4 - Verification và cleanup

1. Compile BE.
2. Build và lint FE; phân biệt lỗi baseline với regression.
3. Chạy manual matrix hai browser/tab.
4. Cập nhật tài liệu architecture realtime nếu contract cuối khác plan.

## 8. Test plan

### 8.1. Unit test ưu tiên

Project chưa có test runner cấu hình sẵn. Nếu thêm Vitest trong scope triển khai,
ưu tiên test pure reducer/guard sau:

- Event hợp lệ apply đúng `assign` vào list cache và detail cache.
- Event cùng `eventId` apply một lần.
- `assignmentVersion` thấp hơn giữ assignment hiện tại.
- `assignmentVersion` cao hơn thay assignment hiện tại.
- `tagVersion` thấp hơn không overwrite tags dù assignment mới hơn.
- Payload có `taskId !== task.id` bị bỏ qua.
- Payload thiếu `assignmentVersion` không crash trong rollout compatibility.
- Filter task hiện tại không bị ảnh hưởng vì assignment chưa là filter criterion.

Backend nên test:

- Assign publish đúng room/event/payload sau commit.
- Unassign publish đúng actor và canonical snapshot.
- Không publish khi user không thuộc board, task locked hoặc assignment không tồn
  tại.
- `assignmentVersion` rollback cùng transaction khi DB mutation fail.

Nếu chưa thêm test runner, các case này phải được chạy manual và compile/build là
gate bắt buộc; không coi build là thay thế unit test.

### 8.2. Manual matrix hai browser

Chuẩn bị browser A và B đăng nhập hai user có quyền, mở cùng board:

1. A mở task detail; B chỉ nhìn task card.
2. A assign member X:
   - A thấy success toast một lần;
   - A detail/card cập nhật;
   - B card cập nhật không toast.
3. B mở detail và unassign X:
   - A detail/card cập nhật;
   - B detail/card cập nhật.
4. Remove assignee cuối cùng: cả hai client về empty state.
5. A và B cùng mở detail; A add X, B add Y gần đồng thời; cuối cùng cả hai phải
   hội tụ về REST canonical state. Với MVP last-write-wins, không assert kết quả
   là union; nếu bật optimistic concurrency thì request stale phải nhận `409`.
6. B đang mở picker, A assign X; picker B phải đánh dấu X assigned và không xóa
   X khi confirm lựa chọn khác.
7. Ngắt mạng B, A đổi assignment, nối lại B; reconnect reconcile phải lấy state
   mới.
8. Logout B rồi login user khác; không nhận event room/session cũ.
9. User không có permission gọi assign/unassign: REST báo lỗi và không client
   nào nhận event.
10. Task `OVERDUE_LOCKED`: mutation bị chặn, version không tăng, không emit.

## 9. Acceptance criteria

- Assign/unassign từ một client xuất hiện trên mọi client đang mở cùng board
  trong thời gian thực, không cần reload.
- Task detail đang mở và task card luôn hiển thị cùng danh sách/count assignee.
- Event dùng full canonical `TaskResponse` và envelope typed ở cả BE/FE.
- Backend emit sau commit tới union task room + board room.
- Client join cả hai room không nhận hai lần cùng event.
- HTTP response và socket echo idempotent.
- Snapshot có `assignmentVersion` cũ không ghi đè assignment mới.
- Assignment merge không làm mất tags mới hơn và ngược lại.
- Remote event không tạo success toast.
- Unassign `404` không xóa cả task khỏi cache.
- Reconnect/refetch hội tụ về REST canonical state.
- Không có listener leak hoặc duplicate listener trong React StrictMode.
- `npx tsc --noEmit` của BE và `npm run build` của FE thành công, ngoài lỗi
  baseline đã ghi nhận trước khi implement.

## 10. Ngoài phạm vi MVP

- Notification cá nhân khi được assign/unassign. Cần product rule rõ về người
  nhận, nội dung và notification history trước khi thêm `notification:new`.
- Realtime board member catalog; assignment event chỉ thay đổi IDs trên task.
- Presence, typing indicator hoặc audit activity feed.
- Transactional outbox/Redis adapter cho multi-instance production. Reconnect
  reconcile hiện là cơ chế eventual consistency; nếu cần guarantee delivery,
  realtime architecture chung phải bổ sung outbox và adapter.

## 11. Danh sách file dự kiến

Backend cập nhật:

```text
Manage -Task/BE/prisma/schema.prisma
Manage -Task/BE/prisma/migrations/<timestamp>_add_task_assignment_version/migration.sql
Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts
Manage -Task/BE/src/modules/tasks/task.repository.ts
Manage -Task/BE/src/modules/tasks/task.service.ts
Manage -Task/BE/src/modules/tasks/task.controller.ts
Manage -Task/BE/src/modules/realtime/realtime.types.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
```

Frontend cập nhật:

```text
FE/src/features/tasks/types/index.ts
FE/src/features/tasks/utils/task-cache.ts
FE/src/features/tasks/hooks/useUnassignTask.ts
FE/src/features/realtime/contracts/realtime-events.ts
FE/src/features/realtime/handlers/tag-event-handlers.ts
FE/src/features/realtime/hooks/useTaskSocket.ts
FE/src/components/tasks/task-assignee-picker.tsx
```

Frontend tạo mới:

```text
FE/src/features/realtime/handlers/assignment-event-handlers.ts
FE/src/features/realtime/utils/event-dedupe.ts
```

Không dự kiến sửa layout task card/detail cho MVP.
