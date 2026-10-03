# Kế hoạch realtime cho Board

> Baseline được khảo sát ngày 2026-08-18 trên hai codebase: `Manage -Task/BE` và `FE`.
> Phạm vi: đồng bộ trạng thái board (CRUD board + CRUD board member + cập nhật
> role member) giữa các tab/browser đang mở cùng board. List, task, tag realtime là
> các plan riêng và đã có.

## 1. Mục tiêu

- User A tạo/sửa/xoá board, user B đang ở board list của cùng project thấy thay đổi
  ngay, không cần reload hoặc refetch thủ công.
- User A thêm/xoá/cập nhật role một board member, user B đang mở board đó thấy
  danh sách thành viên cập nhật realtime.
- HTTP response và socket echo không tạo bản ghi trùng.
- Event bị bỏ lỡ khi mất mạng được bù bằng refetch sau reconnect.
- Khi một project member bị xoá (từ plan project), mọi board member liên quan
  cũng phải đồng bộ realtime.
- Permission giữ nguyên ở server; FE chỉ phản ánh snapshot đã commit.

## 2. Hiện trạng đã xác minh

### Backend

Đã có:

- Socket.IO, JWT socket authentication và room `user:{userId}` (auto-join khi
  connect).
- `board:join`/`board:leave` với `RoomPermissionService.authorizeBoard` dùng
  `PermissionRepository.checkAnyPermission(userId, [TaskPermissions.VIEW_TASK],
  { boardId, projectId })`.
- `RealtimeEnvelope<T>` với `eventId`, `occurredAt`, `actorId`, `data` và mẫu
  broadcast board cho tag/assignment/list/task (`emitBoardTagCreated/Updated/Deleted`,
  `emitTaskCreated`, `emitListCreated`, …).
- Board endpoint mount path `/board` gồm 7 route (CRUD board + CRUD member + list
  sub-route).
- `POST /project/:projectId/boards` delegate sang `BoardController.createBoard` ở
  `projects.router.ts` (không qua `board.service.ts` tạo board, mà do
  `BoardController.createBoard` gọi trực tiếp `BoardService`).
- `BoardStatus` (ACTIVE/INACTIVE) đã check ở repository.
- `BoardMemberRepository.addMemberOfBoard/checkMemberOfBoard/getActiveBoardMembersWithUser`
  đã có sẵn.
- Soft-delete cascade ở `ProjectMemberRepo.removeProjectMember` đã chạm board
  members khi xoá project member.

Chưa có:

- `board:created` / `board:updated` / `board:deleted` và
  `board:member_added`/`board:member_removed`/`board:member_role_updated` event.
- `emitBoardCreated/Updated/Deleted` và
  `emitBoardMemberAdded/Removed/RoleUpdated` trong `realtime-event.service.ts`.
- `board.service.ts` không gọi `realtimeEventService` ở bất kỳ mutation nào.
- `BoardMemberRepository.updateBoardMemberRole` chưa có (cần thêm nếu service
  muốn update role).
- Contract trong `ServerToClientEvents`/`ClientToServerEvents` chưa có event
  `board:created/updated/deleted` và `board:member_*`.

Lưu ý:

- Board permission enum `BoardPermissions` đã có:
  `UPDATE_BOARD`, `DELETE_BOARD`, `VIEW_BOARD`, `ADD_MEMBER_BOARD`,
  `REMOVE_MEMBER_BOARD`, `UPDATE_ROLE_MEMBER_BOARD`, `CREATE_LIST`. Plan này chỉ
  dùng `VIEW_BOARD` cho join room; các permission khác đã được `verifyBoardPermission`
  middleware xử lý ở HTTP layer.
- `POST /project/:projectId/boards` delegate từ `projects.router.ts` — phát
  `board:created` phải xảy ra sau khi `BoardController.createBoard` (hoặc service
  bên trong) commit, không phát từ project service.
- `board:updated` cho các thuộc tính metadata (name/description) khác với
  `board:list_*` (số list, order list) — phase này chỉ xử lý metadata.

### Frontend

Đã có:

- Socket singleton, board room registry, ack timeout, rejoin và reconcile.
- `useGlobalRealtime()` trong `FE/src/features/realtime/hooks/useTaskSocket.ts` là
  owner duy nhất của mọi listener toàn cục, đã mount `connect`/`disconnect` handler
  và 30s tick refresh auth.
- `FE/src/features/realtime/hooks/useBoardRoom.ts` join `board:{boardId}` với
  refcount, đăng ký reconcile handler vô hiệu hoá tag/list/task cache.
- `FE/src/features/realtime/utils/event-dedupe.ts` có `rememberEvent(eventId)`
  (bounded 512).
- `FE/src/features/realtime/handlers/` đã có các module:
  `tag-event-handlers.ts` (board tag catalog), `assignment-event-handlers.ts`,
  `create-event-handlers.ts` — đều theo cùng khuôn: validate → `rememberEvent`
  → `applyCanonical…` → `socket.off` cleanup.
- `FE/src/features/realtime/contracts/realtime-events.ts` đã có
  `board:tag_created/updated/deleted`, `task:created`, `list:created`.

Chưa có:

- Contract và handler cho `board:created/updated/deleted` và
  `board:member_added/removed/role_updated`.
- `boardKeys` query-key factory. Hiện các hook board dùng string inline:
  `['boards', projectId, page, limit, name]`, `['board', boardId]`,
  `['board-members', boardId]`, `['boards-members', projectId]`.
- `useCreateBoard` invalidate `['boards']` (bare key) — quá rộng.
- `useAddMemberBoard`/`useRemoveMemberBoard`/`useUpdateBoardMemberRole` chưa tận
  dụng reducer chung.
- `useBoardRoom` chỉ register reconcile handler — chưa gọi trực tiếp vào board
  cache update ngoài list/tag/task.

Ràng buộc hiện tại:

- `BoardResponse` ở FE có các field (`listCount`, `memberCount`) mà BE
  `BoardResponseDto` không trả — cần xác minh response thực tế trong browser.
- Board list query là paginate (`page`, `limit`, `name`) theo `projectId`.
- `DetailBoard` gọi `useBoardRoom(boardId, listIds)` đã join room và nhận event
  list/tag/task sẵn — board event cần mirror cùng pattern.

## 3. Kiến trúc và nguyên tắc

```text
REST POST/PATCH/DELETE /board/... hoặc /project/:projectId/boards
        |
        v
verifyBoardPermission -> validate Zod -> controller
        |
        v
service.create/update/delete
        |
        v
repository (Prisma) commit
        |
        v
RealtimeEventService.emitBoardXxx (sau commit, một lần)
        |
        +--> HTTP response DTO canonical
        |
        +--> io.to(projectRoom(projectId)).emit("board:created", envelope)
        |        ^-- chỉ khi cần fan-out cho board list của project
        |
        `--> io.to(boardRoom(boardId)).emit("board:updated", envelope)
                 ^-- board metadata event
```

- REST là command; Socket.IO chỉ phát snapshot đã commit. Không emit trong
  repository hoặc trước khi DB commit.
- Payload chứa DTO canonical đầy đủ (không chỉ request body) để FE không phải
  refetch.
- HTTP handler và socket handler dùng cùng một reducer/applier.
- `boardId` / `projectId` do BE resolve từ resource/context đã xác thực, không
  suy ra từ client.
- `eventId` dùng để dedupe socket; resource ID dùng để idempotent HTTP + socket.
- Không tạo toast cho socket event — toast chỉ tới từ HTTP mutation.
- Không đăng ký listener ở component riêng lẻ; chỉ `useGlobalRealtime` là owner
  duy nhất.
- Cascade rule: khi `project:member_removed` (từ plan project) xảy ra, mọi board
  member thuộc project đó của user đó phải bị gỡ khỏi board cache. Phase này
  giải quyết qua board plan bằng cách board service emit thêm
  `board:member_removed` cho từng board liên quan khi cascade xảy ra (xem §5.7).

## 4. Contract realtime mục tiêu

Thêm vào `Manage -Task/BE/src/modules/realtime/realtime.types.ts` và mirror ở
`FE/src/features/realtime/contracts/realtime-events.ts`:

```ts
type BoardResponseDto = import("@/modules/board/dtos/responses").BoardResponseDto;
type BoardMemberResponseDto =
  import("@/modules/board/dtos/responses").BoardMemberResponseDto;

export type BoardCreatedPayload = RealtimeEnvelope<{
  projectId: string;
  board: BoardResponseDto;
}>;

export type BoardUpdatedPayload = RealtimeEnvelope<{
  projectId: string;
  boardId: string;
  board: BoardResponseDto;
}>;

export type BoardDeletedPayload = RealtimeEnvelope<{
  projectId: string;
  boardId: string;
  board: BoardResponseDto; // soft-delete snapshot, status = INACTIVE
}>;

export type BoardMemberAddedPayload = RealtimeEnvelope<{
  projectId: string;
  boardId: string;
  member: BoardMemberResponseDto;
}>;

export type BoardMemberRemovedPayload = RealtimeEnvelope<{
  projectId: string;
  boardId: string;
  memberId: string; // board-member row id
  userId: string;   // user.id của member bị xoá
}>;

export type BoardMemberRoleUpdatedPayload = RealtimeEnvelope<{
  projectId: string;
  boardId: string;
  member: BoardMemberResponseDto; // row sau update
}>;

export type ServerToClientEvents = {
  // ... existing events
  "board:created": (payload: BoardCreatedPayload) => void;
  "board:updated": (payload: BoardUpdatedPayload) => void;
  "board:deleted": (payload: BoardDeletedPayload) => void;
  "board:member_added": (payload: BoardMemberAddedPayload) => void;
  "board:member_removed": (payload: BoardMemberRemovedPayload) => void;
  "board:member_role_updated": (payload: BoardMemberRoleUpdatedPayload) => void;
};
```

Quy ước FE validate trước khi mutate cache:

- `boardId` / `projectId` không rỗng, khớp với payload.
- Board DTO ở trạng thái active khi apply `board:created`/`board:updated`.
- `board:deleted` xoá board khỏi cache list và invalidate `boardKeys.detail(id)`,
  `boardKeys.members(id)`, `listKeys.boardPrefix(id)`, `taskKeys.list(...)` cho
  các list thuộc board.
- Member payload phải có `boardMemberId`, `userId`, `boardId`, `roleId`.
- `eventId` đã xử lý thì skip; payload sai board/project bị bỏ qua.

Broadcast scope:

| Event                          | Room(s)                                |
| ------------------------------ | -------------------------------------- |
| `board:created`                | `project:{projectId}` (cho board list)  |
| `board:updated`                | `project:{projectId}` + `board:{boardId}` |
| `board:deleted`                | `project:{projectId}` + `board:{boardId}` |
| `board:member_added`           | `board:{boardId}`                      |
| `board:member_removed`         | `board:{boardId}`                      |
| `board:member_role_updated`    | `board:{boardId}`                      |

Ghi chú cascade: Khi `ProjectMemberRepo.removeProjectMember` xoá cascade board
members, service project sẽ phát `project:member_removed`. Sau đó service board
phát `board:member_removed` tương ứng cho từng board — đây là điểm đồng bộ giữa
hai plan. Phase MVP: cascade emit được thực hiện bằng cách `BoardService` lắng
nghe event trong cùng transaction (qua call trực tiếp từ `ProjectMemberRepo`) —
xem §5.7.

## 5. Thay đổi Backend theo file

### 5.1. Realtime contract & publisher

Files:

```text
Manage -Task/BE/src/modules/realtime/realtime.types.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
```

- Thêm 6 payload `Board*` (CRUD + member) vào `realtime.types.ts`.
- Thêm 6 event `board:created/updated/deleted`,
  `board:member_added/removed/role_updated` vào `ServerToClientEvents`.
- Trong `realtime-event.service.ts` thêm các method:
  - `emitBoardCreated(projectId, board, actorId)` → `board:created` tới
    `projectRoom(projectId)` và `user:{actorId}`.
  - `emitBoardUpdated(projectId, boardId, board, actorId)` → `board:updated` tới
    `projectRoom(projectId)` + `boardRoom(boardId)`.
  - `emitBoardDeleted(projectId, boardId, board, actorId)` → `board:deleted` tới
    `projectRoom(projectId)` + `boardRoom(boardId)`.
  - `emitBoardMemberAdded(projectId, boardId, member, actorId)` →
    `board:member_added` tới `boardRoom(boardId)`.
  - `emitBoardMemberRemoved(projectId, boardId, memberId, userId, actorId)` →
    `board:member_removed` tới `boardRoom(boardId)`.
  - `emitBoardMemberRoleUpdated(projectId, boardId, member, actorId)` →
    `board:member_role_updated` tới `boardRoom(boardId)`.
- Mỗi emit dùng `createRealtimeEnvelope({ actorId, data })` một lần rồi emit một
  lần; với event đa room, dùng `io.to(room1).to(room2).emit(...)` để tránh
  trùng broadcast.
- Nếu publish throw, không trả HTTP 500; log `eventId`, `boardId`/`projectId`,
  `actorId` rồi trả response.

### 5.2. Service: emit sau khi tạo board

Files:

```text
Manage -Task/BE/src/modules/board/board.controller.ts
Manage -Task/BE/src/modules/board/board.service.ts
```

- `BoardController.createBoard` (delegate từ
  `POST /project/:projectId/boards`) truyền `projectId` từ params và `userId`
  từ `req.user.id` cho service.
- Trong `BoardService.createBoard`, sau khi repository commit và role admin đã
  gán cho owner, build `BoardResponseDto` canonical rồi gọi
  `realtimeEventService.emitBoardCreated(projectId, board, actorUserId)`.
- HTTP response trả cùng DTO.

### 5.3. Service: emit sau khi update board

Files:

```text
Manage -Task/BE/src/modules/board/board.service.ts
```

- Sau khi `updateBoard` commit, build `BoardResponseDto` mới rồi gọi
  `emitBoardUpdated(projectId, boardId, board, actorUserId)`.
- Resolve `projectId` từ board row (đã có sẵn ở `BoardWithOwner`).

### 5.4. Service: emit sau khi delete board

Files:

```text
Manage -Task/BE/src/modules/board/board.service.ts
```

- Sau khi repository `deleteBoard` (soft-delete + status = INACTIVE), build
  `BoardResponseDto` rồi gọi `emitBoardDeleted(projectId, boardId, board,
  actorUserId)`.
- Cascade soft-delete list/task thuộc board sẽ là phase sau (xem §11).

### 5.5. Service: emit sau khi thêm board member

Files:

```text
Manage -Task/BE/src/modules/board/board.service.ts
Manage -Task/BE/src/modules/board/dtos/responses/boardMember.res.ts
```

- Sau khi `addMemberToBoard` commit và validate user là project member, build
  `BoardMemberResponseDto` từ `BoardMemberRepository.getActiveBoardMembersWithUser`
  hoặc từ row insert với select đầy đủ (cần bổ sung helper nếu chưa có — mirror
  `ProjectMemberRepo.projectMemberDetailsSelect`).
- Gọi `emitBoardMemberAdded(projectId, boardId, member, actorUserId)`.

### 5.6. Service: emit sau khi cập nhật role board member

Files:

```text
Manage -Task/BE/src/modules/board/board.service.ts
Manage -Task/BE/src/modules/boardMember/boardMember.repository.ts
```

- Bổ sung `updateBoardMemberRole(boardId, memberId, roleId)` vào
  `BoardMemberRepository` (mirror `ProjectMemberRepo.updateProjectMemberRole`).
- Trong service, sau khi role hợp lệ và commit, build `BoardMemberResponseDto`
  rồi gọi `emitBoardMemberRoleUpdated(projectId, boardId, member, actorUserId)`.

### 5.7. Service: emit sau khi xoá board member

Files:

```text
Manage -Task/BE/src/modules/board/board.service.ts
Manage -Task/BE/src/modules/boardMember/boardMember.repository.ts
```

- Bổ sung `removeBoardMember(boardId, memberId, userId)` transactional vào
  `BoardMemberRepository` (soft-delete + return boardId + projectId).
- Trong service, sau khi commit, gọi
  `emitBoardMemberRemoved(projectId, boardId, memberId, userId, actorUserId)`.

### 5.8. Cascade: project member bị xoá → board member

Files:

```text
Manage -Task/BE/src/modules/projectMember/projectMember.repository.ts
Manage -Task/BE/src/modules/projects/projects.service.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
```

- Khi `ProjectMemberRepo.removeProjectMember` cascade soft-delete board
  members, trả về danh sách `(boardId, boardMemberId, userId)` đã bị xoá.
- Trong `ProjectsService.removeProjectMember`, sau khi cascade commit, gọi
  `realtimeEventService.emitBoardMemberRemoved(projectId, boardId, boardMemberId,
  userId, actorUserId)` cho từng cặp.
- Phase này đảm bảo plan project và plan board đồng bộ: project event và
  nhiều board event phát trong cùng transaction.

## 7. Thay đổi Frontend theo file

### 6.1. Board query-key factory

Tạo:

```text
FE/src/features/boards/utils/board-query-keys.ts
```

```ts
export const boardKeys = {
  all: ["boards"] as const,
  lists: () => ["boards", "list"] as const,
  list: (projectId: string, page: number, limit: number, name?: string) =>
    ["boards", projectId, page, limit, name ?? null] as const,
  detail: (boardId: string) => ["board", boardId] as const,
  members: (boardId: string) => ["board-members", boardId] as const,
  membersByProject: (projectId: string) => ["boards-members", projectId] as const,
};
```

Cập nhật `useBoards`, `useBoard`, `useBoardMembers`, `useBoardsMembers`,
`useCreateBoard`, `useUpdateBoard`, `useDeleteBoard`, `useAddMemberBoard` chuyển
sang dùng factory.

Sửa kèm:

- `useCreateBoard(projectId)` invalidate `boardKeys.list(projectId, ...)` ở
  page 1 thay vì `['boards']` bare.
- `useUpdateBoard` invalidate `boardKeys.detail(boardId)`.
- `useDeleteBoard` invalidate `boardKeys.all` (xoá cả detail, members, list).
- `useAddMemberBoard` đổi sang `boardKeys.members(boardId)` và
  `boardKeys.membersByProject(projectId)`.

### 6.2. Board cache reducers

Tạo:

```text
FE/src/features/boards/utils/board-cache.ts
```

```ts
export function applyBoardCreated(
  queryClient: QueryClient,
  projectId: string,
  board: BoardResponse,
): void;

export function applyBoardUpdated(
  queryClient: QueryClient,
  projectId: string,
  board: BoardResponse,
): void;

export function applyBoardDeleted(
  queryClient: QueryClient,
  projectId: string,
  boardId: string,
): void;

export function applyBoardMemberAdded(
  queryClient: QueryClient,
  boardId: string,
  member: BoardMemberUser,
): void;

export function applyBoardMemberRemoved(
  queryClient: QueryClient,
  boardId: string,
  memberId: string,
  userId: string,
): void;

export function applyBoardMemberRoleUpdated(
  queryClient: QueryClient,
  boardId: string,
  member: BoardMemberUser,
): void;
```

Quy tắc:

- `applyBoardCreated`: chèn vào page 1 của `boardKeys.list(projectId, 1, ...)`
  nếu page chưa đầy và match filter `name`; nếu page đầy thì không chèn, để
  refetch phụ trách.
- `applyBoardUpdated`: cập nhật `boardKeys.detail(id)` và upsert vào mọi
  `boardKeys.list(projectId, ...)` chứa id.
- `applyBoardDeleted`: loại board khỏi tất cả `boardKeys.list(projectId, ...)`,
  remove `boardKeys.detail(id)`, invalidate `listKeys.boardPrefix(id)` và
  `taskKeys.list(...)` cho các list thuộc board.
- `applyBoardMemberAdded`: upsert vào `boardKeys.members(boardId)`.
- `applyBoardMemberRemoved`: xoá khỏi `boardKeys.members(boardId)`.
- `applyBoardMemberRoleUpdated`: merge theo `boardMemberId` vào
  `boardKeys.members(boardId)`.
- Mọi apply phải idempotent: cùng `id` chỉ merge, không append; cùng `eventId`
  đã xử lý thì skip.
- Validate `board.id`, `board.projectId`, `member.boardId`, `member.userId`
  trước khi mutate; payload sai thì debug-log rồi bỏ qua.

### 6.3. Typed socket contract (FE)

Sửa `FE/src/features/realtime/contracts/realtime-events.ts`:

- Thêm 6 payload `Board*` mirror BE.
- Thêm 6 event `board:*` vào `ServerToClientEvents`.

### 6.4. Global event handler

Tạo:

```text
FE/src/features/realtime/handlers/board-event-handlers.ts
```

```ts
export function registerBoardEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void;
```

- Validate payload theo các invariant ở §4.
- `rememberEvent(payload.eventId)` skip nếu đã xử lý.
- Dispatch sang `applyBoard*` tương ứng.
- Cleanup `socket.off(...)` đúng callback.

Đăng ký trong `useGlobalRealtime()` (hiện nằm trong
`FE/src/features/realtime/hooks/useTaskSocket.ts`):

- Gọi `registerBoardEventHandlers(socket, queryClient)` cùng với các handler đã
  có (`tag`, `assignment`, `create`, `project`).
- Không thêm listener ở component nào khác.

### 6.5. HTTP mutation dùng chung reducer

Sửa:

```text
FE/src/features/boards/hooks/useCreateBoard.ts
FE/src/features/boards/hooks/useUpdateBoard.ts
FE/src/features/boards/hooks/useDeleteBoard.ts
FE/src/features/boards/hooks/useAddMemberBoard.ts
```

- `useCreateBoard.onSuccess`: gọi `applyBoardCreated(queryClient, projectId,
  response.data)` thay vì chỉ `invalidateQueries(['boards'])`.
- `useUpdateBoard.onSuccess`: `applyBoardUpdated(queryClient, projectId,
  response.data)` + invalidate `boardKeys.detail(boardId)`.
- `useDeleteBoard.onSuccess`: `applyBoardDeleted(queryClient, projectId, id)` rồi
  `invalidateQueries(boardKeys.all)`.
- `useAddMemberBoard.onSuccess`: `applyBoardMemberAdded(queryClient, boardId,
  member)` + invalidate `boardKeys.members(boardId)` và
  `boardKeys.membersByProject(projectId)`.
- Thêm `useRemoveMemberBoard` và `useUpdateBoardMemberRole` nếu chưa có, dùng
  reducer tương ứng.
- Giữ success toast hiện tại.

### 6.6. Cascade: project member bị xoá → board member

Sửa:

```text
FE/src/features/realtime/handlers/project-event-handlers.ts
FE/src/features/realtime/handlers/board-event-handlers.ts
```

- `project-event-handlers.ts` khi nhận `project:member_removed`, không cần làm
  gì thêm cho board cache — board handler sẽ tự nhận `board:member_removed`
  tương ứng và loại.
- `board-event-handlers.ts` nhận `board:member_removed`:
  - `applyBoardMemberRemoved(queryClient, boardId, memberId, userId)`.
  - Idempotent qua `eventId` dedupe.

### 6.7. UI không cần thay đổi layout

Không đổi CSS/JSX của component hiện tại. Realtime chỉ thay đổi cache, UI
render lại tự nhiên qua TanStack Query subscription.

## 7. Trình tự triển khai (Phase + Gate)

### Phase 0 — Chuẩn bị contract BE/FE

- BE: thêm payload + event vào `realtime.types.ts`.
- FE: mirror contract vào `realtime-events.ts`.
- Gate: `npx tsc --noEmit` pass cả BE và FE.

### Phase 1 — Publisher service skeleton

- BE: thêm 6 method `emitBoard*` vào `realtime-event.service.ts` nhưng chưa gọi
  từ service board.
- Gate: smoke bằng cách emit thủ công từ REPL hoặc test client.

### Phase 2 — Emit khi CRUD board

- BE: wire `emitBoardCreated/Updated/Deleted` vào `board.service.ts` (kèm
  resolve `projectId` từ board row).
- FE: tạo `boardKeys` factory, `board-cache.ts` reducers, và
  `board-event-handlers.ts`.
- FE: đăng ký handler vào `useGlobalRealtime`.
- FE: chỉnh `useCreateBoard`, `useUpdateBoard`, `useDeleteBoard` dùng reducer
  chung.
- Gate: hai browser cùng trang board list của một project — A tạo/sửa/xoá, B
  thấy thay đổi không refresh.

### Phase 3 — Emit khi CRUD board member

- BE: bổ sung `updateBoardMemberRole`/`removeBoardMember` ở
  `BoardMemberRepository`.
- BE: wire `emitBoardMember*` vào `board.service.ts`.
- FE: chỉnh `useAddMemberBoard`, `useRemoveMemberBoard`,
  `useUpdateBoardMemberRole` dùng reducer chung.
- Gate: hai browser mở cùng `DetailBoard` — A thêm/xoá/đổi role member, B thấy
  thay đổi realtime.

### Phase 4 — Cascade project member → board member

- BE: `ProjectMemberRepo.removeProjectMember` trả danh sách `(boardId,
  boardMemberId, userId)` đã cascade; `ProjectsService.removeProjectMember` gọi
  `emitBoardMemberRemoved` cho từng cặp.
- Gate: hai browser mở board của project — A xoá một project member từ trang
  chi tiết project, board hiển thị B thấy member đó bị xoá trên board tương
  ứng.

### Phase 5 — Board room join cho trang chi tiết

- BE: không cần đổi thêm (đã có `board:join`).
- FE: đảm bảo `useBoardRoom` (đã có) đăng ký reconcile handler gọi cả
  `boardKeys.detail(boardId)`, `boardKeys.members(boardId)`, và board list của
  project.
- Gate: refresh trang chi tiết board, các event từ server tới đúng sau khi
  `board:join` ack thành công.

### Phase 6 — Reconnect reconcile

- BE: không cần đổi thêm.
- FE: đảm bảo `useGlobalRealtime` rejoin board rooms khi `socket.on("connect")`.
  Trên ack success của board room, gọi reconcile handler đã đăng ký (refetch
  detail + members + list + tag + task).
- Gate: ngắt mạng B, A sửa board, kết nối lại — B refetch và có dữ liệu mới
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

- Đúng event name, board/project room, envelope và actor ID cho 6 event
  `board:*`.
- Create/update/delete fail không emit.
- Create success emit đúng một lần với DTO canonical.
- Publish throw không làm HTTP response đã commit thành lỗi.
- Cascade: `ProjectMemberRepo.removeProjectMember` trả danh sách board member
  đúng `(boardId, boardMemberId, userId)`.
- `board:join` ack trả `FORBIDDEN` khi user không phải board member; `NOT_FOUND`
  khi board soft-delete; `INVALID_ID` khi UUID sai.
- `board:leave` không emit phụ.

### Frontend

Nên thêm Vitest + jsdom:

- Apply hai lần cùng `boardId` không duplicate.
- `board:deleted` loại bỏ khỏi `boardKeys.list(projectId, ...)` ở mọi page chứa
  id.
- Member add/remove cập nhật `boardKeys.members(boardId)` đúng một lần.
- Event ID lặp bị bỏ qua.
- Payload sai board/project bị bỏ qua.
- Cleanup gọi `socket.off` đúng callback.
- Reconnect rejoin board rooms và reconcile đúng query key.

### Manual acceptance (2 browser)

1. Hai browser mở cùng trang board list của project: A tạo board, B thấy board
   xuất hiện ngay.
2. A sửa tên/mô tả board, B thấy ngay.
3. A xoá board, B thấy board biến mất và cache detail bị xoá.
4. Hai browser mở cùng `DetailBoard`: A thêm member, B thấy member xuất hiện.
5. A đổi role board member, B thấy role cập nhật.
6. A xoá board member, B thấy member biến mất.
7. A xoá project member từ trang chi tiết project, B đang mở board của user đó
   thấy member bị xoá realtime.
8. Ngắt mạng B, A sửa + thêm member + xoá board, kết nối lại — B refetch đầy
   đủ.
9. Hai browser mở hai board khác nhau, event không rò sang board còn lại.
10. React StrictMode không tạo listener/registry trùng.

## 9. Rủi ro và quyết định

- **Event mất sau DB commit:** MVP dùng reconnect reconcile để bù; transactional
  outbox dành cho phase sau.
- **Nhiều BE instance:** production cần Redis adapter cho Socket.IO; nếu không,
  request vào instance A không tới socket ở instance B.
- **`board:created` fan-out:** chỉ phát tới `project:{projectId}` room. Client
  không ở project room chỉ nhận qua refetch.
- **Pagination:** page đầy thì không chèn board mới; để refetch phụ trách.
- **Event đến sai thứ tự:** member event đến trước board event không gây lỗi — FE
  validate `boardId` ở `applyBoardMemberAdded`.
- **Cascade phức tạp:** project member xoá cascade có thể xoá hàng chục board
  member cùng lúc. Phase MVP gọi `emitBoardMemberRemoved` tuần tự cho từng
  cặp; phase sau có thể gom thành một `board:bulk_member_removed` event.
- **DTO field mismatch:** `BoardResponse` ở FE có `listCount`/`memberCount` mà BE
  `BoardResponseDto` không trả — cần xác minh response thực tế trong browser
  trước khi định hình cache reducer; nếu BE chưa trả, FE có thể dùng derived từ
  `useBoardListCounts` / `useBoardMembers`.

## 10. Acceptance criteria

- BE và FE có typed contract giống nhau cho 6 event `board:*`.
- BE emit sau DB success tới đúng room(s) với envelope và actor.
- HTTP response và socket event dùng chung idempotent cache reducer.
- Hai browser đồng bộ CRUD board và CRUD board member mà không cần reload.
- Cascade project member → board member đồng bộ realtime.
- Reconnect reconcile đầy đủ cho board detail + members + list + tag + task.
- `useGlobalRealtime` là owner duy nhất của listener board.
- Không toast cho socket event; toast chỉ tới từ HTTP mutation.
- FE lint/build và BE typecheck pass.

## 11. Ngoài phạm vi MVP

- `list:*` event update/delete/reorder (đã có `list:created`).
- `task:*` event update/delete/move.
- `board:list_*` event (list count, list order, list deleted trên board).
- `projects:list` room để fan-out `project:created` cho mọi client.
- Presence, cursor, typing indicator và offline mutation queue.
- Notification/toast cho remote mutation.
- Transactional outbox và Redis adapter implementation.
- Bulk import/export board.

## 12. Definition of Done

- [ ] BE và FE có typed contract giống nhau cho 6 event `board:*`.
- [ ] BE emit sau DB success tới đúng room(s) với envelope và actor.
- [ ] HTTP response và socket event dùng chung idempotent cache reducer.
- [ ] `boardKeys` factory thay thế toàn bộ string inline trong feature board.
- [ ] `applyBoardCreated/Updated/Deleted` đúng filter/page và đúng projectId.
- [ ] `applyBoardMemberAdded/Removed/RoleUpdated` đúng query
      `boardKeys.members(boardId)`.
- [ ] Cascade `project:member_removed` → `board:member_removed` đồng bộ trong
      cùng transaction.
- [ ] `useGlobalRealtime` là owner duy nhất của listener board.
- [ ] Reconnect invalidate board detail + members + list + tag + task.
- [ ] Actor nhận socket echo qua `user:{actorId}` nhưng không bị duplicate.
- [ ] FE lint/build và BE typecheck pass.
- [ ] Manual acceptance hai browser pass, gồm offline/reconnect, hai board, và
      cascade project member.

## 13. Danh sách file dự kiến

### Backend cập nhật

```text
Manage -Task/BE/src/modules/realtime/realtime.types.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
Manage -Task/BE/src/modules/board/board.controller.ts
Manage -Task/BE/src/modules/board/board.service.ts
Manage -Task/BE/src/modules/boardMember/boardMember.repository.ts
Manage -Task/BE/src/modules/projects/projects.service.ts
Manage -Task/BE/src/modules/projectMember/projectMember.repository.ts
```

### Frontend cập nhật

```text
FE/src/features/realtime/contracts/realtime-events.ts
FE/src/features/realtime/hooks/useTaskSocket.ts (useGlobalRealtime)
FE/src/features/boards/api/board-api.ts (nếu cần thêm endpoint remove/update-member)
FE/src/features/boards/hooks/useCreateBoard.ts
FE/src/features/boards/hooks/useUpdateBoard.ts
FE/src/features/boards/hooks/useDeleteBoard.ts
FE/src/features/boards/hooks/useAddMemberBoard.ts
FE/src/features/boards/hooks/useBoardMembers.ts
FE/src/features/boards/hooks/useBoardsMembers.ts
```

### Frontend tạo mới

```text
FE/src/features/boards/utils/board-query-keys.ts
FE/src/features/boards/utils/board-cache.ts
FE/src/features/boards/hooks/useRemoveMemberBoard.ts
FE/src/features/boards/hooks/useUpdateBoardMemberRole.ts
FE/src/features/realtime/handlers/board-event-handlers.ts
```