# Plan triển khai `taskStatusAction` cho FE

## 1. Mục tiêu

Nối control `Status action` hiện có trong task detail với API backend để assignee
có thể cập nhật trạng thái thực thi của task và mọi view đang mở nhận được dữ
liệu canonical từ server.

Kết quả cần đạt:

- Chọn trạng thái trong task detail gọi backend thật, không chỉ đổi state cục bộ.
- Sau khi thành công, task detail và task card trong board cùng hiển thị trạng
  thái mới mà không cần reload.
- Không gửi request trùng khi mutation đang pending và không để UI giữ trạng
  thái optimistic sai sau lỗi.
- Hiển thị thông báo dễ hiểu cho các trường hợp không có quyền, chưa được
  assign, task đã bị xóa hoặc task đang bị khóa quá hạn.
- Danh sách lựa chọn ở FE khớp chính xác enum backend.

Phạm vi kế hoạch này bao gồm `statusAction` ở FE và hợp đồng realtime cần thiết
ở BE/FE; không thay đổi rule nghiệp vụ hoặc HTTP endpoint hiện có.

## 2. Contract backend đã đọc

Nguồn chính:

- `Manage -Task/BE/src/modules/tasks/task.router.ts:204-221`
- `Manage -Task/BE/src/modules/tasks/task.controller.ts:188-214`
- `Manage -Task/BE/src/modules/tasks/task.service.ts:846-905`
- `Manage -Task/BE/src/modules/tasks/task.repository.ts:504-565`
- `Manage -Task/BE/src/modules/tasks/dtos/request/updateTaskStatusAction.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts:40-156`
- `Manage -Task/BE/prisma/schema.prisma:62-70,326-350`

### 2.1. Endpoint

```http
PATCH /task/:taskId/status-action
Content-Type: application/json

{
  "statusAction": "IN_PROGRESS"
}
```

Response thành công có shape hiện tại của FE:

```ts
ApiResponse<TaskResponse>
```

`data` là task sau khi update, bao gồm `listId`, `assign`, `statusAction`, các
field schedule/lock và `completedAt`.

### 2.2. Enum hợp lệ

Chỉ dùng các giá trị sau trong request và UI:

```ts
type TaskStatusAction =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "PAUSED"
  | "FIXED"
  | "CANCELLED";
```

Các giá trị hiện có trong type/metadata FE như `ARCHIVED`, `COMPLETED`,
`CREATED`, `DELETED`, `RESTORED`, `UPDATED` không thuộc `TaskStatusAction` của
Prisma và phải được loại khỏi type, metadata hoặc danh sách chọn tương ứng. Đây
là các audit/event-like value, không phải trạng thái mà endpoint này nhận.

### 2.3. Rule và side effect cần phản ánh ở FE

- Token hợp lệ và permission board/project `UPDATE_TASK_STATUS_ACTION` là bắt
  buộc ở middleware.
- Service chỉ cho user đang có assignment active (`taskAssignments.deletedAt =
  null`) thay đổi trạng thái.
- Task không tồn tại hoặc đã soft delete trả `404`.
- Nếu `lockStatus === "OVERDUE_LOCKED"`, mọi trạng thái khác `DONE` bị từ chối
  với `403`. Chuyển sang `DONE` vẫn được phép.
- Chuyển sang `DONE` làm backend set `completedAt`, mở khóa task và trả lại task
  đầy đủ. FE không tự suy diễn hoặc tự set các field này.
- `CANCELLED` cũng là terminal action ở response mapper và làm
  `scheduleState = "done"`.

### 2.4. Hiện trạng realtime đã có

- BE đã khởi tạo Socket.IO trong `src/app.ts`, xác thực token qua
  `socket-auth.middleware.ts`, và có room `board:{boardId}`, `task:{taskId}`.
- `RealtimeEventService` đã dùng cho comment, schedule, tag, assignment và
  create event; một số payload dùng `RealtimeEnvelope` có `eventId`.
- FE đã có socket client, tự reconnect/rejoin room, board/task room registry,
  `applyCanonicalTaskSnapshot` và dedupe theo `eventId`.
- Tuy nhiên chưa có event riêng cho status action. Event hiện đang phát khi
  `DONE` là `task:schedule_updated`, không diễn đạt đúng semantics và các trạng
  thái khác không được phát. Đây là khoảng trống phải xử lý trong plan này.

Permission middleware và rule assignee đều nằm ở server; FE không được coi việc
user nhìn thấy task là đủ quyền chỉnh sửa.

## 3. Hiện trạng FE và khoảng trống

### Đã có

- `TaskStatusAction` và `statusAction` trong
  `FE/src/features/tasks/types/index.ts`.
- `taskApi` tại `FE/src/features/tasks/api/task-api.ts` đã có các mutation task
  khác theo cùng pattern Axios.
- `updateTaskInListCache` tại
  `FE/src/features/tasks/utils/task-cache.ts` có thể cập nhật task trong cache
  `['tasks', task.listId]`.
- `StatusActionChip` trong
  `FE/src/components/tasks/task-detail/task-detail-meta-bar.tsx` đã có UI
  popover, loading state và callback `onTaskUpdated`.
- `TaskDetailProvider` giữ task đang mở, còn các mutation khác cập nhật task
  detail bằng `updateSelectedTask`.

### Còn thiếu hoặc chưa đúng

1. `taskApi` chưa có hàm `updateStatusAction`.
2. Chưa có React Query mutation hook riêng cho status action.
3. `StatusActionChip.selectAction` hiện chỉ gọi `onTaskUpdated({...task,
   statusAction: next})`, không gọi backend và không rollback khi lỗi.
4. FE đang render 12 lựa chọn, trong đó 5 lựa chọn không hợp lệ với backend;
   type còn có thêm `COMPLETED` cũng không hợp lệ.
5. `TaskStatusAction` hiện mở rộng bằng các value ngoài Prisma; type này cần
   đồng bộ về enum backend để tránh gửi payload invalid.
6. `isUpdating` hiện chỉ phản ánh `useUpdateTask` (name/description); status
   action cần pending state riêng.
7. Chưa có hiển thị status action trên `task-card.tsx`, nên người dùng board
   không thấy trạng thái nếu không mở detail.
8. Chưa có mapping lỗi riêng cho `403` (chưa assign, thiếu permission, overdue
   lock) và `404`.
9. FE đã có realtime nền nhưng chưa subscribe/apply event status action; HTTP
   mutation và socket event có thể cùng cập nhật một task mà chưa có quy tắc
   ordering/version rõ ràng.

## 4. Thiết kế FE đề xuất

### 4.1. Types và constants

Sửa `FE/src/features/tasks/types/index.ts`:

- Đổi `TaskStatusAction` thành đúng union 7 giá trị backend.
- Đổi `TaskResponse.statusAction` thành field bắt buộc vì response DTO backend
  luôn trả field này. Nếu cần tương thích dữ liệu cache cũ, `getStatusActionMeta`
  vẫn giữ fallback cho `undefined`/unknown khi render, nhưng không đưa value lạ
  vào request.
- Thêm:

```ts
export type UpdateTaskStatusActionRequest = {
  statusAction: TaskStatusAction;
};
```

Tách metadata dùng chung khỏi component detail, ví dụ tạo
`FE/src/features/tasks/utils/status-action.ts`:

- `TASK_STATUS_ACTION_VALUES` theo đúng thứ tự UX mong muốn.
- label, description, tone cho 7 trạng thái.
- `getStatusActionMeta` và helper `isTerminalTaskStatusAction` nếu cần ở nhiều
  nơi.
- Sửa import của `task-detail-meta-bar.tsx`; dùng lại metadata cho badge trên
  task card, tránh copy bảng label/tone.

Không thêm package mới.

### 4.2. API và mutation hook

Trong `FE/src/features/tasks/api/task-api.ts` thêm:

```ts
updateStatusAction: async (
  taskId: string,
  data: UpdateTaskStatusActionRequest,
): Promise<ApiResponse<TaskResponse>> => {
  const response = await axiosLocal.patch<ApiResponse<TaskResponse>>(
    `/task/${taskId}/status-action`,
    data,
  );
  return response.data;
}
```

Tạo `FE/src/features/tasks/hooks/useUpdateTaskStatusAction.ts`:

- `mutationFn` nhận `{ taskId, statusAction }`.
- `onSuccess`: gọi `updateTaskInListCache(queryClient, response.data)` và toast
  thành công; không invalidate mù nếu response đã là task canonical.
- Cho phép caller truyền `onSuccess` callback để detail gọi
  `updateSelectedTask(response.data)` và đóng popover sau khi server xác nhận.
- `onError`: dùng `ApiError` hiện có, phân nhánh theo HTTP status/message.

Thông báo tối thiểu:

| Mã | UX |
|---|---|
| `400` | `Invalid task status action.` hoặc message backend |
| `401` | Để Axios refresh flow xử lý; nếu refresh thất bại, yêu cầu đăng nhập lại |
| `403` + overdue message | `Task is overdue and locked. Reschedule it first, or mark it done.` |
| `403` + assignee/permission | `Only assigned members with permission can change this status.` |
| `404` | `Task no longer exists.` và invalidate list hiện tại |
| khác | fallback `Could not update task status.` |

Không optimistic update ở MVP: rule assignee/permission/lock chỉ được server
xác nhận, vì vậy UI chỉ cập nhật sau response thành công.

### 4.3. Status action trong task detail

Refactor `StatusActionChip` trong
`FE/src/components/tasks/task-detail/task-detail-meta-bar.tsx`:

1. Dùng `useUpdateTaskStatusAction` thay cho state update giả.
2. `isBusy` = `isUpdating || mutation.isPending`; disable toàn bộ option và
   trigger phù hợp khi đang request.
3. Khi chọn cùng value hiện tại, đóng popover và không gửi request.
4. Khi chọn value mới:
   - gọi mutation với `{ taskId: task.id, statusAction: next }`;
   - trong callback thành công gọi `onTaskUpdated(response.data)`;
   - chỉ đóng popover sau success, hoặc giữ mở khi muốn user thấy lỗi.
5. Không tự set `completedAt`, `scheduleState`, `lockStatus` hay `isLocked`; lấy
   nguyên task trả về từ BE.
6. Với `OVERDUE_LOCKED`, có thể disable các option khác `DONE` trước khi gửi và
   hiển thị lý do ngay trong popover. `DONE` vẫn phải khả dụng theo contract.
   Với `MANUAL_LOCKED`, không blanket-disable status action vì service hiện chỉ
   chặn overdue lock; server vẫn là authority.
7. Nếu có thể lấy current user từ `useCurrentUser`, hiển thị control ở trạng
   thái read-only khi dữ liệu đã xác nhận user không nằm trong `task.assign`;
   không dùng check này thay cho server validation vì assignment có thể đổi ở
   tab khác. Nếu chưa muốn thêm gating, vẫn để control gọi API và xử lý `403`.

Giữ nguyên layout 4 chip hiện tại và keyboard semantics (`role="radio"`,
`aria-checked`, focus-visible ring). Bổ sung `aria-busy`/`aria-disabled` khi
mutation pending hoặc option bị khóa.

### 4.4. Hiển thị trên task card

Tạo component presentational nhỏ, ví dụ
`FE/src/components/tasks/status-action-badge.tsx`, dùng metadata chung:

- `TODO`: tone muted, label ngắn.
- `IN_PROGRESS`: tone primary.
- `IN_REVIEW`: tone warning.
- `DONE`/`FIXED`: tone success.
- `PAUSED`: tone muted.
- `CANCELLED`: tone destructive.

Thêm badge compact vào `task-card.tsx` dưới tên task hoặc vùng meta cạnh
assignee. Badge không có mutation riêng; click card vẫn mở detail. Nếu task
đang `OVERDUE_LOCKED`, thêm icon lock/aria-label để phân biệt với overdue thông
thường. Bảo đảm badge có kích thước ổn định và không làm thay đổi layout drag
handle.

### 4.5. Realtime contract và đồng bộ đa tab

#### BE

- Mở rộng `realtime.types.ts` với payload canonical:

```ts
type TaskStatusActionUpdatedPayload = RealtimeEnvelope<{
  boardId: string;
  taskId: string;
  task: TaskResponseDto;
  statusAction: TaskStatusAction;
}>;
```

- Thêm server event `task:status_action_updated` và method tương ứng trong
  `RealtimeEventService`. Payload phải chứa `eventId`, `occurredAt`, `actorId`,
  `boardId`, `taskId` và toàn bộ `TaskResponseDto`; không gửi patch rời rạc.
- Trong `updateTaskStatusAction`, phát event sau khi update và đọc lại task
  canonical hoàn tất, cho mọi giá trị (kể cả `CANCELLED`), tới cả
  `taskRoom(taskId)` và `boardRoom(boardId)`. Không dùng lại
  `task:schedule_updated` cho status action. Xác định `boardId` từ quan hệ
  task/list trên server, không nhận boardId từ client.
- Không emit nếu update thất bại. Nếu event publish lỗi, ghi log có
  `eventId/taskId/boardId/actorId` nhưng vẫn trả HTTP success; client sẽ
  reconcile bằng refetch khi reconnect.
- Bổ sung test service/controller bảo đảm một update thành công phát đúng một
  event với task sau update, actor hiện tại và room đúng; kiểm tra cả DONE và
  CANCELLED. Kiểm tra user không có quyền không làm phát event.

#### FE

- Thêm `TaskStatusActionUpdatedPayload` và event vào
  `features/realtime/contracts/realtime-events.ts`, parse Date về string đúng
  kiểu FE và validate tối thiểu `eventId`, `taskId`, `boardId`, task id và
  `statusAction` hợp lệ.
- Đăng ký handler dùng `rememberEvent(eventId)` rồi gọi
  `applyCanonicalTaskSnapshot(queryClient, payload.data.task, { source:
  "socket" })`; cập nhật mọi list cache và detail đang mở, không tự patch
  `completedAt/lockStatus/scheduleState`.
- Realtime snapshot là server authority: chỉ nhận task có `updatedAt` mới hơn
  snapshot hiện tại (hoặc dùng một `taskVersion/statusActionVersion` được BE
  bổ sung). Nếu chưa có version, dùng event ordering trong cùng session và
  invalidate/refetch khi phát hiện snapshot cũ; không để response HTTP cũ ghi
  đè socket snapshot mới.
- Sau mutation HTTP, áp dụng response qua cùng canonical cache helper; event do
  chính actor nhận lại phải được dedupe theo `eventId` và không tạo toast thành
  công lần hai. Nếu business cần loại bỏ echo, BE có thể dùng `socket.to(room)`
  nhưng vẫn phải cập nhật tab gửi request bằng HTTP response.
- Khi mở board/detail, join đúng board/task room; khi unmount leave và khi
  reconnect rejoin. Nếu join bị `FORBIDDEN/NOT_FOUND`, không retry vô hạn và
  hiển thị trạng thái không thể đồng bộ. Sau reconnect, invalidate/refetch
  task list/detail để bù event bị lỡ.
- Không optimistic update ở MVP; trong lúc request pending khóa control. Nếu
  socket event từ người khác đến trong lúc pending, hiển thị snapshot server và
  không để mutation ghi đè ngược lại.

## 5. Cache và đồng bộ detail

- Dùng response từ mutation để cập nhật `['tasks', task.listId]` qua helper hiện
  có.
- Callback thành công cập nhật `TaskDetailProvider.selectedTask` bằng cùng
  response, tránh detail giữ dữ liệu cũ.
- Không cần query detail riêng trong flow hiện tại; `TaskDetail` mở từ task
  object của board.
- Khi nhận `404`, invalidate `['tasks', task.listId]` để task bị soft-delete
  biến mất khỏi board và đóng detail nếu task không còn tồn tại.
- Nếu sau này `useTasks` bổ sung filter vào query key, đổi cache helper sang
  `setQueriesData` theo prefix `['tasks', task.listId]` hoặc invalidate các
  query liên quan; không để status update chỉ sửa một biến thể cache.

## 6. Trình tự triển khai

### Phase 1 - Đồng bộ contract

- Sửa type enum/request và tạo metadata dùng chung.
- Loại các option ngoài enum BE khỏi UI.
- Chạy typecheck để bắt các consumer đang dựa vào value audit cũ.

### Phase 2 - Nối data layer

- Thêm `taskApi.updateStatusAction`.
- Tạo `useUpdateTaskStatusAction` với cache update, toast và error mapping.
- Chuẩn bị interface để HTTP response và realtime handler cùng gọi một
  `applyCanonicalTaskSnapshot`.

### Phase 3 - Hoàn thiện task detail

- Thay optimistic-only handler trong `StatusActionChip` bằng mutation thật.
- Đồng bộ `isPending`, selected task và popover close behavior.
- Thêm trạng thái read-only/giải thích cho overdue lock và (nếu dùng) non-assignee.

### Phase 4 - Hiển thị trên board

- Tạo badge dùng chung và render trong `task-card.tsx`.
- Kiểm tra badge không ảnh hưởng drag/drop, menu actions và responsive layout.

### Phase 5 - Realtime BE

- Thêm payload/event/method `task:status_action_updated` và phát sau canonical
  read trong service.
- Bảo đảm boardId được resolve server-side, event phát cho board + task room,
  có envelope/actor/eventId và không phát khi permission/business rule fail.
- Viết unit/integration test cho event contract, room routing, DONE/CANCELLED,
  actor và lỗi publish.

### Phase 6 - Realtime FE

- Đăng ký handler status event trong `useGlobalRealtime`, validate/dedupe và
  cập nhật list/detail cache.
- Bổ sung ordering/version guard, HTTP-vs-socket race handling, reconnect
  refetch và room lifecycle cho board/task.
- Kiểm tra hai tab: tab A đổi từng trạng thái, tab B (board và detail) cập nhật
  không reload; tab gửi request không bị cập nhật ngược bởi response cũ.

### Phase 7 - Verification

- `npm run build` trong `FE/`.
- `npm run lint` trong `FE/`.
- Kiểm tra thủ công với backend chạy:
  - assignee đổi qua cả 7 trạng thái;
  - chọn lại trạng thái hiện tại không tạo request;
  - double click trong lúc pending chỉ tạo một request;
  - user không assign nhận `403` và UI không đổi trạng thái;
  - thiếu permission nhận `403` và UI không đổi trạng thái;
  - overdue locked: chỉ `DONE` thành công, các value khác báo hướng dẫn
    reschedule;
  - `DONE` cập nhật `completedAt`, mở khóa và badge/detail cùng đổi;
  - `CANCELLED` cập nhật badge và trạng thái detail;
  - task bị xóa trong tab khác nhận `404`, list refetch và detail không còn giữ
    task stale;
  - đóng/mở lại detail hoặc refresh board vẫn giữ giá trị từ server;
  - hai tab nhận `task:status_action_updated` cho cả 7 trạng thái; event trùng
    `eventId` chỉ áp dụng một lần;
  - mất mạng rồi reconnect: room được join lại và list/detail refetch bù event
    bị lỡ;
  - socket join sai board/task bị từ chối, không làm lộ dữ liệu task.

## 7. Acceptance criteria

- Không còn comment/logic “Optimistic local update only — no backend endpoint
  wired up yet”.
- Mọi status action request đi qua `PATCH /task/:taskId/status-action` với body
  đúng schema Zod.
- FE chỉ cho chọn 7 enum backend và typecheck không còn chấp nhận các audit
  value cũ.
- Mutation thành công cập nhật cả React Query list cache và task detail bằng
  một `TaskResponse` từ server.
- Mutation thất bại không làm task hiển thị trạng thái chưa được backend lưu.
- Loading, keyboard accessibility, toast lỗi và layout hiện tại vẫn hoạt động.
- BE typecheck/test và FE build/lint thành công; realtime status contract,
  room routing, dedupe, reconnect và multi-tab checklist được xác nhận.

## 8. Rủi ro và quyết định cần giữ rõ

- FE hiện không có capability/permission endpoint. Không suy đoán permission
  từ role ở client; để backend quyết định và hiển thị `403` rõ ràng.
- Nếu thêm pre-disable theo current user, đó chỉ là tối ưu UX; vẫn phải giữ xử
  lý `403` vì assignment/permission có thể thay đổi sau khi task được mở.
- Realtime status action là phần bắt buộc của feature sau MVP HTTP: nếu chưa
  hoàn tất BE event + FE handler thì chỉ được gọi là partial implementation.
- Socket.IO hiện có reconnect nhưng không bảo đảm delivery; phải refetch sau
  reconnect, không coi event là nguồn dữ liệu bền vững. Nếu cần thứ tự tuyệt
  đối giữa nhiều mutation đồng thời, bổ sung `taskVersion`/revision trong BE
  thay vì dựa vào timestamp client.
- `TaskResponse` backend trả các field Date được serialize thành string qua
  HTTP; FE giữ kiểu string như các task field hiện tại.
