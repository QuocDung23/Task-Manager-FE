# Kế hoạch realtime cho Project

> Baseline được khảo sát ngày 2026-08-18 trên hai codebase: `Manage -Task/BE` và `FE`.
> Phạm vi: đồng bộ trạng thái project (CRUD project + CRUD project member + cập nhật
> role member) giữa các tab/browser đang mở cùng project. Board realtime và task
> realtime là hai plan độc lập.

## 1. Mục tiêu

- User A tạo/sửa/xoá project, user B mở cùng project (hoặc đang ở danh sách project)
  thấy thay đổi ngay, không cần reload hoặc refetch thủ công.
- User A thêm/xoá/cập nhật role một project member, user B thấy danh sách thành viên
  cập nhật realtime.
- HTTP response và socket echo không tạo bản ghi trùng.
- Event bị bỏ lỡ khi mất mạng được bù bằng refetch sau reconnect.
- Permission giữ nguyên ở server; FE chỉ phản ánh snapshot đã commit.

## 2. Hiện trạng đã xác minh

### Backend

Đã có:

- Socket.IO, JWT socket authentication và room `user:{userId}` (auto-join khi connect).
- `board:join`/`board:leave` với `RoomPermissionService.authorizeBoard` dùng
  `PermissionRepository.checkAnyPermission(userId, [TaskPermissions.VIEW_TASK], { boardId, projectId })`.
- `RealtimeEnvelope<T>` với `eventId`, `occurredAt`, `actorId`, `data` và mẫu broadcast
  board cho tag/assignment/list/task.
- Mọi endpoint project đều qua `verifyProjectPermission(...)` với Zod validate trước
  khi vào controller. Mount path `/project` gồm 11 route (CRUD project + CRUD member).
- `ProjectMemberRepo.removeProjectMember` đã chạy transaction cascade board members.

Chưa có:

- `project:join` / `project:leave` client event và handler tương ứng.
- `projectRoom(id)` room helper.
- `RoomPermissionService.authorizeProject(userId, projectId)`.
- `RealtimeEventService` chưa có `emitProjectCreated/Updated/Deleted` và
  `emitProjectMemberAdded/Removed/RoleUpdated`.
- `projects.service.ts` không gọi `realtimeEventService` ở bất kỳ mutation nào.
- Contract trong `ServerToClientEvents`/`ClientToServerEvents` chưa có event `project:*`.

Lưu ý:

- HTTP `POST /project/:projectId/boards` được đăng ký trong `projects.router.ts` nhưng
  delegate sang `BoardController.createBoard`. Board event phát ra từ `board.service.ts`
  (xem plan riêng), không phát ra từ `projects.service.ts`.
- `ProjectStatus` đã có ở Prisma (ACTIVE/INACTIVE) và được check ở repository khi
  soft-delete, nên authorize có thể dùng cùng pattern với board.

### Frontend

Đã có:

- Socket singleton, board room registry, ack timeout, rejoin và reconcile.
- `useGlobalRealtime()` trong `FE/src/features/realtime/hooks/useTaskSocket.ts` là
  owner duy nhất của mọi listener toàn cục, đã mount `connect`/`disconnect` handler
  và 30s tick refresh auth.
- `FE/src/features/realtime/utils/event-dedupe.ts` có `rememberEvent(eventId)`
  (bounded 512).
- `FE/src/features/realtime/handlers/` đã có các module pattern:
  `tag-event-handlers.ts`, `assignment-event-handlers.ts`,
  `create-event-handlers.ts` — tất cả đều theo cùng khuôn: validate →
  `rememberEvent` → `applyCanonical…` → `socket.off` cleanup.
- `useBoardRoom(boardId, listIds)` làm mẫu refcount join cho room.

Chưa có:

- Contract và handler cho `project:*`.
- `projectKeys` query-key factory. Hiện các hook project đang dùng string inline:
  `['projects', page, limit, name]`, `['project', id]`.
- `useProjectRoom(projectId)` và `project-room-registry.ts`.
- `useCreateProject`/`useUpdateProject`/`useDeleteProject`/`useAddMemberProject` không
  tận dụng reducer chung — chỉ `invalidateQueries(['projects'])`; `useUpdateProject`
  thậm chí không invalidate `['project', id]`.
- `useAddMemberProject` invalidate key `['project-member', projectId]` nhưng key này
  chưa từng được dùng để query — cần sửa trong cùng feature.
- `useProjectMembers` hook chưa có — phải tạo mới hoặc dùng `boardMembers` làm mẫu.

Ràng buộc hiện tại:

- `ProjectResponse` ở FE có các field (`boardCount`, `_count.boards`, `members`) mà
  BE `ProjectResponseDto` không trả — cần xác minh response thực tế trong browser
  trước khi định hình cache mutation cho `project:created/updated`.
- Project list query là paginate (`page`, `limit`, `name`).
- Member list trong project đang hiển thị qua query tách (`useBoardMembers` style).

## 3. Kiến trúc và nguyên tắc

```text
REST POST/PATCH/DELETE
        |
        v
verifyProjectPermission -> validate Zod -> controller
        |
        v
service.create/update/delete
        |
        v
repository (Prisma) commit
        |
        v
RealtimeEventService.emitProjectXxx (sau commit, một lần)
        |
        +--> HTTP response DTO canonical
        |
        `--> io.to(projectRoom(projectId)).emit("project:xxx", envelope)
```

- REST là command; Socket.IO chỉ phát snapshot đã commit. Không emit trong
  repository hoặc trước khi DB commit.
- Payload chứa DTO canonical đầy đủ (không chỉ request body) để FE không phải
  refetch.
- HTTP handler và socket handler dùng cùng một reducer/applier.
- `projectId` do BE resolve từ resource/context đã xác thực, không suy ra từ client.
- `eventId` dùng để dedupe socket; resource ID dùng để idempotent HTTP + socket.
- Không tạo toast cho socket event — toast chỉ tới từ HTTP mutation.
- Không đăng ký listener ở component riêng lẻ; chỉ `useGlobalRealtime` là owner duy
  nhất.

## 4. Contract realtime mục tiêu

Thêm vào `Manage -Task/BE/src/modules/realtime/realtime.types.ts` và mirror ở
`FE/src/features/realtime/contracts/realtime-events.ts`:

```ts
type ProjectResponseDto = import("@/modules/projects/dtos/response").ProjectResponseDto;
type ProjectMemberResponseDto =
  import("@/modules/projects/dtos/response").ProjectMemberResponseDto;

export type ProjectCreatedPayload = RealtimeEnvelope<{
  project: ProjectResponseDto;
}>;

export type ProjectUpdatedPayload = RealtimeEnvelope<{
  project: ProjectResponseDto;
}>;

export type ProjectDeletedPayload = RealtimeEnvelope<{
  projectId: string;
  project: ProjectResponseDto; // soft-delete snapshot, status = INACTIVE
}>;

export type ProjectMemberAddedPayload = RealtimeEnvelope<{
  projectId: string;
  member: ProjectMemberResponseDto;
}>;

export type ProjectMemberRemovedPayload = RealtimeEnvelope<{
  projectId: string;
  memberId: string; // boardMemberId row id
  userId: string;   // user.id của member bị xoá
}>;

export type ProjectMemberRoleUpdatedPayload = RealtimeEnvelope<{
  projectId: string;
  member: ProjectMemberResponseDto; // row sau update
}>;

export type ServerToClientEvents = {
  // ... existing events
  "project:created": (payload: ProjectCreatedPayload) => void;
  "project:updated": (payload: ProjectUpdatedPayload) => void;
  "project:deleted": (payload: ProjectDeletedPayload) => void;
  "project:member_added": (payload: ProjectMemberAddedPayload) => void;
  "project:member_removed": (payload: ProjectMemberRemovedPayload) => void;
  "project:member_role_updated": (payload: ProjectMemberRoleUpdatedPayload) => void;
};

export type ClientToServerEvents = {
  // ... existing events
  "project:join": (
    payload: { projectId: string },
    ack?: (response: RealtimeAck) => void,
  ) => void;
  "project:leave": (
    payload: { projectId: string },
    ack?: (response: RealtimeAck) => void,
  ) => void;
};

export const projectRoom = (projectId: string) => `project:${projectId}`;
```

Quy ước FE validate trước khi mutate cache:

- `projectId` không rỗng, khớp với payload ở event member.
- Project DTO ở trạng thái active khi apply `project:created`/`project:updated`,
  bỏ qua nếu `status !== ACTIVE`.
- `project:deleted` xoá project khỏi cache và invalidate mọi query `[projects, ...]`
  còn chứa id này.
- Member payload phải có `id`, `userId`, `projectId`, `role`, `status`.
- `eventId` đã xử lý thì skip; payload sai project bị bỏ qua.

Broadcast scope:

| Event                 | Room                       |
| --------------------- | -------------------------- |
| `project:created`     | `user:{actorId}` + project room của user đó (nếu còn, xem ghi chú dưới) |
| `project:updated`     | `project:{projectId}`      |
| `project:deleted`     | `project:{projectId}` + invalidate list query toàn cục |
| `project:member_*`    | `project:{projectId}`      |

Ghi chú `project:created`: hiện chưa có cơ chế join user vào `project:{id}` room
trước khi project tồn tại. Phase MVP phát `project:created` tới:

- `user:{userId}` của owner (người tạo) — owner đã auto-join `user:{id}` khi connect.
- Không phát tới room nào khác; mọi client đang ở danh sách project phải nhận qua
  refetch (vì họ không ở `project:{newId}` room). Ghi chú này sẽ được giải quyết ở
  phase 2 với cơ chế fan-out qua user room cho actor hoặc qua một project-list room.

## 5. Thay đổi Backend theo file

### 5.1. Realtime contract & publisher

Files:

```text
Manage -Task/BE/src/modules/realtime/realtime.types.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
Manage -Task/BE/src/modules/realtime/realtime-envelope.ts (không đổi)
```

- Thêm các payload `Project*` vào `realtime.types.ts`.
- Thêm vào `ServerToClientEvents`: `project:created/updated/deleted`,
  `project:member_added/removed/role_updated`.
- Thêm vào `ClientToServerEvents`: `project:join`/`project:leave`.
- Export `projectRoom(projectId)` helper.
- Trong `realtime-event.service.ts` thêm các method:
  - `emitProjectCreated(project, actorId)` → `project:created` tới
    `user:{userId}` của owner (chỉ actor nhận echo HTTP); broadcast ra ngoài
    dùng invalidation cache FE.
  - `emitProjectUpdated(projectId, project, actorId)` → `project:updated` tới
    `projectRoom(projectId)`.
  - `emitProjectDeleted(projectId, project, actorId)` → `project:deleted` tới
    `projectRoom(projectId)`.
  - `emitProjectMemberAdded(projectId, member, actorId)` → `project:member_added`
    tới `projectRoom(projectId)`.
  - `emitProjectMemberRemoved(projectId, memberId, userId, actorId)` →
    `project:member_removed` tới `projectRoom(projectId)`.
  - `emitProjectMemberRoleUpdated(projectId, member, actorId)` →
    `project:member_role_updated` tới `projectRoom(projectId)`.
- Mỗi emit dùng `createRealtimeEnvelope({ actorId, data })` một lần rồi emit một
  lần; không gọi `emitToRoom` nhiều lần cho cùng event.

### 5.2. Room permission cho project

Files:

```text
Manage -Task/BE/src/modules/realtime/room-permission.service.ts
Manage -Task/BE/src/modules/realtime/board-room.socket.ts
Manage -Task/BE/src/modules/realtime/task-room.socket.ts (không đổi)
Manage -Task/BE/src/modules/realtime/socket.server.ts
Manage -Task/BE/src/modules/realtime/index.ts
```

- Thêm `authorizeProject(userId, projectId)` vào `RoomPermissionService`. Logic:
  - Validate UUID bằng `isUuid()`.
  - Project tồn tại và `ProjectStatus.ACTIVE` (xem `ProjectsRepository.getProject`).
  - `permissionRepository.checkAnyPermission(userId,
    [ProjectPermissions.VIEW_PROJECT], { projectId })`.
  - Trả `RoomPermissionResult` với `{ allowed: true, projectId, boardId?: undefined }`
    hoặc fail code `INVALID_ID | NOT_FOUND | FORBIDDEN`.
- Tạo `project-room.socket.ts` với `registerProjectRoomHandlers(io, socket,
  permissionService)` xử lý `project:join` và `project:leave` tương tự
  `board-room.socket.ts`.
- Trong `socket.server.ts`, gọi `registerProjectRoomHandlers(io, socket)` ngay sau
  `registerBoardRoomHandlers` trong `io.on("connection", ...)`.
- Export từ `realtime/index.ts`.

### 5.3. Service: emit sau khi tạo project

Files:

```text
Manage -Task/BE/src/modules/projects/projects.controller.ts
Manage -Task/BE/src/modules/projects/projects.service.ts
```

- `createProject` ở controller truyền `userId` của actor cho service.
- Trong service, sau khi repository `createProject` thành công và role admin đã
  gán, tạo `ProjectResponseDto` canonical rồi gọi
  `realtimeEventService.emitProjectCreated(project, actorUserId)`.
- HTTP response trả cùng DTO. Socket echo nhận qua `user:{actorId}` room đã auto
  join.
- Nếu publish throw, không trả HTTP 500; log `eventId`, `projectId`, `userId` rồi
  trả response.

### 5.4. Service: emit sau khi update project

Files:

```text
Manage -Task/BE/src/modules/projects/projects.service.ts
```

- Sau khi `updateProject` commit, build `ProjectResponseDto` (cùng mapper với
  `createProject`) rồi gọi `emitProjectUpdated(projectId, project, actorUserId)`.
- Nếu row trả về `status = INACTIVE` (do service throw validation trước) thì
  không emit.

### 5.5. Service: emit sau khi delete project

Files:

```text
Manage -Task/BE/src/modules/projects/projects.service.ts
```

- Sau khi repository `deleteProject` (transaction soft-delete + cascade board
  members), gọi `emitProjectDeleted(projectId, project, actorUserId)`.
- Service `removeProjectMember` cũng cascade board members; phase này chỉ emit
  `project:member_removed` cho project, board event do plan board xử lý.

### 5.6. Service: emit sau khi thêm project member

Files:

```text
Manage -Task/BE/src/modules/projects/projects.service.ts
Manage -Task/BE/src/modules/projects/dtos/response/projectMember.res.ts
```

- Sau khi `addMember` commit và gán role, build `ProjectMemberResponseDto` từ
  `ProjectMemberRepo.addMemberToProject` (đã có sẵn `projectMemberDetailsSelect`).
- Gọi `emitProjectMemberAdded(projectId, member, actorUserId)`.
- HTTP response trả `ProjectMemberResponseDto` để reducer FE dùng luôn.

### 5.7. Service: emit sau khi cập nhật role member

Files:

```text
Manage -Task/BE/src/modules/projects/projects.service.ts
```

- Sau khi `updateProjectMember` commit và validate role hợp lệ, build
  `ProjectMemberResponseDto` mới rồi gọi
  `emitProjectMemberRoleUpdated(projectId, member, actorUserId)`.

### 5.8. Service: emit sau khi xoá project member

Files:

```text
Manage -Task/BE/src/modules/projects/projects.service.ts
```

- Sau khi `removeProjectMember` transaction (xoá project member + cascade board
  members) commit, gọi
  `emitProjectMemberRemoved(projectId, memberId, userId, actorUserId)`.
- Project room sẽ nhận event này; FE board nào đang mở cho project đó sẽ invalidate
  board-member cache qua board plan.

## 6. Thay đổi Frontend theo file

### 6.1. Project query-key factory

Tạo:

```text
FE/src/features/projects/utils/project-query-keys.ts
```

```ts
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => ["projects", "list"] as const,
  list: (page: number, limit: number, name?: string) =>
    ["projects", "list", page, limit, name ?? null] as const,
  detail: (projectId: string) => ["project", projectId] as const,
  members: (projectId: string) => ["project-members", projectId] as const,
};
```

Cập nhật `useProjects`, `useProject`, `useCreateProject`, `useUpdateProject`,
`useDeleteProject`, `useAddMemberProject` và mọi nơi đang dùng string inline
chuyển sang dùng factory.

Sửa kèm:

- `useUpdateProject` phải invalidate cả `projectKeys.detail(id)` chứ không chỉ
  `projectKeys.lists()`.
- `useCreateProject` invalidate `projectKeys.lists()`.
- `useDeleteProject` invalidate `projectKeys.all` (xoá cả detail, members, list).
- `useAddMemberProject` đổi key chết `['project-member', projectId]` thành
  `projectKeys.members(projectId)`.

### 6.2. Project cache reducers

Tạo:

```text
FE/src/features/projects/utils/project-cache.ts
```

```ts
export function applyProjectCreated(
  queryClient: QueryClient,
  project: ProjectResponse,
): void;

export function applyProjectUpdated(
  queryClient: QueryClient,
  project: ProjectResponse,
): void;

export function applyProjectDeleted(
  queryClient: QueryClient,
  projectId: string,
): void;

export function applyProjectMemberAdded(
  queryClient: QueryClient,
  member: ProjectMemberResponse,
): void;

export function applyProjectMemberRemoved(
  queryClient: QueryClient,
  projectId: string,
  memberId: string,
  userId: string,
): void;

export function applyProjectMemberRoleUpdated(
  queryClient: QueryClient,
  member: ProjectMemberResponse,
): void;
```

Quy tắc:

- `applyProjectCreated`: chèn vào page 1 của `projectKeys.lists()` nếu page chưa
  đầy và match filter `name`; nếu page đầy thì không chèn, để refetch phụ trách.
- `applyProjectUpdated`: cập nhật `projectKeys.detail(id)` và upsert vào mọi
  `projectKeys.list(...)` chứa id (theo `query.state.data.pages`).
- `applyProjectDeleted`: loại project khỏi tất cả `projectKeys.list(...)` và
  remove `projectKeys.detail(id)`; invalidate `boardKeys` có scope project này.
- `applyProjectMemberAdded`: upsert vào `projectKeys.members(projectId)`;
  tăng `totalMembers` ở các query detail nếu có.
- `applyProjectMemberRemoved`: xoá khỏi `projectKeys.members(projectId)`;
  giảm `totalMembers`.
- `applyProjectMemberRoleUpdated`: merge theo `id` vào `projectKeys.members(...)`.
- Mọi apply phải idempotent: cùng `id` chỉ merge, không append; cùng `eventId`
  đã xử lý thì skip.
- Validate `project.id`, `project.userId`, `member.projectId`, `member.userId`
  trước khi mutate; payload sai thì debug-log rồi bỏ qua.

### 6.3. Typed socket contract (FE)

Sửa `FE/src/features/realtime/contracts/realtime-events.ts`:

- Thêm 6 payload `Project*` mirror BE.
- Thêm 6 event `project:*` vào `ServerToClientEvents`.
- Thêm `project:join`/`project:leave` vào `ClientToServerEvents`.

### 6.4. Project room registry

Tạo:

```text
FE/src/features/realtime/rooms/project-room-registry.ts
```

Mirror `board-room-registry.ts`:

- `desiredRefs: Map<projectId, refs>`.
- `joinedOnTransport: Set<projectId>`.
- `pendingJoins` (5s ACK timeout) và `blockedProjects` (sticky FORBIDDEN/NOT_FOUND
  trong session).
- API: `acquireProjectRoom(projectId)`,
  `releaseProjectRoom(projectId)`,
  `rejoinProjectRooms()`,
  `clearJoinedProjectRooms()`,
  `resetProjectRooms()`,
  `setProjectRoomReconcileHandler(projectId, handler)`,
  `getProjectRoomState()`.

Mỗi handler gọi `socket.emit("project:join", { projectId }, ack)` với timeout
5s. Khi `socket` reconnect, `useGlobalRealtime` sẽ gọi `rejoinProjectRooms()` để
phát lại các `project:join` cho các project chưa kịp nhận.

### 6.5. Global event handler

Tạo:

```text
FE/src/features/realtime/handlers/project-event-handlers.ts
```

```ts
export function registerProjectEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void;
```

- Validate payload theo các invariant ở §4.
- `rememberEvent(payload.eventId)` skip nếu đã xử lý.
- Dispatch sang `applyProject*` tương ứng.
- Cleanup `socket.off(...)` đúng callback.

Đăng ký trong `useGlobalRealtime()` (hiện nằm trong
`FE/src/features/realtime/hooks/useTaskSocket.ts`):

- Gọi `registerProjectEventHandlers(socket, queryClient)` cùng với các handler đã
  có.
- Trong `connect` handler, gọi `rejoinProjectRooms()` sau `rejoinBoardRooms()`.
- Trong `disconnect` handler, gọi `clearJoinedProjectRooms()`.
- Trong `resetBoardRooms()` thì `resetProjectRooms()`.
- Không thêm listener ở component nào khác.

### 6.6. useProjectRoom hook

Tạo:

```text
FE/src/features/realtime/hooks/useProjectRoom.ts
```

```ts
export function useProjectRoom(
  projectId: string,
  options?: { enabled?: boolean },
): void;
```

- Mirror `useBoardRoom.ts`: gọi `acquireProjectRoom(projectId)` khi mount, đăng ký
  reconcile handler vô hiệu hoá `projectKeys.detail(id)`, `projectKeys.members(id)`,
  `projectKeys.lists()`, và board keys có scope project (`boardKeys.boardPrefix(id)`,
  `boardKeys.list(id, ...)`).
- Release khi unmount.

### 6.7. HTTP mutation dùng chung reducer

Sửa:

```text
FE/src/features/projects/hooks/useCreateProject.ts
FE/src/features/projects/hooks/useUpdateProject.ts
FE/src/features/projects/hooks/useDeleteProject.ts
FE/src/features/projects/hooks/useAddMemberProject.ts
```

- `useCreateProject.onSuccess`: gọi `applyProjectCreated(queryClient, response.data)`
  thay vì chỉ `invalidateQueries(['projects'])`.
- `useUpdateProject.onSuccess`: `applyProjectUpdated(queryClient, response.data)` và
  invalidate `projectKeys.detail(id)`.
- `useDeleteProject.onSuccess`: `applyProjectDeleted(queryClient, id)` rồi
  `invalidateQueries(projectKeys.all)`.
- `useAddMemberProject.onSuccess`: `applyProjectMemberAdded(queryClient, member)`
  + invalidate `projectKeys.members(projectId)`.
- Thêm `useRemoveProjectMember` và `useUpdateProjectMemberRole` nếu chưa có, dùng
  `applyProjectMemberRemoved`/`applyProjectMemberRoleUpdated` tương ứng.
- Giữ success toast hiện tại.

### 6.8. useProjectMembers hook (nếu thiếu)

Tạo nếu chưa có:

```text
FE/src/features/projects/hooks/useProjectMembers.ts
```

```ts
export function useProjectMembers(projectId: string): UseQueryResult<ProjectMemberResponse[]>;
```

- Query key: `projectKeys.members(projectId)`.
- `enabled: !!projectId`.
- `staleTime: 60_000` (mirror `useBoardMembers`).

### 6.9. Project list UI tự join room

Sửa:

```text
FE/src/features/projects/components/ProjectList.tsx (hoặc component tương đương đang hiển thị danh sách project)
```

- Trang danh sách project không cần join `project:{id}` riêng lẻ; chỉ cần đăng ký
  global handler đã có.
- Component chi tiết project (`ProjectDetail` hoặc tương đương) gọi
  `useProjectRoom(projectId)` để refcount join room khi mở.

### 6.10. UI không cần thay đổi layout

Không đổi CSS/JSX của component hiện tại. Realtime chỉ thay đổi cache, UI render
lại tự nhiên qua TanStack Query subscription.

## 7. Trình tự triển khai (Phase + Gate)

### Phase 0 — Chuẩn bị contract BE/FE

- BE: thêm payload + event + room helper vào `realtime.types.ts`.
- FE: mirror contract vào `realtime-events.ts`.
- Gate: `npx tsc --noEmit` pass cả BE và FE.

### Phase 1 — Room permission + join handler

- BE: `authorizeProject` + `project-room.socket.ts` + đăng ký trong
  `socket.server.ts`.
- Gate: chạy thử `socket.emit("project:join", { projectId }, ack)` qua test client
  (ví dụ `socket.io-client` snippet) cho cả happy path và FORBIDDEN path.

### Phase 2 — Publisher service skeleton

- BE: thêm 6 method `emitProject*` vào `realtime-event.service.ts` nhưng chưa gọi
  từ service project.
- Gate: chạy unit test (nếu có) hoặc smoke bằng cách emit thủ công từ REPL.

### Phase 3 — Emit khi CRUD project

- BE: wire `emitProjectCreated/Updated/Deleted` vào `projects.service.ts`.
- FE: tạo `projectKeys` factory, `project-cache.ts` reducers, và
  `project-event-handlers.ts`.
- FE: đăng ký handler vào `useGlobalRealtime`.
- FE: chỉnh `useCreateProject`, `useUpdateProject`, `useDeleteProject` dùng
  reducer chung.
- Gate: hai browser cùng trang danh sách project — A tạo/sửa/xoá, B thấy thay đổi
  không refresh.

### Phase 4 — Emit khi CRUD project member

- BE: wire `emitProjectMember*` vào `projects.service.ts`.
- FE: tạo `useProjectMembers` (nếu thiếu), wire `useAddMemberProject`,
  `useRemoveProjectMember`, `useUpdateProjectMemberRole` dùng reducer chung.
- Gate: hai browser cùng trang chi tiết project — A thêm/xoá/đổi role member, B
  thấy thay đổi realtime; member bị xoá khỏi cả board cache liên quan.

### Phase 5 — Project room join cho trang chi tiết

- FE: tạo `project-room-registry.ts`, `useProjectRoom.ts`, dùng ở
  `ProjectDetail` và `useGlobalRealtime`.
- Gate: refresh trang chi tiết project, các event từ server tới đúng sau khi
  `project:join` ack thành công.

### Phase 6 — Reconnect reconcile

- BE: không cần đổi thêm.
- FE: đảm bảo `useGlobalRealtime` rejoin project rooms khi `socket.on("connect")`.
  Trên ack success của project room, gọi reconcile handler đã đăng ký (refetch
  detail + members + boards list).
- Gate: ngắt mạng B, A sửa project, kết nối lại — B refetch và có dữ liệu mới
  nhất.

### Phase 7 — Hardening

- Strict mode: không tạo listener/registry trùng.
- Không toast cho socket event.
- Không listener trong component con.
- Validate payload trước khi mutate cache.
- Lint + build + typecheck pass.

## 8. Test plan

### Backend

Do BE chưa có test runner, cần thêm Vitest/Jest hoặc tách publisher để test bằng
fake Socket.IO server:

- Đúng event name, project room, envelope và actor ID cho 6 event `project:*`.
- Create/update/delete fail không emit.
- Create success emit đúng một lần với DTO canonical.
- Publish throw không làm HTTP response đã commit thành lỗi.
- `project:join` ack trả `FORBIDDEN` khi user không phải member; `NOT_FOUND` khi
  project soft-delete; `INVALID_ID` khi UUID sai.
- `project:leave` không emit phụ.

### Frontend

Nên thêm Vitest + jsdom:

- Apply hai lần cùng `projectId` không duplicate.
- `project:deleted` loại bỏ khỏi `projectKeys.list(...)` ở mọi page chứa id.
- Member add/remove cập nhật `totalMembers` đúng một lần.
- Event ID lặp bị bỏ qua.
- Payload sai project bị bỏ qua.
- Cleanup gọi `socket.off` đúng callback.
- Reconnect rejoin project rooms và reconcile đúng query key.

### Manual acceptance (2 browser)

1. Hai browser mở cùng trang chi tiết project: A sửa tên/mô tả, B thấy ngay.
2. A thêm một member mới, B thấy member xuất hiện với đúng role.
3. A đổi role member, B thấy role cập nhật.
4. A xoá member, B thấy member biến mất và các board của user đó cũng cập nhật
   (kết hợp plan board).
5. A xoá project, B thấy project biến mất khỏi danh sách và cache detail bị xoá.
6. Ngắt mạng B, A sửa + thêm member, kết nối lại — B refetch đầy đủ.
7. Hai browser mở hai project khác nhau, event không rò sang project còn lại.
8. React StrictMode không tạo listener/registry trùng.

## 9. Rủi ro và quyết định

- **Event mất sau DB commit:** MVP dùng reconnect reconcile để bù; transactional
  outbox dành cho phase sau.
- **Nhiều BE instance:** production cần Redis adapter cho Socket.IO; nếu không,
  request vào instance A không tới socket ở instance B.
- **`project:created` fan-out:** chỉ phát về actor qua `user:{actorId}` room; các
  client khác phải nhận qua refetch. Phase 2 sẽ xem xét thêm cơ chế
  `projects:list` room hoặc dùng `user:{userId}` cho mọi active user.
- **Pagination:** page đầy thì không chèn project mới; để refetch phụ trách.
- **Event đến sai thứ tự:** member event đến trước project event không gây lỗi —
  FE validate `projectId` ở `applyProjectMemberAdded`.
- **`ProjectStatus` soft-delete:** khi service update xong nhưng row trả
  `INACTIVE`, không emit `project:updated` (skip).

## 10. Acceptance criteria

- BE và FE có typed contract giống nhau cho 6 event project.
- BE emit sau DB success tới đúng `project:{projectId}` với envelope và actor.
- HTTP response và socket event dùng chung idempotent cache reducer.
- Hai browser đồng bộ CRUD project và CRUD project member mà không cần reload.
- Reconnect reconcile đầy đủ cho project detail + members + board list thuộc
  project.
- `useGlobalRealtime` là owner duy nhất của listener project.
- Không toast cho socket event; toast chỉ tới từ HTTP mutation.
- FE lint/build và BE typecheck pass.

## 11. Ngoài phạm vi MVP

- `board:*` event (xem plan riêng realtime cho board).
- `task:*` event ngoài những gì đã có.
- `projects:list` room để fan-out `project:created` cho mọi client.
- Presence, cursor, typing indicator và offline mutation queue.
- Notification/toast cho remote mutation.
- Transactional outbox và Redis adapter implementation.
- Bulk import/export project.

## 12. Definition of Done

- [ ] BE và FE có typed contract giống nhau cho 6 event `project:*`.
- [ ] BE emit sau DB success tới đúng `project:{projectId}` với envelope và actor.
- [ ] HTTP response và socket event dùng chung idempotent cache reducer.
- [ ] `projectKeys` factory thay thế toàn bộ string inline trong feature project.
- [ ] `applyProjectCreated/Updated/Deleted` đúng filter/page và `totalMembers`.
- [ ] `applyProjectMemberAdded/Removed/RoleUpdated` đúng query
      `projectKeys.members(projectId)`.
- [ ] `useGlobalRealtime` là owner duy nhất của listener project.
- [ ] Reconnect invalidate project detail + members + board list thuộc project.
- [ ] Actor nhận socket echo qua `user:{actorId}` nhưng không bị duplicate.
- [ ] FE lint/build và BE typecheck pass.
- [ ] Manual acceptance hai browser pass, gồm offline/reconnect và hai project.

## 13. Danh sách file dự kiến

### Backend cập nhật

```text
Manage -Task/BE/src/modules/realtime/realtime.types.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
Manage -Task/BE/src/modules/realtime/room-permission.service.ts
Manage -Task/BE/src/modules/realtime/socket.server.ts
Manage -Task/BE/src/modules/realtime/index.ts
Manage -Task/BE/src/modules/projects/projects.controller.ts
Manage -Task/BE/src/modules/projects/projects.service.ts
```

### Backend tạo mới

```text
Manage -Task/BE/src/modules/realtime/project-room.socket.ts
```

### Frontend cập nhật

```text
FE/src/features/realtime/contracts/realtime-events.ts
FE/src/features/realtime/hooks/useTaskSocket.ts (useGlobalRealtime)
FE/src/features/projects/api/project-api.ts (nếu cần thêm endpoint remove/update-member)
FE/src/features/projects/hooks/useCreateProject.ts
FE/src/features/projects/hooks/useUpdateProject.ts
FE/src/features/projects/hooks/useDeleteProject.ts
FE/src/features/projects/hooks/useAddMemberProject.ts
```

### Frontend tạo mới

```text
FE/src/features/projects/utils/project-query-keys.ts
FE/src/features/projects/utils/project-cache.ts
FE/src/features/projects/hooks/useProjectMembers.ts
FE/src/features/projects/hooks/useRemoveProjectMember.ts
FE/src/features/projects/hooks/useUpdateProjectMemberRole.ts
FE/src/features/realtime/rooms/project-room-registry.ts
FE/src/features/realtime/hooks/useProjectRoom.ts
FE/src/features/realtime/handlers/project-event-handlers.ts
```