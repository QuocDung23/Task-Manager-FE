# Ke hoach trien khai Realtime cho Tag Pin

> Pham vi duoc danh gia tai ngay 2026-08-12 tren hai codebase:
> `Manage -Task/BE` va `FE`.
>
> Muc tieu: khi mot user gan, go, replace tag cua task hoac thay doi danh muc
> tag cua board, cac browser/tab dang mo cung board nhan du lieu da commit va
> cap nhat task card, task detail, picker, filter va tag manager ma khong can
> reload.

## 1. Ket luan kien truc

Realtime cua Tag Pin can ca `task room` va `board room`:

- `task:{taskId}` giu task detail dang mo dong bo chinh xac theo task.
- `board:{boardId}` giup board nhan thay doi tag cua moi task, ke ca task dang
  khong xuat hien do filter. Day la yeu cau bat buoc de filter tag dung.
- REST van la command: FE tiep tuc goi `PATCH/POST/DELETE` hien tai.
- Socket.IO chi phat event sau khi transaction DB thanh cong.
- Payload task phai la `TaskResponse` canonical day du, khong chi gui `tagIds`.
- TanStack Query la server-state source of truth. Socket handler khong cap nhat
  state rieng trong component.
- Client tao mutation cung co the nhan socket echo. Moi cache reducer phai
  idempotent va khong tao duplicate.

Khong chi dung `task:{taskId}` cho board. Vi du: browser B dang filter tag A,
task X chua co tag A nen khong nam trong cache va browser B khong join room cua
X. Khi browser A gan tag A vao X, chi board room moi co the dua X vao ket qua
filter cua browser B.

## 2. Hien trang da xac minh

### Backend

Backend da co Socket.IO va ba loai room/event behavior:

- `src/modules/realtime/socket.server.ts`: khoi tao Socket.IO va auth.
- `src/modules/realtime/socket-auth.middleware.ts`: doc access token tu
  handshake/cookie va gan authenticated user vao `socket.data`.
- `src/modules/realtime/task-comment.socket.ts`: `task:join`/`task:leave`, co
  check `VIEW_TASK`.
- `src/modules/realtime/realtime-event.service.ts`: emit comment, schedule va
  notification.
- Moi socket tu dong join `user:{userId}`.

Tag backend da co day du REST:

```text
GET    /task/boards/:boardId/tags
POST   /task/boards/:boardId/tags
PATCH  /task/boards/:boardId/tags/:tagId
DELETE /task/boards/:boardId/tags/:tagId
GET    /task/boards/:boardId/tags/:tagId/tasks
PATCH  /task/:taskId/tags
POST   /task/:taskId/tags/:tagId
DELETE /task/:taskId/tags/:tagId
```

`TaskTagService` tra ve `TaskResponseDto` canonical cho replace/attach/detach,
nhung chua emit realtime. Create/update/delete tag tra `TagResponseDto`, cung
chua emit.

`TaskTagRepository` chi thay doi `taskTags`. Cac mutation nay hien khong touch
`tasks.updatedAt`, vi vay `TaskResponse.updatedAt` chua phai revision tin cay
cho thay doi tag.

Backend hien chua co:

- `board:join`/`board:leave`;
- `board:{boardId}` room;
- event `task:tags_updated`;
- event create/update/delete danh muc tag;
- test Socket.IO/room permission/tag event.

### Frontend

FE hien da co:

- `socket.io-client` singleton trong `src/features/realtime/socket.ts`;
- global listener owner trong `useGlobalRealtime()`;
- task-room refcount, reconnect va rejoin trong
  `src/features/realtime/hooks/useTaskSocket.ts`;
- `useAutoJoinVisibleTaskRooms()` tren board;
- `replaceTaskAcrossCaches()` da filter-aware va overwrite detail cache;
- tag API, hooks, picker, manager, filter va badge dang duoc trien khai;
- `TaskResponse.tags`, `TaskListFilters.tagIds/tagMode` va query key tag.

Gap cua FE:

- socket contract chua khai bao event tag/board room;
- board chua join `board:{boardId}`;
- global handler chua xu ly task tag va tag catalog event;
- create/update/delete tag hien chi invalidate cache o tab tao mutation;
- update/delete tag o tab khac co the de task card/detail/filter giu metadata
  cu;
- picker dang mo chua co UX khi remote update lam draft bi stale;
- helper insert task moi vao filtered cache dang append cuoi, chua dam bao
  `orderTask` va pagination metadata;
- reconnect moi rejoin room; chua reconcile cac event bi lo trong luc offline.

## 3. Contract realtime muc tieu

### 3.1. Room contract

Them vao `ClientToServerEvents`:

```ts
type ClientToServerEvents = {
  "task:join": (payload: { taskId: string }, ack?: Ack) => void;
  "task:leave": (payload: { taskId: string }, ack?: Ack) => void;
  "board:join": (payload: { boardId: string }, ack?: Ack) => void;
  "board:leave": (payload: { boardId: string }, ack?: Ack) => void;
};
```

Quy tac BE cho `board:join`:

1. Validate `boardId` la UUID.
2. Load board active; khong tin board context do client tu khai bao.
3. Check authenticated user co `TaskPermissions.VIEW_TASK` trong context
   `{ boardId, projectId }`. Quyen nay khop voi GET tags/task hien tai.
4. Chi join `board:${boardId}` sau khi check thanh cong.
5. Ack `{ success: true }` hoac `{ success: false, error, code }`.
6. Leave chi validate ID va go socket khoi room; khong query permission lai.

Ack nen co code on dinh de FE khong parse text:

```ts
type RealtimeAck = {
  success: boolean;
  code?: "INVALID_ID" | "NOT_FOUND" | "FORBIDDEN" | "INTERNAL_ERROR";
  error?: string;
};
```

### 3.2. Event envelope

Dung mot envelope chung cho event moi:

```ts
type RealtimeEnvelope<T> = {
  eventId: string;
  occurredAt: Date; // qua Socket.IO se thanh ISO string o FE
  actorId: string | null;
  data: T;
};
```

- `eventId`: `randomUUID()` de trace va dedupe neu can.
- `occurredAt`: thoi diem tao event sau commit.
- `actorId`: lay tu `(req as any).user.id`; khong doc Express request trong
  realtime service.
- Payload luon co `boardId` de handler FE gioi han cache scope va log duoc event.
- FE giu mot bounded set/LRU cac `eventId` vua xu ly. Cung `eventId` den lai do
  retry, adapter hoac loi publish se khong apply cache lan hai.

### 3.3. Task tag event

```ts
type TaskTagsUpdatedPayload = RealtimeEnvelope<{
  boardId: string;
  taskId: string;
  task: TaskResponseDto;
}>;

type ServerToClientEvents = {
  "task:tags_updated": (payload: TaskTagsUpdatedPayload) => void;
};
```

BE broadcast cung mot payload toi union cua hai room:

```text
task:{taskId}
board:{boardId}
```

Phai dung mot chain broadcast:

```ts
io.to(taskRoom(taskId))
  .to(boardRoom(boardId))
  .emit("task:tags_updated", payload);
```

Khong goi hai lenh `emit` rieng. Mot socket thuong join ca task room va board
room; Socket.IO union broadcast dam bao socket do chi nhan mot ban event. FE
van dedupe theo `eventId` nhu lop bao ve thu hai.

Event nay duoc phat sau ca ba mutation:

- replace all tags;
- attach one tag;
- detach one tag.

Khong can ba event rieng vi cache consumer chi can snapshot cuoi cung. Payload
full task giu `tags`, `listId`, `orderTask`, schedule, assignment va status nhat
quan voi REST response.

### 3.4. Board tag catalog events

```ts
type BoardTagPayload = RealtimeEnvelope<{
  boardId: string;
  tag: TagResponseDto;
}>;

type ServerToClientEvents = {
  "board:tag_created": (payload: BoardTagPayload) => void;
  "board:tag_updated": (payload: BoardTagPayload) => void;
  "board:tag_deleted": (payload: BoardTagPayload) => void;
};
```

- Create lai mot tag soft-deleted duoc xem la `board:tag_created`, vi resource
  active duoc them lai vao picker/filter.
- Delete payload van gui `TagResponseDto` canonical voi `status=INACTIVE` va
  `deletedAt` co gia tri.
- Cac event nay chi emit toi `board:{boardId}`.

## 4. Thay doi Backend

### 4.1. Tach room permission va them board room

File du kien:

```text
Manage -Task/BE/src/modules/realtime/
  realtime.types.ts
  realtime-event.service.ts
  realtime-envelope.ts
  room-permission.service.ts
  task-room.socket.ts
  board-room.socket.ts
  socket.server.ts
```

Cong viec:

1. Doi `task-comment.socket.ts` thanh ownership ro hon cho task room, hoac giu
   export backward-compatible trong khi tach handler.
2. Dua UUID validation va permission query vao `RoomPermissionService`.
3. Them `boardRoom(boardId) => board:${boardId}`.
4. Register ca task va board room handlers tai `socket.server.ts`.
5. Dung typed `AppSocketServer` trong `RealtimeEventService`; bo
   `event: string` va `payload: any` cho event moi.
6. Join dung ack timeout contract; log `userId`, room type, entity ID va result,
   khong log token.

Khong auto-join tat ca board cua user khi connect. FE chi join board dang mount
de han che fan-out va tranh phat data cua board khong active tren UI.

### 4.2. Bao dam revision cho task tag

Them revision rieng vao model `tasks`:

```ts
tagVersion Int @default(0) @map("tag_version")
```

Trong cung transaction cua `replaceTaskTags`, `attachTaskTag` va
`detachTaskTag`, increment parent task truoc khi query snapshot:

```ts
await tx.tasks.update({
  where: { id: taskId },
  data: { tagVersion: { increment: 1 } },
});
```

Sau do query task bang `taskDetailsInclude`, dua `tagVersion` vao
`TaskResponseDto` va FE `TaskResponse`, roi tao payload/HTTP response tu cung
snapshot.

Muc dich:

- moi thay doi tag co revision tang don dieu;
- FE bo qua phan tags cua HTTP/socket snapshot co `tagVersion` thap hon cache;
- socket echo va HTTP success cung version se idempotent;
- hai mutation commit gan nhau khong phu thuoc do chinh xac mili-giay cua Date.

Thay doi nay can Prisma migration. Neu buoc phai giu schema cu cho mot MVP tam
thoi, co the touch `tasks.updatedAt` trong transaction va compare timestamp,
nhung phuong an do khong dam bao thu tu khi hai commit serialize ve cung mot
mili-giay va khong dat acceptance criterion ve concurrent edit mot cach chat.

Khi generic task reducer nhan snapshot cua event khac, neu payload co
`tagVersion` thap hon cache thi van apply cac field khac nhung giu lai
`tags/tagVersion` moi hon. Khong reject toan bo snapshot, vi nhu vay co the lam
mat schedule/status update hop le.

### 4.3. Publish task tag event

Cap nhat ba method mutation cua `TaskTagService`:

1. Resolve `boardId` tu task/list nhu hien tai.
2. Thuc hien repository transaction.
3. Tao mot lan `const response = this.toTaskResponse(updated)`.
4. Publish `task:tags_updated` toi task room va board room bang cung snapshot.
5. Return cung `response` cho HTTP.

Controller truyen `actorUserId` vao service:

```ts
const actorUserId = (req as any).user?.id;
await taskTagService.replaceTaskTags(dto, actorUserId);
```

Event chi duoc publish sau commit. Loi publish khong rollback mutation HTTP;
realtime service phai log loi de reconnect reconcile co the sua cache.

### 4.4. Publish tag catalog event

Cap nhat `createTag`, `updateTag`, `deleteTag`:

- tao `TagResponseDto` mot lan;
- publish event tuong ung toi `board:{boardId}`;
- return cung DTO trong HTTP response;
- truyen `actorUserId` tu controller.

Delete tag hien soft-delete moi lien ket `taskTags` ma khong tra danh sach task
bi anh huong. Vi vay `board:tag_deleted` khong du de patch canonical moi task;
FE phai remove metadata co the xac dinh ngay va invalidate/refetch task queries
de reconcile day du.

### 4.5. Khong emit trong repository

Repository chi quan ly DB transaction. Publish dat o service sau khi da co
response canonical. Cach nay tranh:

- emit truoc commit;
- emit tu transaction rollback;
- realtime module phai biet Express request;
- controller va service tao hai snapshot khac nhau.

## 5. Thay doi Frontend

### 5.1. Typed contract

Tach contract khoi `src/features/realtime/socket.ts`:

```text
FE/src/features/realtime/contracts/realtime-events.ts
```

Mirror dung event BE, nhung cac `Date` da serialize phai la `string`:

- `task:tags_updated` dung `TaskResponse`.
- board tag events dung `TagResponse`.
- them `board:join`/`board:leave` vao client events.
- giu comment/schedule/notification events hien tai de khong regression.

Khong import type truc tiep tu BE source; hai app build/doc lap. Contract mirror
duoc kiem tra bang integration test va payload fixture.

### 5.2. Board room registry

Them:

```text
FE/src/features/realtime/rooms/board-room-registry.ts
FE/src/features/realtime/hooks/useBoardRoom.ts
```

Registry giu hai state rieng:

```ts
type BoardRoomState = {
  desiredRefs: Map<string, number>;
  joinedOnTransport: Set<string>;
};
```

Quy tac:

1. `acquire(boardId)` tang ref; tu 0 len 1 thi join neu connected.
2. Chi danh dau joined khi ack success trong timeout 5 giay.
3. `release(boardId)` giam ref; ve 0 thi leave neu da joined.
4. Disconnect chi clear `joinedOnTransport`, khong clear `desiredRefs`.
5. Connect/reconnect join lai moi desired board, khong tang ref.
6. Logout reset ca desired va actual rooms.
7. `FORBIDDEN/NOT_FOUND` khong retry lien tuc va khong spam toast.

Mount `useBoardRoom(boardId)` tai `DetailBoard` hoac mot component con ton tai
suot lifecycle cua board. Khi route doi board, room cu duoc release truoc khi
room moi duoc acquire.

Trong phase nay van giu `useAutoJoinVisibleTaskRooms()` vi schedule event hien
chi phat vao task room. Khong duoc xoa no trong thay doi Tag Pin neu chua chuyen
schedule event sang board room.

### 5.3. Global tag event handler

Them:

```text
FE/src/features/realtime/handlers/tag-event-handlers.ts
```

`useGlobalRealtime()` van la owner duy nhat dang ky listener. Handler file chi
export pure apply functions va ham register/unregister tra cleanup bang dung
callback reference.

Khong dang ky `socket.on()` trong:

- `TaskTagsPicker`;
- `TaskTagBadge`;
- `TagFilter`;
- `BoardTagsManagerDialog`;
- mutation hooks.

### 5.4. Reducer cho `task:tags_updated`

`applyTaskTagsUpdated(queryClient, payload)`:

1. Validate toi thieu `eventId`, `boardId`, `taskId`, `task.id`, `task.listId`,
   `task.tagVersion` va `task.tags`.
2. Neu eventId da xu ly, bo qua. Neu snapshot hien tai co `tagVersion` lon hon
   payload, bo qua phan tags cua event stale.
3. Dung cung helper canonical cho ca REST success va socket event.
4. Replace task theo ID trong detail cache va moi list cache cung `listId`.
5. Re-evaluate `tagIds/tagMode` cho moi list cache:
   - task khong con match thi remove;
   - task moi match nhung chua co thi insert;
   - khong bao gio duplicate.
6. Sort lai theo `orderTask` khi insert, khong append tuy y.
7. Cap nhat pagination/total metadata neu response cache co field nay.
8. Invalidate active `getTasksByTag` queries cua board de dong bo group view.

Nen doi helper hien tai thanh mot entry point duy nhat, vi du:

```ts
applyCanonicalTaskSnapshot(queryClient, task, { source: "http" | "socket" });
```

`useReplaceTaskTags`, `useAttachTaskTag`, `useDetachTaskTag` va socket handler
deu goi helper nay. Nhu vay socket echo den truoc hay HTTP response den truoc
deu hoi tu ve mot cache.

### 5.5. Reducer cho tag catalog

Mo rong `tagKeys` co prefix de update theo board:

```ts
tagKeys.boards()
tagKeys.boardPrefix(boardId)
tagKeys.board(boardId, params)
tagKeys.tasksPrefix(boardId)
tagKeys.tasks(boardId, tagId, params)
```

Behavior:

| Event | Tag cache | Task cache | Tasks-by-tag cache |
| --- | --- | --- | --- |
| `board:tag_created` | Upsert theo ID neu match search/status | Khong doi | Invalidate active prefix |
| `board:tag_updated` | Upsert/remove theo search params moi | Patch `name/color` trong moi `TaskTagSummary` dang cache | Patch heading + invalidate active prefix |
| `board:tag_deleted` | Remove theo ID | Remove tag khoi cached tasks, re-run filter, sau do invalidate active task queries | Remove/invalidate prefix |

Reducer phai update tat ca query variant cua board, khong chi
`tagKeys.board(boardId, {})`, vi picker co query theo `name` va manager/filter co
the dang dung params khac nhau.

Voi delete, immediate patch giup UI bien mat ngay; invalidate/refetch van bat
buoc vi mot tag co the bi go khoi nhieu task ma FE khong cache day du.

### 5.6. Reconnect reconcile

Room rejoin chi khoi phuc event tuong lai, khong bu cac event da mat. Sau khi
socket reconnect va board-room ack thanh cong:

- invalidate active `tagKeys.boardPrefix(boardId)`;
- invalidate active `tagKeys.tasksPrefix(boardId)`;
- invalidate active task-list queries cua board;
- refetch task detail dang mo;
- debounce/batch mot lan cho moi reconnect, khong refetch sau tung room ack.

Hien task query key chua co `boardId`, nen co hai lua chon:

1. Phase nay truyen list IDs cua board vao reconcile va invalidate dung
   `taskKeys.list(listId, ...)`.
2. Neu khong co registry list IDs on dinh, invalidate `taskKeys.lists()` toan
   app trong migration, sau do them `boardId` vao task list key o phase tiep.

Uu tien cach 1 de tranh refetch board khong active.

### 5.7. Picker conflict khi co remote update

`TaskTagsPicker` co local `draftTagIds`, nen can xu ly khi task prop thay doi
trong luc popover dang mo:

- neu draft chua sua: sync draft theo payload realtime moi;
- neu draft da sua: giu draft, hien `Labels changed elsewhere` va action
  `Reload selection`;
- disable Apply cho toi khi reload, tranh replace-all ghi de thay doi cua user
  khac ma khong bao;
- khi popover dong/mo lai, baseline lay tu `task.tags` canonical moi nhat;
- event tu chinh mutation cua user khong hien conflict sau khi request thanh
  cong.

Khong dong popover hoac toast cho moi remote tag event. Task card, detail chip,
filter va manager tu render lai tu cache.

## 6. Trinh tu trien khai

### Phase 0 - Contract va regression guard

1. Chot event/ack types BE va FE.
2. Them fixture payload cho `TaskResponse` co tags va `TagResponse`.
3. Ghi lai baseline build/lint cua hai repo; tach loi ton tai san khoi loi moi.
4. Xac nhan deployment hien tai co mot hay nhieu BE instance.

Gate:

- Contract khong dung `any` cho bon event tag moi.
- Date type mirror dung: BE `Date`, FE `string`.
- Khong thay doi REST endpoint/request body hien tai.

### Phase 1 - BE board room va event publishing

1. Them board room helper, permission service va join/leave handler.
2. Them typed event envelope/service.
3. Them Prisma migration cho `tasks.tagVersion`; increment trong transaction
   tag relation va expose qua BE/FE task response.
4. Emit `task:tags_updated` sau replace/attach/detach.
5. Emit ba board tag catalog events sau create/update/delete.
6. Truyen `actorUserId` tu controller vao service.
7. Test join permission, failed mutation khong emit va successful mutation emit
   dung room/payload.

Gate:

- Hai socket co quyen cung join mot board va nhan event.
- Socket khong co `VIEW_TASK` nhan ack `FORBIDDEN` va khong nhan event.
- Event task co full `TaskResponse.tags` va `tagVersion` moi.
- Mutation loi `400/403/404` khong phat event.

### Phase 2 - FE board room va cache handlers

1. Them typed client contract.
2. Them board room registry/hook va rejoin lifecycle.
3. Mount board room theo route `DetailBoard`.
4. Them global tag handlers.
5. Refactor task snapshot helper de stale-safe, filter-aware va sorted.
6. Them reducer cho catalog create/update/delete.
7. Reconcile active queries sau reconnect.

Gate:

- Listener count khong tang sau open/close detail hoac doi board.
- React StrictMode khong double join/leak room.
- Socket echo + HTTP success khong duplicate task/tag.
- Task co the tu dong vao/ra query filter `ANY` va `ALL`.

### Phase 3 - Picker conflict va UI polish

1. Them baseline/draft conflict detection cho picker.
2. Dam bao task detail bridge nhan task cache moi.
3. Khong toast cho remote event thong thuong.
4. Hien connection/retry feedback chi khi join board that bai co y nghia.
5. Kiem tra mobile popover va manager dang mo khi tag bi rename/delete.

Gate:

- Remote update khong am tham ghi de draft local.
- Delete tag dang selected khong lam picker crash.
- Rename/recolor cap nhat card, detail, filter va manager.

### Phase 4 - Verification va rollout

1. Deploy BE truoc; client cu se bo qua event moi.
2. Sau khi BE board room san sang moi deploy FE goi `board:join`.
3. Test hai account va hai tab cung mot account.
4. Theo doi connect/join error va event publish failure.
5. Neu BE chay nhieu instance, them Socket.IO Redis adapter truoc khi xem
   realtime production la hoan tat.

Khong deploy FE board join truoc BE, vi ack se timeout va tao false error/retry.

## 7. Danh sach file du kien thay doi

### Backend

```text
Manage -Task/BE/src/modules/realtime/realtime.types.ts
Manage -Task/BE/src/modules/realtime/realtime-event.service.ts
Manage -Task/BE/src/modules/realtime/realtime-envelope.ts
Manage -Task/BE/src/modules/realtime/room-permission.service.ts
Manage -Task/BE/src/modules/realtime/board-room.socket.ts
Manage -Task/BE/src/modules/realtime/task-room.socket.ts
Manage -Task/BE/src/modules/realtime/socket.server.ts
Manage -Task/BE/src/modules/realtime/index.ts
Manage -Task/BE/prisma/schema.prisma
Manage -Task/BE/prisma/migrations/<timestamp>_add_task_tag_version/migration.sql
Manage -Task/BE/src/modules/tasks/tag/tag.controller.ts
Manage -Task/BE/src/modules/tasks/tag/tag.service.ts
Manage -Task/BE/src/modules/tasks/tag/tag.repository.ts
Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts
```

### Frontend

```text
FE/src/features/realtime/contracts/realtime-events.ts
FE/src/features/realtime/socket.ts
FE/src/features/realtime/rooms/board-room-registry.ts
FE/src/features/realtime/hooks/useBoardRoom.ts
FE/src/features/realtime/hooks/useTaskSocket.ts
FE/src/features/realtime/handlers/tag-event-handlers.ts
FE/src/features/tasks/types/index.ts
FE/src/features/tasks/utils/task-cache.ts
FE/src/features/tasks/utils/task-query-keys.ts
FE/src/features/tasks/hooks/useTaskTags.ts
FE/src/features/tags/utils/tag-query-keys.ts
FE/src/components/boards/detail-board.tsx
FE/src/components/tags/task-tags-picker.tsx
```

Neu refactor `RealtimeProvider` da duoc thuc hien truoc phase nay, dang ky tag
handlers tai provider thay vi tiep tuc mo rong `useGlobalRealtime()`.

## 8. Verification checklist

### Static checks

Trong `Manage -Task/BE`:

```bash
npx tsc --noEmit
```

Trong `FE`:

```bash
npm run build
npm run lint
```

Repo BE hien chua co test runner that (`npm test` dang la placeholder). Khi
implement nen them focused test setup cho realtime service/room handler, hoac
toi thieu mot integration script co cleanup ro rang thay vi coi manual test la
du.

### Integration matrix hai browser

| Case | Browser A | Browser B mong doi |
| --- | --- | --- |
| Replace tags | Apply `[A, B]` | Card/detail hien dung `[A, B]` mot lan |
| Clear tags | Apply `[]` | Tag bien mat, task roi filter tag |
| Attach tag | Gan A vao task dang khong match | Task xuat hien trong filter A |
| Detach tag | Go A | Task bien mat khoi filter A |
| ANY filter | Gan/go mot trong nhieu tag | Membership query dung |
| ALL filter | Gan tag con thieu | Task xuat hien khi du moi tag |
| Rename tag | Rename trong manager | Picker/filter/card/detail doi ten |
| Recolor tag | Doi color | Moi surface doi color |
| Delete tag | Delete tag dang duoc dung | Tag bien mat, task van con |
| Revive tag | Create lai ten da delete | Tag active xuat hien lai mot lan |
| Socket echo | A vua mutate va cung join room | A khong duplicate/flash rollback |
| Concurrent edit | A va B cung mo picker | Draft stale duoc canh bao, khong ghi de am tham |
| Reconnect | B offline, A thay doi, B online | Rejoin + refetch cho canonical state |
| Permission | User khong co VIEW_TASK join | Ack forbidden, khong lo event |
| Route change | B doi board | Leave board cu, chi nhan board moi |
| StrictMode | Dev mount/unmount/remount | Mot logical subscription, khong leak listener |

### Payload assertions

- `payload.data.taskId === payload.data.task.id`.
- `payload.data.boardId` khop board resolve tu task/list o BE.
- `task.tags` khong co duplicate va chi gom active tag/taskTag.
- `task.tagVersion` tang chinh xac mot lan sau replace/attach/detach thanh cong.
- Socket join ca task room va board room van chi nhan mot eventId.
- `board:tag_deleted.data.tag.deletedAt !== null`.
- FE nhan ISO string cho moi date.
- Event failed publish duoc log nhung HTTP response van thanh cong.

## 9. Acceptance criteria

- Board route join/leave `board:{boardId}` co permission va reconnect dung.
- Replace/attach/detach tag emit `task:tags_updated` sau commit toi ca task va
  board room.
- Create/update/delete tag emit event catalog toi board room.
- Tab khac cap nhat Task Pin ma khong reload, ke ca task truoc do khong co trong
  filtered cache.
- Task card, task detail, picker, filter va manager cung hoi tu ve du lieu
  canonical.
- Socket echo va reconnect khong tao duplicate, stale rollback hoac listener
  leak.
- Snapshot tag version cu khong ghi de tags version moi; snapshot cua event
  khac van cap nhat duoc cac field khong phai tag.
- Delete tag bulk effect duoc immediate patch va refetch reconcile.
- Draft picker dang sua khong bi remote event ghi de im lang.
- Build/typecheck/lint dat cho cac file thay doi; integration matrix hai browser
  dat.
- Neu production co nhieu BE process, event cross-instance da co adapter; neu
  chua co adapter thi phai ghi ro realtime chi duoc dam bao tren single instance.

## 10. Ngoai pham vi

- Chuyen mutation tag tu REST sang Socket.IO.
- Presence, typing indicator hoac collaborative cursor.
- Offline command queue.
- Conflict-free merge cho replace-all tags.
- Realtime cho toan bo task/list/assignment/status trong cung thay doi nay.
- Redis adapter/outbox neu deployment hien tai chi co mot BE instance; nhung
  phai lam truoc khi scale ngang.

## 11. Thu tu commit de review

1. `BE: add typed board room contract and authorization`
2. `BE: publish canonical task tag and board tag events`
3. `FE: add board room lifecycle and typed tag contracts`
4. `FE: apply realtime tag events to query caches`
5. `FE: handle remote changes in task tag picker`
6. `test: cover tag realtime rooms, reducers and reconnect`

Moi commit phai build/typecheck duoc. Khong tron UI redesign cua Tag Pin vao
commit realtime de viec review payload, room permission va cache behavior ro
rang.
