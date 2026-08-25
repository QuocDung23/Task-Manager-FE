# Kế hoạch triển khai Realtime cho BE và FE

> Mục tiêu: đưa realtime từ trạng thái “đã có Socket.IO nhưng còn rời rạc” thành một lớp ổn định, có contract rõ, reconnect đúng, không duplicate cache và có thể mở rộng lên realtime toàn board.
>
> Tài liệu kiến trúc chi tiết: realTime.md trong cùng thư mục.

## 1. Quyết định cần chốt ngay

### 1.1 Phạm vi MVP

MVP chỉ cam kết ba nhóm event đang có ở BE:

- Comment root/reply trong task.
- Schedule: scheduled, rescheduled, unlocked, due soon, overdue locked.
- Notification theo user.

MVP chưa cam kết realtime toàn board cho task/list/tag/assignment/status. Các mutation này vẫn phải hoạt động đúng qua HTTP và invalidate/refetch.

### 1.2 Mô hình giao tiếp

~~~text
REST API = command và response canonical
Socket.IO = server event đã commit
TanStack Query = server state duy nhất ở FE
Zustand (nếu cần) = connection state và notification state
~~~

Không chuyển mutation sang Socket.IO. Client vẫn gửi REST request; BE phát event sau khi DB mutation thành công. Client gửi mutation cũng có thể nhận event echo nếu đang ở task room, nên mọi reducer phải idempotent.

### 1.3 Room model

| Room | Ai được join | Mục đích | Trạng thái |
| --- | --- | --- | --- |
| user:{userId} | BE tự join sau handshake | notification:new | Đã có |
| task:{taskId} | FE request, BE kiểm tra VIEW_TASK | Comment và task detail schedule | Đã có |
| board:{boardId} | FE request, BE kiểm tra quyền board | Board summary events | Cần bổ sung |

Định hướng: task detail dùng task room; board dùng một board room. Không xây kiến trúc lâu dài bằng việc join một room cho mọi task trong mọi query cache.

## 2. Hiện trạng và thứ tự ưu tiên

### 2.1 Backend

Đã có:

- Manage -Task/BE/src/modules/realtime/socket.server.ts: Socket.IO chạy trên HTTP server, CORS credentials, auth middleware.
- Manage -Task/BE/src/modules/realtime/socket-auth.middleware.ts: đọc token từ handshake hoặc cookie, verify JWT và active user.
- Manage -Task/BE/src/modules/realtime/task-comment.socket.ts: task:join / task:leave và kiểm tra quyền.
- Manage -Task/BE/src/modules/realtime/realtime-event.service.ts: emit comment, schedule và user notification.
- Manage -Task/BE/src/modules/tasks/comment/comment.controller.ts: emit comment sau khi service trả về thành công.
- Manage -Task/BE/src/modules/tasks/task.service.ts: emit schedule event và cron notification.

Thiếu hoặc cần sửa:

| Ưu tiên | Việc BE | Vì sao |
| --- | --- | --- |
| P0 | Event payload chưa có eventId, occurredAt, actorId | Khó dedupe, debug và phân biệt event echo |
| P0 | RealtimeEventService dùng event: string và any | Sai tên event không bị TypeScript bắt |
| P0 | Chưa có board room | Không thể đồng bộ board với số lượng room hợp lý |
| P0 | Task update/delete/move/assign/tag/status chưa phát event đầy đủ | FE không thể realtime toàn bộ workflow |
| P0 | Chưa có test Socket.IO/permission/ack | Regressions chỉ phát hiện khi mở hai browser |
| P1 | Reconnect không có replay; room in-memory theo process | Event bị lỡ và multi-instance không đồng bộ |
| P1 | Cron chạy trong mỗi BE process | Scale nhiều instance có thể phát notification/lock trùng |
| P1 | Emit lỗi chỉ bị bỏ qua im lặng khi io chưa sẵn sàng | Không biết event nào bị mất |
| P2 | Chưa có event log/outbox | Không có guarantee delivery khi cần audit/guaranteed notification |

### 2.2 Frontend

Đã có:

- FE/src/features/realtime/socket.ts: singleton client, reconnect, auth handshake.
- FE/src/features/realtime/hooks/useTaskSocket.ts: đang gộp global connection, room refcount, event listener, cache update, toast.
- FE/src/features/tasks/utils/task-cache.ts: update task qua nhiều filtered list cache.
- FE/src/features/tasks/hooks/comment-cache.ts: helper cho infinite comments/replies.

Cần xử lý:

- Tách transport, provider, room registry và reducers.
- Mirror đầy đủ 12 server events hiện tại; bỏ unknown.
- Sửa auth lifecycle: login/verify/refresh/logout.
- Rejoin room sau reconnect và refetch query để bù event đã lỡ.
- Đưa notification listener về app root, chỉ tồn tại một lần.
- Không quét toàn bộ TanStack Query cache để join task room.
- Làm reducer comment/reply atomic, chống duplicate replyCount.

## 3. Contract chung BE-FE

### 3.1 Envelope mục tiêu

Phase đầu chỉ cần thêm metadata ở boundary, chưa cần event store:

~~~ts
type RealtimeEnvelope<T> = {
  eventId: string;       // crypto.randomUUID() cho mỗi lần publish
  occurredAt: string;    // ISO UTC
  actorId: string | null;
  entityId: string;
  boardId: string | null;
  data: T;
};
~~~

version nên bổ sung ở phase sau khi có migration DB hoặc nguồn version monotonic. Trước mắt FE dùng updatedAt của task/comment để không ghi đè payload cũ.

Quy tắc:

1. Tên event và field được khai báo một lần trong BE type và mirror sang FE contract.
2. Date truyền qua Socket.IO là ISO string sau JSON serialization.
3. eventId không dùng để cấp quyền; nó chỉ phục vụ dedupe/trace.
4. data luôn là snapshot đã commit hoặc payload partial được mô tả rõ.
5. Event phát sau transaction/repository thành công, không phát từ repository trước commit.

### 3.2 Event matrix

| Domain | Event MVP/target | Room | Payload | FE action |
| --- | --- | --- | --- | --- |
| Comment | task:comment_created | task | root comment | insert-if-absent |
| Comment | task:comment_replied | task | parent ID + reply | insert reply + increment once |
| Comment | task:comment_updated | task | root comment | replace if newer |
| Comment | task:comment_reply_updated | task | parent ID + reply | replace if newer |
| Comment | task:comment_deleted | task | root/reply IDs + deleted reply IDs | remove idempotently |
| Comment | task:comment_reply_deleted | task | parent ID + reply ID | remove + decrement once |
| Schedule | task:schedule_updated | task | full task | canonical task replace |
| Schedule | task:rescheduled | task | full task | canonical task replace |
| Schedule | task:unlocked | task | full task | canonical task replace |
| Schedule | task:due_soon | task | partial due payload | patch + reconcile |
| Schedule | task:overdue_locked | task | partial lock payload | patch + reconcile |
| Notification | notification:new | user | notification | store/toast once |
| Task target | task:created | board | full task | insert into matching list cache |
| Task target | task:updated | board/task | full task | replace and re-evaluate filters |
| Task target | task:moved | board | source/target IDs + task snapshot | remove/insert/reorder |
| Task target | task:deleted | board/task | task ID + tombstone | remove from all caches |
| Assignment | task:assignments_updated | task/board | full task or assignments | replace task |
| Tag | task:tags_updated | task/board | full task | replace task |
| List | list:updated | board | list snapshot | replace list cache |

### 3.3 Command/ack contract

Giữ command hiện tại và chuẩn hóa ack:

~~~ts
type RealtimeAck = {
  success: boolean;
  code?:
    | "INVALID_PAYLOAD"
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "TIMEOUT"
    | "INTERNAL_ERROR";
  error?: string;
};
~~~

FE hiển thị message thân thiện từ code; không dùng raw database error làm UI text.

## 4. Plan triển khai theo phase

Mỗi phase phải build được độc lập. Không merge phần FE phụ thuộc contract BE chưa có test.

### Phase 0 - Baseline, contract và môi trường

Mục tiêu: mọi người làm việc trên cùng một contract và đo được trạng thái hiện tại.

#### BE

- Tạo bảng event matrix trong source và document này.
- Chọn một nơi sinh eventId, crypto.randomUUID() ở event service.
- Chọn VITE_SOCKET_URL/Socket.IO path cho dev, staging, production.
- Thêm log structured tối thiểu: event, eventId, entityId, room, socketCount, durationMs.
- Thêm script test phù hợp. BE hiện npm test chỉ trả lỗi placeholder; cần thay bằng Vitest/Jest hoặc test runner đã được team chọn.

#### FE

- Tạo src/features/realtime/contracts/realtime-events.ts mirror đủ server/client events.
- Tạo fixtures ISO payload cho task, comment, reply, notification.
- Thêm VITE_SOCKET_URL và VITE_SOCKET_PATH vào .env.example.
- Ghi manual test matrix hai browser và network offline trong CI notes.

#### Gate

- Type contract khớp tên event và field.
- Chạy được một handshake dev từ FE tới BE.
- Có log để tìm một event từ mutation tới socket client.

### Phase 1 - Ổn định auth, connection và room (P0)

Mục tiêu: socket connected phản ánh đúng session hiện tại và không mất room sau reconnect.

#### BE

1. socket-auth.middleware.ts
   - Trả lỗi có code ổn định: UNAUTHENTICATED, TOKEN_EXPIRED, USER_INACTIVE.
   - Không log access token.
   - Chỉ load active user và gắn user context vào socket.
2. socket.server.ts
   - Tách registerTaskRoomHandlers khỏi comment naming.
   - Đăng ký disconnect diagnostics, không giữ room state ở application memory.
   - Cấu hình path, pingInterval, pingTimeout từ env nếu deploy cần.
3. Room authorization
   - Giữ VIEW_TASK check cho task room.
   - Thêm board:join / board:leave với một lần check board permission.
   - Validate UUID và payload bằng Zod trước khi gọi repository.
   - Ack mọi nhánh success/failure, có timeout ở FE.
4. realtime-event.service.ts
   - Dùng typed event map thay event: string / any.
   - Tách emitToTask, emitToBoard, emitToUser.
   - Nếu io chưa init, log warning có event ID thay vì silently drop.

#### FE

1. auth-storage.ts
   - Thêm subscribe(listener); setToken/clearToken notify trong cùng tab.
   - Lắng nghe storage cho tab khác.
2. token-refresh.ts và axios.ts
   - Dùng chung một single-flight refresh promise cho HTTP và Socket.IO.
   - Sau refresh, cập nhật socket.auth.
3. socket-client.ts
   - URL đọc từ VITE_SOCKET_URL, fallback có kiểm soát.
   - Expose connect, disconnect, setAuth, status.
4. task-room-registry.ts
   - Tách desiredRefs và joinedOnTransport.
   - Disconnect clear actual joined; connect rejoin desired rooms.
   - Join/leave dùng ack timeout 5 giây.
5. RealtimeProvider
   - Mount một lần dưới QueryClientProvider.
   - Kết nối khi có token, disconnect/reset khi logout.
   - Map state: idle, connecting, connected, reconnecting, offline, auth_error.

#### Gate

- StrictMode không tạo duplicate connect/listener.
- Logout user A rồi login user B không nhận event của A.
- Ngắt mạng, nối lại: desired task room được rejoin thật sự.

### Phase 2 - Hoàn thiện MVP task/comment/schedule

Mục tiêu: contract hiện tại hoạt động đúng ở hai browser.

#### BE

- Giữ các event comment hiện có nhưng bọc payload trong envelope thống nhất.
- Sau mỗi mutation comment thành công mới emit event:
  - comment.controller.ts sau create/update/delete.
  - Payload delete phải luôn có deletedReplyIds: [] thay vì lúc có lúc undefined.
- Sau schedule mutation thành công mới emit:
  - set/clear schedule -> task:schedule_updated.
  - reschedule -> task:rescheduled.
  - unlock -> task:unlocked.
  - cron -> task:due_soon và task:overdue_locked.
- Khi một command vừa emit task event vừa emit notification, dùng cùng eventId gốc để FE trace/dedupe.
- Không phát event trong catch hoặc trước khi transaction thành công.

#### FE

- Tách handlers khỏi useTaskSocket.ts:
  - task-event-handlers.ts xử lý full/partial task.
  - comment-event-handlers.ts xử lý đủ 6 comment events.
  - notification-handler.ts xử lý notification một lần.
- Sửa replaceTaskAcrossCaches để detail luôn nhận payload mới.
- Partial schedule event: patch field chắc chắn rồi invalidate active detail/list query để lọc lại.
- Comment reducers phải trả về inserted/removed để reply count chỉ thay đổi một lần.
- Root delete xoá cả replies query liên quan.
- useTaskSocket(taskId) đổi thành useTaskRoom(taskId); component không tự đăng ký business events.
- Sau reconnect, invalidate active task/comment queries.

#### Gate

- A tạo comment/reply: A và B đều thấy đúng một item.
- A edit/delete: B cập nhật đúng; refresh panel không quay lại item đã xoá.
- A đổi schedule: task rời/đi vào filtered cache đúng.
- Cron due/overdue: task detail, board card và notification đồng bộ.

### Phase 3 - Phát event cho task/list workflow

Mục tiêu: FE có thể realtime các thay đổi người dùng thường gặp ngoài schedule/comment.

#### BE event publishing

Đặt publish ở service sau khi có response canonical, không đặt trong repository:

| Mutation | File chính | Event | Room |
| --- | --- | --- | --- |
| Create task | modules/tasks/task.service.ts | task:created | board |
| Update name/description | task.service.ts | task:updated | board + task |
| Delete task | task.service.ts | task:deleted | board + task |
| Move/reorder | task.service.ts | task:moved | board |
| Assign/unassign | task.service.ts | task:assignments_updated | task + board |
| Status action | task.service.ts | task:updated | board + task |
| Replace/attach/detach tags | modules/tasks/tag/tag.service.ts | task:tags_updated | task + board |
| Create/update/delete tag | tag.service.ts | board:tag_updated | board |
| List mutation | modules/lists/* | list:* | board |

Mỗi event nên có boardId + entityId + actorId + eventId + occurredAt + canonical snapshot.

Nếu mutation ảnh hưởng source và target list, task:moved phải trả cả sourceListId, targetListId, task, và thứ tự cần thiết; FE không tự đoán danh sách bị ảnh hưởng.

Các controller cần truyền actorUserId vào service khi event envelope cần actorId. Realtime module không được tự đọc Express request hoặc tự suy luận actor từ socket đang nhận event.

#### FE

- Tạo useBoardRoom(boardId) sau khi BE có contract.
- task:created/updated/deleted/moved cập nhật mọi list cache theo listId và filters.
- task:assignments_updated và task:tags_updated dùng full task snapshot để tránh patch thiếu field.
- List handlers cập nhật list query, board query và DnD ordering.
- Không tự merge event với optimistic data nếu chưa có eventId/version; dùng canonical snapshot.

#### Gate

- Hai browser cùng board thấy create/update/delete/move trong thời gian thực.
- Chuyển board release room cũ.
- Board không còn phải join N task rooms để hiển thị summary.

### Phase 4 - Reliability khi production và nhiều instance

Mục tiêu: realtime không phụ thuộc một Node process và không phát duplicate do cron.

#### BE

- Nếu chạy từ hai instance trở lên, thêm Socket.IO Redis adapter.
- Cron task schedule chỉ chạy một worker hoặc dùng distributed lock; không để mỗi instance cùng process reminder/overdue.
- Thêm version monotonic cho task/comment hoặc dùng event sequence từ DB.
- Nếu cần guarantee event, thêm transactional outbox:
  - mutation DB và outbox record trong cùng transaction;
  - worker publish outbox tới Socket.IO/notification channel;
  - đánh dấu published và retry có backoff.
- Thêm metric: active sockets, connection errors, join success/failure/latency, event publish count/failure, cron duplicate guard, outbox lag.

#### FE

- Reconcile active query sau reconnect/foreground.
- Dedupe bằng eventId, bỏ event cũ bằng version hoặc updatedAt.
- Hiển thị trạng thái offline/reconnecting nhẹ, không block UI khi server đang reconnect.
- Giảm log production; giữ structured debug flag cho dev/staging.

#### Gate

- Kill một BE instance, client tự reconnect qua instance khác và vẫn nhận event.
- Một cron cycle chỉ gửi một notification và một lock event.
- Event publish failure có log/metric và retry policy rõ.

### Phase 5 - Rollout và dọn code cũ

- Bật MVP sau feature flag hoặc env REALTIME_ENABLED nếu product cần rollback nhanh.
- Chạy shadow mode: FE nhận event nhưng chỉ log comparison với HTTP refetch trong staging.
- Sau khi ổn định, xoá listener business trong useTaskSocket.ts cũ.
- Xoá useAutoJoinVisibleTaskRooms() sau khi board room hoạt động.
- Cập nhật runbook deploy/proxy/Redis/cron worker.
- Chốt owner: BE sở hữu event contract và publish semantics; FE sở hữu reducers, subscription lifecycle và UX state.

## 5. Chi tiết triển khai Backend

### 5.1 Refactor module realtime

Đích source:

~~~text
src/modules/realtime/
├── realtime.types.ts
├── realtime-envelope.ts       # eventId/occurredAt/actorId helper
├── realtime-event.service.ts  # typed publish facade
├── socket.server.ts
├── socket-auth.middleware.ts
├── room-permission.service.ts # task/board permission checks
├── task-room.socket.ts
├── board-room.socket.ts
└── realtime-observability.ts
~~~

RealtimeEventService không biết Express request. Service mutation truyền actor/board/entity và canonical response vào event service.

Ví dụ API nội bộ:

~~~ts
realtimeEventService.publishTask({
  event: "task:updated",
  taskId: response.id,
  boardId,
  actorId,
  data: response,
});
~~~

### 5.2 Room authorization

- task:join: validate UUID, task/list/board active, VIEW_TASK.
- board:join: validate UUID, board active, VIEW_BOARD hoặc permission tương đương.
- leave: chỉ cần validate room key và socket đang authenticated; leave không làm lộ dữ liệu.
- Không tin boardId do client gửi để cấp quyền; BE phải resolve board từ task khi join task room.
- Có thể cache permission trong request ngắn hạn, nhưng không cache vô thời hạn vì membership có thể đổi.

### 5.3 Publish sau mutation

Luồng chuẩn ở từng service:

~~~text
validate permission
-> transaction/repository mutation
-> query canonical snapshot + boardId
-> create envelope
-> publish task/board event
-> publish user notification (nếu cần)
-> return HTTP response
~~~

Nếu publish Socket.IO bị lỗi, HTTP mutation vẫn thành công; error phải được log/metric. FE sẽ reconcile bằng refetch khi reconnect/foreground. Khi cần delivery guarantee, dùng outbox ở Phase 4 thay vì rollback DB vì socket publish fail.

### 5.4 Event coverage trước mắt

BE cần thêm emit vào các service hiện đang chỉ trả HTTP:

- TaskService.updateTask: task:updated.
- TaskService.deleteTask: task:deleted tombstone.
- TaskService.moveTask: task:moved với source/target list.
- TaskService.assignTask / unassignTask: task:assignments_updated.
- TaskService.updateTaskStatusAction: task:updated cho mọi status, không chỉ DONE.
- TaskTagService.replaceTaskTags, attachTaskTag, detachTaskTag: task:tags_updated.
- TaskTagService.createTag, updateTag, deleteTag: board:tag_updated.
- List service/controller: list:created, list:updated, list:moved, list:deleted.

Các event schedule/comment đang có phải giữ backward compatibility trong lúc FE migrate; có thể publish event cũ và event envelope mới trong một phase chuyển tiếp nếu cần.

## 6. Chi tiết triển khai Frontend

### 6.1 Transport và auth

- socket-client.ts chỉ tạo một Socket.IO instance.
- VITE_SOCKET_URL là biến chính; VITE_API_URL chỉ là fallback cho local.
- authStorage.subscribe() thay polling.
- Axios refresh và socket handshake dùng một refresh coordinator.
- logout gọi disconnect() và roomRegistry.reset() trước khi clear user cache.

### 6.2 Provider và registry

- RealtimeProvider mount một lần dưới QueryClientProvider.
- Provider đăng ký mọi server event một lần và dispatch sang pure handlers.
- TaskRoomRegistry giữ desiredRefs và joinedOnTransport riêng.
- Disconnect chỉ clear actual membership; connect rejoin desired rooms.
- useTaskRoom chỉ acquire/release. Không để component gọi socket.on.
- Board dùng useBoardRoom; task detail dùng useTaskRoom.

### 6.3 Cache reducers

- Full task snapshot: replace detail và mọi list cache cùng list/filter.
- Partial schedule: patch field chắc chắn, invalidate để re-evaluate filters.
- Comment/reply: insert/replace/remove idempotent theo ID và updatedAt.
- Khi query chưa được load, invalidate thay vì tạo InfiniteData không đầy đủ.
- Sau reconnect, invalidate active task/list/comment queries.

### 6.4 UI state

Expose read-only useRealtimeStatus() cho:

- chấm trạng thái nhỏ ở app shell nếu product cần;
- cảnh báo reconnect/offline không chặn thao tác REST;
- nút retry chỉ khi auth_error hoặc connection bị disable.

Notification listener không phụ thuộc task detail; toast và notification center dùng cùng một source.

## 7. Test plan liên kết BE-FE

### 7.1 Backend unit/integration

- Auth middleware: missing, invalid, expired, inactive user.
- task:join: UUID invalid, task/list/board missing, forbidden, success, ack timeout.
- board:join: permission allowed/denied.
- Event service: đúng event name, room, envelope và actor ID.
- Mutation chỉ publish sau repository thành công.
- Publish fail không làm HTTP response sai; log/metric được ghi.
- Comment delete chứa deletedReplyIds: [] ổn định.
- Multi-instance adapter route được event tới socket ở process khác.
- Cron lock đảm bảo một cycle không chạy trùng.

### 7.2 Frontend unit/integration

- Registry acquire/release/rejoin không duplicate.
- Token set/clear connect/disconnect đúng.
- Event contract không còn unknown.
- Full task event cập nhật detail/list cache.
- Reply create/delete idempotent.
- Notification chỉ toast một lần.
- StrictMode không tăng listener/refcount bất thường.
- Reconnect rejoin xong mới invalidate active queries.

### 7.3 Manual acceptance

1. Hai browser cùng task: tạo/sửa/xoá root comment và reply.
2. Hai browser cùng task: set/reschedule/clear/unlock schedule.
3. Trigger cron due soon/overdue.
4. Hai browser cùng board: create/update/delete/move task sau Phase 3.
5. Tắt mạng 10-30 giây, mutation từ browser còn lại, bật mạng và kiểm tra reconcile.
6. Refresh token, logout rồi login user khác.
7. Restart một BE instance khi client đang mở.

## 8. Observability và SLO đề xuất

Chưa cần dashboard phức tạp, nhưng cần các log/metric sau:

| Metric | Mục đích |
| --- | --- |
| realtime_connections_active | Biết số socket thực tế |
| realtime_connect_error_total{code} | Phân biệt auth và network lỗi |
| realtime_room_join_total{roomType,result} | Phát hiện permission/room fan-out bất thường |
| realtime_room_join_latency_ms | Phát hiện join check DB chậm |
| realtime_events_published_total{event} | Kiểm tra coverage mutation |
| realtime_events_publish_failed_total{event} | Phát hiện event bị rơi |
| realtime_reconcile_total{reason} | Đo reconnect/foreground refetch |
| realtime_outbox_lag_ms | Chỉ dùng khi bật outbox |

SLO MVP có thể chốt sau khi đo staging:

- P95 publish-to-client dưới 1 giây trong cùng region.
- Join task/board P95 dưới 500 ms.
- Reconnect và reconcile hoàn tất dưới 5 giây sau khi mạng trở lại.
- Không duplicate notification trong một session.

Không hard-code các ngưỡng trên vào logic trước khi có baseline; dùng chúng làm mục tiêu đo.

## 9. Rollout checklist

### Trước khi merge

- [ ] BE contract/types đã cập nhật.
- [ ] FE contract mirror đã cập nhật.
- [ ] CORS và Socket.IO URL/path đúng môi trường.
- [ ] Auth refresh/logout test pass.
- [ ] Room join permission test pass.
- [ ] Event chỉ emit sau DB success.
- [ ] Reducer idempotent test pass.
- [ ] Reconnect rejoin + reconcile test pass.

### Staging

- [ ] Mở hai browser và chạy manual acceptance.
- [ ] Tắt/bật mạng và restart BE.
- [ ] Kiểm tra log event ID từ mutation tới client.
- [ ] Kiểm tra task/list cache với nhiều filters.
- [ ] Kiểm tra cron không phát trùng.
- [ ] Đo connection/join/publish metrics.

### Production

- [ ] Reverse proxy hỗ trợ WebSocket Upgrade.
- [ ] Nếu nhiều instance: Redis adapter đã bật.
- [ ] Cron chỉ có một worker hoặc distributed lock.
- [ ] Feature flag/rollback plan sẵn sàng.
- [ ] Runbook xử lý auth error, Redis outage và publish failure.

## 10. Definition of Done

MVP realtime được xem là hoàn thành khi:

- BE publish đúng comment/schedule/notification event sau DB commit.
- FE có một provider/listener owner và typed contract đầy đủ.
- Login, refresh token, logout, offline và reconnect không làm sai session hoặc room.
- Hai browser cùng task thấy comment/schedule thay đổi đúng một lần.
- Filtered task caches được reconcile đúng sau full/partial schedule event.
- Event bị lỡ trong lúc mất mạng được bù bằng refetch.
- Có test cho auth, room authorization, event service, registry và idempotent reducers.
- Có log/metric đủ để truy vết một event.

Board realtime được xem là hoàn thành ở phase tiếp theo khi BE có board room và FE không còn phải join từng task để vẽ board summary.

## 11. Việc nên làm ngay

1. Không thêm event mới vào useTaskSocket.ts hiện tại. Đây là hook đang gộp quá nhiều ownership và có lỗi reconnect.
2. BE chốt envelope + event matrix và thêm test cho task:join/auth. Đây là dependency để FE viết reducer đúng.
3. FE tách RealtimeProvider và TaskRoomRegistry, đồng thời sửa logout/token lifecycle. Đây là nhóm P0 có thể làm song song với BE contract.
4. Bật đủ sáu comment events và sửa reducer idempotent. Đây là feature realtime dễ kiểm tra nhất bằng hai browser.
5. Sau MVP mới mở rộng board room và event task/list/tag/assignment. Đừng dùng N task rooms làm giải pháp board cuối cùng.

Thứ tự này giảm rủi ro vì nền tảng auth/room/reducer được ổn định trước, còn event coverage được mở rộng từng domain với acceptance gate rõ ràng.
