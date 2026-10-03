# Implementation Plan - Fix Realtime Project Events Bug

> Bug review: `FE/.AI/review-code/realtime-project-events-bug.md`
> Baseline plan: `FE/.AI/FE/plan/realtime-project.md` (đã implement phần lớn, còn 3 fan-out gap + 3 FE gap)

## 1. Mục tiêu

Đồng bộ realtime cho project list page (`view-main.tsx`) và ensure user mới được add vào
project thấy project đó xuất hiện ngay trong list của họ. Hiện tại:

- `project:updated`/`project:deleted` chỉ emit vào `project:{projectId}` - main page (không
  join project room) bị miss.
- `project:member_added` chỉ emit vào `project:{projectId}` - user mới (chưa join project
  room) bị miss.
- Payload `member_added` không kèm `project` canonical - kể cả emit đúng phòng, FE vẫn
  không có data để patch project list.
- FE handler không navigate khi nhận `project:deleted` của project đang mở.
- FE không invalidate `projectKeys.lists()` khi socket reconnect - miss event trong lúc
  disconnect không được bù.

## 2. Cấu trúc bug

### Backend fan-out gap

| Event                   | Hiện tại                                 | Cần sửa                                                  |
| ----------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `project:updated`       | chỉ `project:{projectId}`                | + `user:{userId}` cho owner + mọi active members         |
| `project:deleted`       | chỉ `project:{projectId}`                | + `user:{userId}` cho owner + mọi active members (snapshot trước soft-delete) |
| `project:member_added`  | chỉ `project:{projectId}`                | + `user:{newMember.userId}` + payload có `project: ProjectResponseDto` |

### Frontend gap

| Vấn đề                                     | File                                               | Fix                                                              |
| ------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------- |
| `handleMemberAdded` không patch project list | `project-event-handlers.ts`                       | khi `member.userId === currentUserId` → `applyProjectCreated`   |
| Reconnect không invalidate list            | `useTaskSocket.ts` (`useGlobalRealtime`)           | `onConnect` → `invalidateQueries(projectKeys.lists())`          |
| `project:deleted` không navigate           | `project-event-handlers.ts` + `detail-project.tsx` | handler trigger navigate-to-main khi `useParams().projectId === deletedId` |

### Phụ thuộc

- `realtime-event.service.ts` cần thêm helper `emitToUserRooms(userIds[], event, payload)`
  vì cần fan-out tới nhiều user room cùng lúc (chain `to(...).to(...).emit`).
- `projects.repository.ts` cần method `getActiveProjectMemberUserIds(projectId)` để resolve
  recipients trước soft-delete.
- `realtime.types.ts` cần `ProjectMemberAddedPayload` mang thêm `project: ProjectResponseDto`.
- `realtime-event.service.ts` cần nhận thêm `recipientUserIds` cho `emitProjectUpdated` /
  `emitProjectDeleted` / `emitProjectMemberAdded` (tránh query DB trong publisher).

## 3. Thay đổi Backend

### 3.1 `projects.repository.ts`

Thêm method:

```ts
async getActiveProjectMemberUserIds(projectId: string): Promise<string[]> {
  const rows = await this.prisma.projectMembers.findMany({
    where: { projectId, status: ACTIVE, deletedAt: null },
    select: { userId: true },
  });
  // owner không qua projectMembers (admin role vẫn ACTIVE trong repo, nhưng để chắc
  // include owner luôn).
  const ownerRows = await this.prisma.projects.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { userId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) ids.add(row.userId);
  if (ownerRows?.userId) ids.add(ownerRows.userId);
  return Array.from(ids);
}
```

Lý do BE không nên query recipients bên trong publisher: service/repository đã authorized,
flow data/test rõ ràng. Plan ban đầu đã nói điều này.

### 3.2 `projects.service.ts`

Sau commit thành công, snapshot recipients trước rồi truyền vào publisher:

```ts
// updateProject
const recipients = await this.projectsRepository.getActiveProjectMemberUserIds(id);
this.realtime.emitProjectUpdated({ projectId, project: projectDto, actorId: userId, recipientUserIds: recipients });

// deleteProject - PHẢI snapshot trước soft-delete vì sau commit query sẽ trả INACTIVE/deleted
const recipients = await this.projectsRepository.getActiveProjectMemberUserIds(id);
await this.projectsRepository.deleteProject({ id, userId });
this.realtime.emitProjectDeleted({ ..., recipientUserIds: recipients });

// addMember - truyền thêm projectDto (đã có sẵn) + recipientUserIds của các user có access
// (để user hiện tại và tất cả member ACTIVE đều có thể patch nếu cache có data)
const memberRecipients = await this.projectsRepository.getActiveProjectMemberUserIds(projectId);
this.realtime.emitProjectMemberAdded({
  projectId,
  project: projectDto,            // mới - thêm vào payload
  member: memberDto,
  actorId: actorUserId ?? null,
  recipientUserIds: [memberDto.userId, ...memberRecipients], // user mới + member hiện tại
});
```

Lưu ý: service cần truyền `actorId` cho cả owner cập nhật (đã có trong các method).

### 3.3 `realtime.types.ts`

Sửa `ProjectMemberAddedPayload`:

```ts
export type ProjectMemberAddedPayload = RealtimeEnvelope<{
  projectId: string;
  project: ProjectResponseDto;             // mới - canonical project cho FE
  member: ProjectMemberResponseDto;
}>;
```

### 3.4 `realtime-event.service.ts`

Mở rộng 3 method với `recipientUserIds?: string[]`:

```ts
emitProjectUpdated(args: {
  projectId: string;
  project: ProjectResponseDto;
  actorId?: string | null;
  recipientUserIds?: string[];  // mới
}): void {
  const payload = createRealtimeEnvelope({ actorId: args.actorId, data: { project: args.project } });
  if (!this.io) return;
  try {
    let emitter = this.io.to(projectRoom(args.projectId));
    for (const userId of args.recipientUserIds ?? []) {
      emitter = emitter.to(userRoom(userId));
    }
    emitter.emit("project:updated", payload);
  } catch (error) { ... }
}

emitProjectDeleted(args: {
  projectId: string;
  project: ProjectResponseDto;
  actorId?: string | null;
  recipientUserIds?: string[];
}): void { ... chain tương tự ... }

emitProjectMemberAdded(args: {
  projectId: string;
  project: ProjectResponseDto;   // mới
  member: ProjectMemberResponseDto;
  actorId?: string | null;
  recipientUserIds?: string[];   // mới
}): void { ... }
```

Socket.IO chain `.to(a).to(b).emit(name, payload)` đảm bảo một socket thuộc cả `a` và `b`
chỉ nhận một lần. Không cần dedupe phía publisher.

Không query recipients bên trong publisher - service resolve rồi truyền vào.

### 3.5 Không đổi

- `socket.server.ts` (user room auto-join đã đúng).
- `project-room.socket.ts` (join/leave handlers đã đúng).
- `room-permission.service.ts` (authorizeProject đã có).
- Controller layer (thin pass-through, không đổi).
- HTTP API contract (không breaking).

## 4. Thay đổi Frontend

### 4.1 `realtime-events.ts`

Mirror BE: thêm `project: ProjectResponse` vào `ProjectMemberAddedPayload`.

```ts
export type ProjectMemberAddedPayload = RealtimeEnvelope<{
  projectId: string;
  project: ProjectResponse;     // mới
  member: ProjectMemberResponse;
}>;
```

### 4.2 `project-event-handlers.ts`

Sửa 3 handler:

1. `handleMemberAdded`: nếu `payload.data.member.userId === currentUserId`, gọi thêm
   `applyProjectCreated(queryClient, payload.data.project)` sau khi
   `applyProjectMemberAdded` chạy.

   Để biết current user id, ta lấy từ `socket.auth?.token` (đã decode sẵn) hoặc
   `socket.data.userId`. Socket hiện tại lưu userId qua socket middleware
   (`socket.data.user.id`). Tuy nhiên handler hiện chỉ nhận `socket: TypedSocket` -
   TypedSocket type chưa expose `data`. Cách đơn giản: tạo `getCurrentUserId(socket)`
   helper decode JWT payload base64 (signature không cần verify vì server đã verify khi
   auth). Hoặc dùng queryClient cache `["auth", "user"]` nếu có. Đề xuất: thêm helper
   nhỏ `getCurrentUserIdFromSocket(socket)` đọc `socket.auth?.token` và parse payload.

2. `handleDeleted`: nếu `payload.data.projectId` trùng với route hiện tại, navigate về
   main. Handler không có router context - phải delegate. Hai lựa chọn:
   - **(a)** Thêm module-level subscriber (`onProjectDeletedNavigate`) mà `detail-project.tsx`
     đăng ký khi mount.
   - **(b)** Đơn giản hơn: detail page subscribe `projectKeys.detail(projectId)` rồi khi
     cache bị remove (do `applyProjectDeleted` chạy) → navigate.

   Đề xuất: dùng (b) - `useProjectDeletedNavigation(projectId)` hook ở `detail-project.tsx`
   subscribe `projectKeys.detail(projectId)` qua `useQuery`, khi `data === undefined` và
   `isFetched === true` thì navigate. Đơn giản, không cần refactor handler.

3. `handleDeleted` xử lý cả `applyProjectDeleted` (đã có sẵn - remove khỏi list + clear
   detail cache) → side effect navigate sẽ tự chạy.

### 4.3 `project-cache.ts`

Giữ nguyên reducer. Thêm helper internal:

```ts
/**
 * Khi BE fan-out project:member_added tới user:{newMember.userId}, FE cần apply
 * project vào list cache (giống như project:created). Hàm này chỉ patch list, không
 * touch detail (vì detail cache có thể chưa có cho user mới).
 */
export function applyProjectAddedViaMemberEvent(
  queryClient: QueryClient,
  project: ProjectResponse,
): void {
  applyProjectCreated(queryClient, project);
}
```

Lý do tách hàm: tránh duplicate logic; reducer chính `applyProjectCreated` đã đúng.

### 4.4 `useTaskSocket.ts` (`useGlobalRealtime`)

Thêm vào `onConnect`:

```ts
const onConnect = (): void => {
  rejoinTaskRooms(socket);
  rejoinBoardRooms(socket);
  rejoinProjectRooms(socket);
  // Bù cache project list cho khoảng disconnect (rejoin room không replay event đã
  // miss). Member count và detail cache sẽ được refetch khi user mở detail (qua
  // useProjectRoom reconcile). List cần được bu ngay vì main page không có cơ chế
  // join project room per-card.
  void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
};
```

Import thêm `projectKeys` từ `@/features/projects/utils/project-query-keys`.

### 4.5 `detail-project.tsx`

Thêm hook subscribe `projectKeys.detail(projectId)`. Khi detail cache trống sau khi đã
fetched (tức là BE đã soft-delete), navigate về main page.

```ts
const navigate = useNavigate();
const projectDetailQuery = useProject(projectId ?? "");
useEffect(() => {
  if (
    projectId &&
    projectDetailQuery.isFetched &&
    !projectDetailQuery.isLoading &&
    !projectDetailQuery.data
  ) {
    toast.info("Project no longer available");
    navigate(`/${APP_ROUTES.MAIN ?? ""}`, { replace: true });
  }
}, [projectId, projectDetailQuery.isFetched, projectDetailQuery.data, navigate]);
```

Lưu ý: `useProject` đã tồn tại. Đây chỉ là composition effect, không refactor handler.

## 5. File cần sửa / tạo

### Backend

Sửa:

- `Manage -Task/BE/src/modules/projects/projects.repository.ts` - thêm
  `getActiveProjectMemberUserIds`.
- `Manage -Task/BE/src/modules/projects/projects.service.ts` - resolve recipients và
  truyền vào 3 publisher + thêm `projectDto` vào call `emitProjectMemberAdded`.
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts` - mở rộng 3 method
  với `recipientUserIds` + payload `project` cho `emitProjectMemberAdded`.
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts` - thêm `project: ProjectResponseDto`
  vào `ProjectMemberAddedPayload`.

Không tạo file mới ở BE.

### Frontend

Sửa:

- `FE/src/features/realtime/contracts/realtime-events.ts` - thêm `project: ProjectResponse`
  vào `ProjectMemberAddedPayload`.
- `FE/src/features/realtime/handlers/project-event-handlers.ts` - `handleMemberAdded` gọi
  `applyProjectCreated` khi `member.userId === currentUserId`.
- `FE/src/features/projects/utils/project-cache.ts` - (không đổi, dùng lại
  `applyProjectCreated`).
- `FE/src/features/realtime/hooks/useTaskSocket.ts` - `onConnect` invalidate
  `projectKeys.lists()`.
- `FE/src/components/projects/detail-project.tsx` - thêm effect navigate khi detail cache
  trống.

Không tạo file mới ở FE.

## 6. Thứ tự triển khai

1. **BE - Type & Publisher**: sửa `realtime.types.ts` và `realtime-event.service.ts`
   (compile pass, không breaking).
2. **BE - Repository**: thêm `getActiveProjectMemberUserIds` vào `projects.repository.ts`.
3. **BE - Service**: sửa 3 mutation trong `projects.service.ts` resolve recipients + truyền
   payload mới.
4. **FE - Contract**: mirror `project` trong `ProjectMemberAddedPayload`.
5. **FE - Handler**: sửa `handleMemberAdded` (current user check + apply created).
6. **FE - Reconnect**: thêm invalidate `projectKeys.lists()` trong `onConnect`.
7. **FE - Navigation**: thêm effect ở `detail-project.tsx` để navigate khi detail bị xóa.
8. **Test thủ công**: 2 browser A & B, 6 case ở bug report.

## 7. Tiêu chí hoàn thành (Definition of Done)

- [ ] `project:updated` emit tới `user:{userId}` cho owner + active members (BE).
- [ ] `project:deleted` snapshot recipients trước soft-delete rồi emit tới `user:{userId}`
      (BE).
- [ ] `project:member_added` payload có `project: ProjectResponseDto` và emit tới
      `user:{newMember.userId}` + project room (BE).
- [ ] FE handler `handleMemberAdded` patch project list khi người nhận là current user (FE).
- [ ] Reconnect invalidate `projectKeys.lists()` để bù miss event (FE).
- [ ] User mở project detail khi project bị delete → navigate về main page (FE).
- [ ] BE typecheck pass; FE lint/typecheck pass.
- [ ] 2 browser A/B test pass 6 case trong bug report.

## 8. Không thay đổi

- Không thêm event `project:access_granted` / `project:access_revoked` (sẽ làm ở phase
  sau khi có remove-member/disable-member).
- Không map mỗi project card thành `useProjectRoom` (plan đã nói không nên).
- Không query recipients trong publisher (chống hidden query).
- Không thêm toast cho socket event (giữ rule từ plan realtime-project.md).
- Không refactor `ProjectResponseDto` (thiếu `members[]` là bug riêng, không nằm trong
  bug review này).