# Bug: Người thực hiện addMember không nhận realtime

## Triệu chứng (UPDATED)

Khi admin **add member** vào một **project**:

| Đối tượng | Realtime có chạy không? |
|---|---|
| Người được thêm (invitee) | ✅ Nhận realtime (qua `user:{inviteeId}` room) |
| Các member đang ở trong project | ✅ Nhận realtime (qua `project:{id}` room) |
| **Người mời (inviter/actor)** | **❌ KHÔNG nhận được updates trên UI** |

Lưu ý: socket event **có reach** actor's socket, nhưng **UI không update**.

---

## Root cause: `applyProjectMemberAdded` bỏ sót project list card khi `projectKeys.members` cache chưa tồn tại

### Phân tích flow

#### 1. BE emit — ĐÚNG, actor nằm trong recipient

`projects.service.ts:352-355`:
```ts
const recipientSet = new Set<string>([memberDto.userId]);          // invitee
const memberRecipients = await getActiveProjectMemberUserIds(projectId); // owner + ACTIVE members
for (const id of memberRecipients) recipientSet.add(id);
```

Actor (owner hoặc ACTIVE member) **luôn nằm trong** `recipientSet`.

`realtime-event.service.ts:772-776` dùng `chainRoomTargets` union:
```ts
const chain = chainRoomTargets(
  this.io.to(projectRoom(args.projectId)),  // project:{id}
  args.recipientUserIds,                    // user:{actorId}, user:{inviteeId}, ...
);
chain.emit("project:member_added", payload);
```

Socket.IO v4 `.to()` = **union**. Actor's socket nằm trong `user:{actorId}` room → **nhận được event**.

#### 2. FE handler — ĐÚNG logic, nhưng cache patch fail silently

`project-event-handlers.ts:130-142`:
```ts
const handleMemberAdded = (payload) => {
  if (!isProjectMemberAddedPayload(payload)) return;
  if (!rememberEvent(payload.eventId)) return;
  applyProjectMemberAdded(queryClient, payload.data.member);  // ← Gọi đây
  // ... special case cho invitee (applyProjectCreated)
};
```

`applyProjectMemberAdded` (`project-cache.ts:321-337`):
```ts
export function applyProjectMemberAdded(queryClient, member) {
  if (!member?.id || !member?.projectId || !member?.userId) return;
  if (member.status !== undefined && member.status !== "ACTIVE") return;
  const delta = applyMemberToMembersCache(queryClient, member);  // ←关键
  if (delta === 1) {
    adjustMembersTotal(queryClient, member.projectId, 1);
    upsertMemberInProjectLists(queryClient, member.projectId, toMemberUser(member));
  }
}
```

`applyMemberToMembersCache` (`project-cache.ts:146-172`):
```ts
function applyMemberToMembersCache(queryClient, member) {
  let delta = 0;
  queryClient.setQueryData(projectKeys.members(member.projectId), (old) => {
    if (!old) return old;  // ← Cache chưa tồn tại → return undefined, delta = 0
    // ... upsert logic
  });
  return delta;
}
```

#### 3. BUG: `projectKeys.members(projectId)` cache chưa tồn tại khi actor đang ở project list page

Khi actor đang ở **trang danh sách projects** (`view-main.tsx`), query đang active là `projectKeys.list(page, limit, name)` — **KHÔNG PHẢI** `projectKeys.members(projectId)`.

→ `applyMemberToMembersCache` gặp `old = undefined` → return 0 → `upsertMemberInProjectLists` **KHÔNG BAO GIỜ ĐƯỢC GỌI** → project card trên list page **KHÔNG UPDATE**.

#### 4. Cả socket handler VÀ mutation onSuccess đều có bug này

- Socket handler: `handleMemberAdded` → `applyProjectMemberAdded` → fail (như trên)
- Mutation `onSuccess`: `applyProjectMemberAdded(queryClient, raw)` → fail (cùng logic)

### Tại sao invitee và existing members lại OK?

| Đối tượng | Tại sao thấy update |
|---|---|
| **Invitee** | Socket handler có special case: `payload.data.member.userId === currentUserId` → `applyProjectCreated(queryClient, payload.data.project)` → `upsertProjectInLists` **LUÔN gọi được** vì list cache đang active |
| **Existing members (ở project detail page)** | Có `projectKeys.members(projectId)` cache đang active (đang xem members tab) → `applyMemberToMembersCache` return 1 → `upsertMemberInProjectLists` được gọi |
| **Actor (ở project list page)** | Không có `projectKeys.members(projectId)` cache → `applyMemberToMembersCache` return 0 → **`upsertMemberInProjectLists` không gọi** → card không update |

---

## Kill chain

```
Actor mở project list page
    → click "Add member"
    → HTTP POST thành công
    → Backend emit project:member_added
    → Actor's socket nhận event (qua user:{actorId} room) ✅
    → handleMemberAdded fires ✅
    → applyProjectMemberAdded called ✅
    → applyMemberToMembersCache:
        → queryClient.setQueryData(projectKeys.members(projectId), old => {
            if (!old) return old;  // ← projectKeys.members KHÔNG CÓ trong cache
          })                       //    vì actor đang ở list page, không phải detail page
        → delta = 0
    → if (delta === 1) ... → KHÔNG VÀO
    → upsertMemberInProjectLists KHÔNG GỌI
    → project card KHÔNG UPDATE ❌
```

---

## Cách sửa

### Sửa `applyProjectMemberAdded` — `project-cache.ts:321-337`

Cách đơn giản nhất: luôn gọi `upsertMemberInProjectLists` bất kể `delta`, vì nó đã handle upsert case (member đã có thì update, chưa có thì add):

```ts
export function applyProjectMemberAdded(
  queryClient: QueryClient,
  member: ProjectMemberResponse,
): void {
  if (!member?.id || !member?.projectId || !member?.userId) {
    if (import.meta.env.DEV) {
      console.warn("[realtime] applyProjectMemberAdded invalid member", member);
    }
    return;
  }
  if (member.status !== undefined && member.status !== "ACTIVE") return;
  const delta = applyMemberToMembersCache(queryClient, member);
  if (delta === 1) {
    adjustMembersTotal(queryClient, member.projectId, 1);
  }
  // LUÔN upsert vào list cache — kể cả khi members cache chưa tồn tại
  upsertMemberInProjectLists(queryClient, member.projectId, toMemberUser(member));
}
```

**Trade-off:** Khi member đã tồn tại (delta=0), `upsertMemberInProjectLists` vẫn会被 gọi → nó tìm member trong list, match thì update (merge), không match thì add. Vì member data giống nhau nên không có side effect, chỉ trigger 1 re-render vô hình.

### Hoặc: Check `projectKeys.members` cache có tồn tại không

```ts
const delta = applyMemberToMembersCache(queryClient, member);
if (delta === 1) {
  adjustMembersTotal(queryClient, member.projectId, 1);
  upsertMemberInProjectLists(queryClient, member.projectId, toMemberUser(member));
} else if (delta === 0) {
  // Có thể là "member đã có" HOẶC "members cache chưa tồn tại"
  const membersCache = queryClient.getQueryData(
    projectKeys.members(member.projectId)
  );
  if (!membersCache) {
    // Members cache chưa có → không biết member mới hay cũ → safer: upsert
    upsertMemberInProjectLists(queryClient, member.projectId, toMemberUser(member));
  }
}
```

---

## Files liên quan

| File | Vai trò |
|---|---|
| `FE/src/features/projects/utils/project-cache.ts:321-337` | **BUG HERE** — `applyProjectMemberAdded` |
| `FE/src/features/projects/utils/project-cache.ts:146-172` | `applyMemberToMembersCache` — return 0 khi cache undefined |
| `FE/src/features/projects/utils/project-cache.ts:174-205` | `upsertMemberInProjectLists` — upsert vào list cache |
| `FE/src/features/realtime/handlers/project-event-handlers.ts:130-142` | Socket handler gọi `applyProjectMemberAdded` |
| `FE/src/features/projects/hooks/useAddMemberProject.ts:37-52` | Mutation `onSuccess` cũng gọi `applyProjectMemberAdded` |
| `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts:772-776` | BE emit — ĐÚNG (có `chainRoomTargets`) |
| `Manage -Task/BE/src/modules/projects/projects.service.ts:352-355` | Actor trong `recipientSet` — ĐÚNG |
