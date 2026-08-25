# Work Log: Realtime Board

**Ngày:** Saturday Aug 22, 2026  
**Feature:** Realtime cho Board — CRUD board + CRUD board member + cascade project member  
**Plan:** `FE/.AI/FE/plan/realtime-board.md`  
**Scope:** Chỉ thực hiện phần Frontend theo yêu cầu. BE plan đã có sẵn và chưa được implement trong đợt này.

---

## Trạng thái: ✅ Hoàn thành (FE side)

> Backend (Phase 0/1/2/3/4 BE) chưa được thực hiện trong đợt này. Toàn bộ FE đã sẵn sàng để mirror BE contract ngay khi BE được merge — `boardApi.removeMember` và `boardApi.updateMemberRole` đã khai báo sẵn, các reducer `applyBoard*` đã có sẵn để xử lý payload envelope.

---

## Tóm tắt thay đổi

### Phase 0 — Mirror contract
- Mở rộng `ServerToClientEvents` với 6 event: `board:created`, `board:updated`, `board:deleted`, `board:member_added`, `board:member_removed`, `board:member_role_updated`.
- Thêm 6 payload `Board*` tương ứng, bọc `RealtimeEnvelope<T>` với `eventId`/`occurredAt`/`actorId`/`data`.

### Phase 2 — CRUD board
- Tạo `boardKeys` factory thay thế toàn bộ string inline trong feature board.
- Tạo bộ reducer `applyBoardCreated/Updated/Deleted` dùng chung cho HTTP mutation và socket event. Reducer tuân thủ:
  - Validate `boardId`/`projectId` không rỗng và khớp payload.
  - Idempotent: cùng `id` chỉ merge, không append.
  - `board:created` chỉ chèn vào page 1 còn trống chỗ (theo `itemsPerPage`) và match filter `name` (cả name và description).
  - `board:deleted` loại khỏi mọi list, remove detail/members, invalidate `listKeys.boardPrefix` và task lists của các list thuộc board.
- Tạo `registerBoardEventHandlers` (validate + `rememberEvent` + dispatch + cleanup `socket.off`) và đăng ký vào `useGlobalRealtime()` cùng các handler đã có.
- Cập nhật `useCreateBoard` / `useUpdateBoard` / `useDeleteBoard` dùng reducer chung + `boardKeys` factory.
- Cập nhật `useBoards` / `useBoard` dùng `boardKeys.list(...)` và `boardKeys.detail(...)`.

### Phase 3 — CRUD board member
- Cập nhật `useAddMemberBoard` dùng `applyBoardMemberAdded` + `boardKeys.members(boardId)` + `boardKeys.membersByProject(projectId)` + `boardKeys.detail(boardId)`.
- Tạo mới `useRemoveMemberBoard` (theo §5.7 BE) — dùng `applyBoardMemberRemoved`, fallback invalidate khi server không trả DTO.
- Tạo mới `useUpdateBoardMemberRole` (theo §5.6 BE) — dùng `applyBoardMemberRoleUpdated`, endpoint dự kiến `PATCH /board/:boardId/members/:userId/role`.
- Cập nhật `useBoardMembers` / `useBoardsMembers` dùng `boardKeys.members(boardId)` thay vì string inline.
- Bổ sung 2 API method tương ứng (`boardApi.removeMember`, `boardApi.updateMemberRole`) trong `board-api.ts`.

### Phase 6 — Reconcile trên reconnect
- `useBoardRoom` reconcile handler giờ invalidate cả `boardKeys.detail(boardId)` và `boardKeys.members(boardId)` cùng với tag/list/task đã có.
- `useProjectRoom` reconcile handler chuyển sang dùng `boardKeys.lists()` và `boardKeys.membersByProject(projectId)` thay vì string inline.

### Phase 7 — Hardening
- `npx tsc --noEmit -p tsconfig.app.json` pass sạch.
- `npx eslint src/features/boards src/features/realtime` pass sạch.
- `npm run build` pass — chỉ warning chunk size > 500kB (không liên quan tới thay đổi).

---

## Definition of Done Checklist (FE side)

- [x] FE có typed contract cho 6 event `board:*` mirror BE plan §4.
- [x] `boardKeys` factory thay thế toàn bộ string inline trong feature board.
- [x] `applyBoardCreated/Updated/Deleted` đúng filter/page và đúng `projectId`.
- [x] `applyBoardMemberAdded/Removed/RoleUpdated` đúng query `boardKeys.members(boardId)`.
- [x] HTTP mutation onSuccess dùng chung reducer với socket event.
- [x] `useGlobalRealtime()` đăng ký `registerBoardEventHandlers` cùng các handler khác — owner duy nhất của listener.
- [x] Reconnect invalidate `boardKeys.detail` + `boardKeys.members` + `boardKeys.lists` + list/task của board.
- [x] Không toast cho socket event (chỉ HTTP mutation toast).
- [x] FE typecheck + lint + build pass.

---

## Files Created (FE)
```
FE/src/features/boards/utils/board-query-keys.ts
FE/src/features/boards/utils/board-cache.ts
FE/src/features/realtime/handlers/board-event-handlers.ts
FE/src/features/boards/hooks/useRemoveMemberBoard.ts
FE/src/features/boards/hooks/useUpdateBoardMemberRole.ts
```

## Files Modified (FE)
```
FE/src/features/realtime/contracts/realtime-events.ts
FE/src/features/realtime/hooks/useTaskSocket.ts
FE/src/features/realtime/hooks/useBoardRoom.ts
FE/src/features/realtime/hooks/useProjectRoom.ts
FE/src/features/boards/api/board-api.ts
FE/src/features/boards/hooks/useBoards.ts
FE/src/features/boards/hooks/useBoard.ts
FE/src/features/boards/hooks/useCreateBoard.ts
FE/src/features/boards/hooks/useUpdateBoard.ts
FE/src/features/boards/hooks/useDeleteBoard.ts
FE/src/features/boards/hooks/useAddMemberBoard.ts
FE/src/features/boards/hooks/useBoardMembers.ts
FE/src/features/boards/hooks/useBoardsMembers.ts
```

---

## Outstanding (BE)

Theo plan §5 và §10:
- `board:created` / `board:updated` / `board:deleted` event + `emitBoardCreated/Updated/Deleted` trong `realtime-event.service.ts`.
- `board:member_added/removed/role_updated` event + `emitBoardMember*` tương ứng.
- `BoardController.createBoard` (delegate từ `POST /project/:projectId/boards`) gọi `emitBoardCreated` sau commit.
- `BoardService.updateBoard/deleteBoard` gọi `emitBoardUpdated/Deleted` sau commit.
- `BoardService.addMemberToBoard` gọi `emitBoardMemberAdded` sau commit.
- `BoardMemberRepository` bổ sung `updateBoardMemberRole` và `removeBoardMember` (§5.6, §5.7).
- BE endpoint `DELETE /board/:boardId/members/:userId` và `PATCH /board/:boardId/members/:userId/role`.
- Cascade `ProjectMemberRepo.removeProjectMember` trả danh sách `(boardId, boardMemberId, userId)`; `ProjectsService.removeProjectMember` gọi `emitBoardMemberRemoved` cho từng cặp (§5.8).
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts` thêm 6 payload `Board*` và 6 event `board:*` vào `ServerToClientEvents`.

Khi BE đã sẵn sàng, FE không cần đổi thêm — `applyBoard*` và `registerBoardEventHandlers` đã đợi sẵn contract.

---

## Bugfix follow-up (2026-08-22)

### Vấn đề
Tạo board mới qua dialog → board không hiển thị ngay ở trang detail project; phải refresh page mới hiện. Repro: mở trang `/projects/:projectId` ở page 1, tạo board mới.

### Nguyên nhân gốc
`boardKeys` factory mismatch shape giữa `lists()` và `list(...)`:
```ts
// trước — SAI
lists: () => ["boards", "list"] as const,
list:  (projectId, page, limit, name?) =>
  ["boards", projectId, page, limit, name ?? null] as const,  // KHÔNG có "list"
// key thực tế: ["boards", <uuid>, 1, 12, null]
```
Trong khi `findAll({ queryKey: ["boards", "list"] })` (gọi bởi `upsertBoardInLists` / `removeBoardFromLists` / `useCreateBoard`'s invalidate) yêu cầu key có prefix `["boards", "list"]`. Vì key thực tế bắt đầu bằng `["boards", <uuid>]`, `findAll` không khớp bất kỳ query nào → reducer chạy vòng lặp rỗng → board mới không được insert vào cache. `useCreateBoard`'s `invalidateQueries` cũng không có query nào để refetch.

Hệ quả: UI không nhận data mới, user phải refresh page để trigger `useQuery` re-mount và fetch lại.

### Fix
1. `boardKeys.list(...)` thêm segment `"list"` để prefix `["boards", "list"]` khớp với key thực tế.
2. `upsertBoardInLists` chỉ chèn board mới vào query có `page === 1`; các query page > 1 bỏ qua (BE sắp xếp theo `createdAt desc`, board mới luôn thuộc page 1).
3. `useCreateBoard.onSuccess` invalidate `boardKeys.lists()` + `boardKeys.membersByProject(projectId)` để cover trường hợp page 1 đầy hoặc user đang ở page khác (refetch sẽ tự kéo board mới về).
4. Cập nhật index đọc `filterName` trong `listMatchesNameFilter` từ `queryKey[4]` → `queryKey[5]` cho khớp shape mới.

### Files sửa (bugfix)
- `FE/src/features/boards/utils/board-query-keys.ts` — `list(...)` thêm segment `"list"`.
- `FE/src/features/boards/utils/board-cache.ts` — `upsertBoardInLists` filter page === 1; index filter name cập nhật.
- `FE/src/features/boards/hooks/useCreateBoard.ts` — thêm invalidate `boardKeys.membersByProject` + comment giải thích vì sao invalidate vẫn cần.

### Verify
- `npx tsc --noEmit -p tsconfig.app.json` pass.
- `npx eslint src/features/boards src/features/realtime` pass.

---

## Review follow-up (2026-08-22)

Review file: `FE/.AI/review-code/board-review.md`. Phát hiện 2 vấn đề:

### [P1] Query key prefix của danh sách board không khớp — đã fix ở bugfix trước
Mô tả chi tiết xem mục "Bugfix follow-up (2026-08-22)" ở trên. Verify sau fix:

- `boardKeys.lists()` trả `["boards", "list"]`.
- `boardKeys.list(...)` trả `["boards", "list", projectId, page, limit, name]`.
- `queryClient.getQueryCache().findAll({ queryKey: boardKeys.lists() })` giờ match được mọi query `list(...)`.
- `invalidateQueries({ queryKey: boardKeys.lists() })` ở `useCreateBoard` / `useDeleteBoard` / `useProjectRoom` hoạt động đúng.
- `upsertBoardInLists` / `removeBoardFromLists` thấy query list và patch cache.
- `useBoardRoom` reconcile đã cover cả `boardKeys.detail` + `boardKeys.members` + `boardKeys.lists`.

### [P2] Socket event có thể tạo cache thành viên không đầy đủ — fix mới
**Vị trí:** `src/features/boards/utils/board-cache.ts` — `mutateMembersCache`.

**Vấn đề:**
```ts
// TRƯỚC — SAI
queryClient.setQueryData(queryKey, (old) => {
  const current = old ?? [];             // ← fallback tạo cache rỗng
  const next = mutate(current);
  return next === current ? old : next;
});
```
Nếu `board:member_added` đến trước khi `useBoardMembers` fetch lần đầu, cache `old === undefined` → `current = []` → `next = [member]` → cache được tạo ra với chỉ 1 phần tử. Do `useBoardMembers` có `staleTime: 60_000`, React Query sẽ coi cache này là "fresh" và không gọi API khi user mở board. UI hiển thị thiếu thành viên.

**Fix:**
Đổi logic `mutateMembersCache` thành 2 nhánh:

```ts
// SAU — đúng
const old = queryClient.getQueryData<BoardMembersCache>(queryKey);

if (old === undefined) {
  // Cache chưa có — KHÔNG tạo cache rỗng/sai. Invalidate để lần mở
  // board tiếp theo (khi useBoardMembers subscribe) sẽ gọi API lấy
  // danh sách đầy đủ.
  void queryClient.invalidateQueries({ queryKey });
  return;
}

queryClient.setQueryData<BoardMembersCache>(queryKey, (currentOld) => {
  const current = currentOld ?? [];
  const next = mutate(current);
  return next === current ? currentOld : next;
});
```

3 reducer `applyBoardMemberAdded/Removed/RoleUpdated` không cần đổi vì fix được gói gọn trong `mutateMembersCache`.

**Tại sao phân biệt `old === undefined` vs `old === []`:**
- `undefined` → "chưa fetch lần nào" — ta không biết gì về server state, không patch.
- `[]` → "đã fetch, server trả về rỗng" — ta có thể patch (vd. add một member vào `[]` thành `[member]` là hành vi đúng).

**Ảnh hưởng tới flow hiện tại:**
- `useAddMemberBoard.onSuccess` gọi `applyBoardMemberAdded` → nếu user chưa từng mở board detail (cache members undefined), thay vì patch ta invalidate. User mở board sau → `useBoardMembers` thấy cache stale → fetch API → hiển thị đầy đủ. Đây là đúng mong đợi.
- Tương tự cho `useRemoveMemberBoard` và `useUpdateBoardMemberRole`.

**Verify:**
- `npx tsc --noEmit -p tsconfig.app.json` pass.
- `npx eslint src/features/boards src/features/realtime` pass.

**Test case bổ sung (cần viết sau nếu thêm test runner):**
- Khi chưa có member cache, nhận `board:member_added` không tạo cache mới; query state vẫn `undefined`.
- Khi đã có member cache (kể cả `[]`), event add/update/remove vẫn patch đúng.
- Sau event đến trước lần fetch đầu tiên, mở board phải gọi API và hiển thị đầy đủ thành viên.

---

## BE bugfix follow-up (2026-08-22)

### Vấn đề
```
UNPROCESSABLE_ENTITY: description Too small: expected string to have >=1 characters
  at new Exception (.../@tsed/exceptions/.../OptionalException.js)
  at validationRequest.middleware.ts:36:10
```
Mở dialog edit board, bỏ trống description, bấm Save → 422 từ BE.

### Nguyên nhân gốc
`updateBoardRequestBodySchema` ở BE đang strict cả `name` và `description` với `min(1)`:
```ts
// trước — SAI
export const updateBoardRequestBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(500),  // ← ép >= 1 ký tự
}).strict();
```
Form FE label ghi rõ "Optional" cho description; form `useForm<BoardRequest>` mặc định `description: ""` khi board chưa có description; FE gửi `description: ""` → BE trim → `""` không thoả `min(1)` → 422.

Lưu ý: form `CreateBoard` cho phép `description: z.string().max(500)` (không `min(1)`), tức là BE đã không nhất quán giữa 2 endpoint.

### Fix
Đổi `updateBoardRequestBodySchema` để `description` optional và có thể rỗng, đồng thời default `""` để service nhận được string thay vì undefined:
```ts
// sau — đúng
export const updateBoardRequestBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).optional().default(""),
}).strict();
```
- `name` vẫn bắt buộc `min(1)` — board không thể không có tên.
- `description` tự trim; rỗng vẫn pass; quá 500 ký tự vẫn fail. Prisma bỏ qua field `""` không phải vấn đề — DB schema `description: String` (không optional) chấp nhận `""`.
- `.optional().default("")` để service/controller không phải handle `undefined` riêng — luôn nhận string khi truyền xuống Prisma.

### Files sửa
- `Manage -Task/BE/src/modules/board/dtos/requests/updateBoard.req.ts`

### Verify
- `npx tsc --noEmit -p tsconfig.json` trong `Manage -Task/BE/` pass.
- (Không có FE thay đổi — form `updateBoard-project.tsx` đã pass `values` từ `react-hook-form` qua hook `useUpdateBoard`, BE tự xử lý trim/default.)

---

## BE Realtime follow-up (2026-08-22)

### Vấn đề
User test: tạo / sửa / xoá board qua HTTP mutation, board CRUD hoạt động nhưng realtime không update — khi mở 2 tab và thao tác ở tab 1, tab 2 không thấy thay đổi cho tới khi refresh.

### Nguyên nhân gốc
FE đã có đầy đủ plumbing cho 6 event `board:created/updated/deleted/member_added/member_removed/member_role_updated`:
- Payload types trong `FE/src/features/realtime/contracts/realtime-events.ts`.
- `registerBoardEventHandlers` đăng ký `socket.on(...)` ở `useTaskSocket.ts`.
- Reducer `applyBoardCreated/Updated/Deleted` + `applyBoardMemberAdded/Removed/RoleUpdated` trong `board-cache.ts`.

Nhưng phía BE không emit bất kỳ event nào trong nhóm này. Grep `emitBoardCreated|board:created` trong `Manage -Task/BE/src` không có match. Work-log trước cũng đã ghi: "BE plan đã có sẵn và chưa được implement trong đợt này".

→ FE socket listener không nhận được event nào → reducer không chạy → realtime không hoạt động.

### Fix
Bổ sung phần BE còn thiếu để khớp với FE contract:

**1. `realtime.types.ts`** — thêm 6 payload types và 6 events vào `ServerToClientEvents`:
- `BoardCreatedPayload` / `BoardUpdatedPayload` / `BoardDeletedPayload`
- `BoardMemberAddedPayload` / `BoardMemberRemovedPayload` / `BoardMemberRoleUpdatedPayload`
- 6 event tương ứng trong `ServerToClientEvents`.

**2. `realtime-event.service.ts`** — thêm 6 method emit tương ứng (`emitBoardCreated/Updated/Deleted/MemberAdded/MemberRemoved/MemberRoleUpdated`). Mỗi method dùng pattern giống các emitter khác:
- `createRealtimeEnvelope({actorId, data})` để build payload có `eventId/occurredAt/actorId/data`.
- Phát tới `projectRoom(projectId)` (cho grid view) + `boardRoom(boardId)` (cho board đang mở).
- `try/catch` + `console.error` khi publish fail (cùng pattern với `emitProject*` / `emitBoardListsReordered`).

**3. `boardMember.repository.ts`** — thêm `getActiveBoardMemberWithUser(boardId, userId)`:
- Helper lấy 1 ACTIVE member kèm user detail, dùng để build payload `BoardMemberResponseDto` ngay sau `addMemberOfBoard` mà không phải query lại toàn list.

**4. `board.service.ts`** — gọi emit sau mỗi mutation:
- `createBoard`: emit `board:created` tới `projectRoom(projectId)` với actorId = `userId` (người tạo cũng là board admin đầu tiên).
- `updateBoard`: emit `board:updated` tới cả `projectRoom(projectId)` + `boardRoom(boardId)` với actorId = `updateBoard.userId`.
- `deleteBoard`: emit `board:deleted` tới cả `projectRoom(projectId)` + `boardRoom(boardId)` với actorId = `deleteBoard.userId`. Board đã bị soft-delete (status=INACTIVE) nhưng vẫn gửi kèm để FE có đầy đủ thông tin.
- `addMemberToBoard`: query lại member vừa tạo qua `getActiveBoardMemberWithUser`, build `BoardMemberResponseDto`, emit `board:member_added` tới cả `projectRoom(projectId)` + `boardRoom(boardId)` với actorId = actor gọi request (tách khỏi user được add).

**5. `board.controller.ts`** — `addMemberToBoard` controller truyền `actorId` (từ `req.user.id`) xuống service để set `actorId` của event. Các controller `createBoard`/`updateBoard`/`deleteBoard` đã có `req.user.id` sẵn từ trước — `createBoard` pass `userId: user.id` (cũng chính là actor), `updateBoard`/`deleteBoard` pass `userId: user.id` vào DTO → service dùng làm `actorId`.

### Files sửa
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts`
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts`
- `Manage -Task/BE/src/modules/board/board.service.ts`
- `Manage -Task/BE/src/modules/board/board.controller.ts`
- `Manage -Task/BE/src/modules/boardMember/boardMember.repository.ts`

### Verify
- `npx tsc --noEmit -p tsconfig.json` trong `Manage -Task/BE/` pass.
- End-to-end: 2 tab cùng mở `/projects/:id`, tab A tạo board → tab B thấy board mới xuất hiện trong grid ngay lập tức (không cần refresh). Update/Delete và addMember tương tự.

### Outstanding (FE không cần đổi)
- 2 event `board:member_removed` và `board:member_role_updated` chưa có service tương ứng ở BE (`useRemoveMemberBoard` / `useUpdateBoardMemberRole` chưa có route BE gọi). Khi BE bổ sung service cho 2 endpoint này, gọi `emitBoardMemberRemoved` / `emitBoardMemberRoleUpdated` tương tự pattern `addMemberToBoard` là xong — FE listener đã đăng ký sẵn.

---

## Review board bổ sung (2026-08-22 — đọc lại `board-review.md`)

File `FE/.AI/review-code/board-review.md` có thêm 2 vấn đề P2 dưới tiêu đề "Review bổ sung: stale cache khi cập nhật board và reconnect". Cả 2 đều liên quan đến list cache và member query. Đã fix.

### [P2] Cập nhật các board đã cache ở trang lớn hơn 1

**Vấn đề:**
Helper `upsertBoardInLists` cũ dùng chung cho cả `applyBoardCreated` và `applyBoardUpdated`. Nó có early return `if (readPageFromQueryKey(key) !== 1) return old;` để bỏ qua mọi list query page > 1. Lý do ban đầu: với create, board mới sort theo `createdAt desc` chỉ vào page 1.

Nhưng với **update**, board vẫn nằm ở trang hiện tại của nó (có thể > 1). Code lại bỏ qua → board ở trang > 1 không được update khi user edit hoặc nhận event `board:updated`. Grid hiển thị dữ liệu cũ cho tới khi có refetch khác.

**Fix:**
Tách `upsertBoardInLists` thành 2 helper riêng biệt với semantic rõ ràng:

- `insertBoardToFirstList(queryClient, board)` — dùng cho create / `board:created`: giữ early return `page !== 1`, filter check, itemsPerPage limit. Thêm guard `old.data.some((b) => b.id === board.id) return old` để tránh duplicate khi cùng event gửi 2 lần.
- `updateBoardInLists(queryClient, board)` — dùng cho update / `board:updated`: **không giới hạn page**, duyệt mọi list query đã cache. 3 trường hợp:
  - Row có trong list và match filter → replace row.
  - Row có trong list nhưng KHÔNG match filter (vd. user đổi name) → loại bỏ row, giảm totalItems.
  - Row chưa có trong list cache (vd. page này fetch trước khi board tồn tại) → bỏ qua; caller phải `invalidateQueries` để refetch.

`applyBoardCreated` gọi `insertBoardToFirstList`; `applyBoardUpdated` gọi `updateBoardInLists`.

### [P2] Reconnect đang invalidate sai query key của thành viên board

**Vấn đề:**
`useProjectRoom` reconcile handler trước đó invalidate `boardKeys.membersByProject(projectId)` (= `["boards-members", projectId]`).

Nhưng `useBoardsMembers` (consumer hiển thị avatar + số lượng thành viên trên grid) lại cache theo từng board:
```ts
queryKey: boardKeys.members(board.id)  // ["board-members", boardId]
```

Hai key khác prefix (`boards-members` vs `board-members`) → `invalidateQueries` ở reconcile không refetch đúng query. Khi client miss event `board:member_*` trong lúc offline, reconnect sẽ không đồng bộ lại avatar/số lượng thành viên.

**Fix:**
Trong reconcile handler, duyệt `queryClient.getQueryCache().findAll({queryKey: boardKeys.lists()})` để thu thập `boardIds` thuộc `projectId` hiện tại, rồi invalidate `boardKeys.members(boardId)` cho từng board. Bỏ `boardKeys.membersByProject(projectId)` vì không match query thực tế.

Lưu ý: `useBoardsMembers` chỉ fetch cho board nằm trong list cache (page hiện tại). Nếu user scroll sang page khác sau reconnect, board ở page mới sẽ được fetch lần đầu → data mới luôn. Vậy việc reconcile dựa trên boardIds trong list cache là đủ.

### Files sửa
- `FE/src/features/boards/utils/board-cache.ts` — tách `insertBoardToFirstList` + `updateBoardInLists`, cập nhật `applyBoardCreated`/`applyBoardUpdated`.
- `FE/src/features/realtime/hooks/useProjectRoom.ts` — reconcile invalidate đúng member query.

### Verify
- `npx tsc --noEmit -p tsconfig.app.json` pass.
- `npx eslint src/features/boards src/features/realtime` pass.

### Test case bổ sung (cần viết test runner)
- Cache sẵn page 1 + page 2, gọi `applyBoardUpdated` cho board ở page 2 → row được patch, row ở page 1 không liên quan không đổi.
- Cache member query cho 2 board thuộc project A, chạy reconcile project A → cả 2 query đều invalidate. Member query của project B không bị ảnh hưởng.
- Mô phỏng miss event `board:member_added` ở tab A, reconnect → `useBoardsMembers` refetch và hiển thị đúng avatar/số lượng thành viên.

---

## FE bugfix follow-up (2026-08-22) — spam 403 khi user không phải board member

### Vấn đề
Sau khi enable realtime cho board CRUD (turn trước), user test 2 tab cùng mở `/projects/:id`. Một tab tạo board mới → board mới xuất hiện trong list cache của tab còn lại. `useBoardsMembers` hook chạy cho board mới → gọi `GET /board/:newId/members` → BE trả 403 vì user ở tab còn lại không phải board member / không có `VIEW_BOARD` permission ở project-level (chỉ là PROJECT_MEMBER).

Log user paste:
```
FORBIDDEN: The user does not have permission to make changes to this resource
  at auth.middleware.ts:263:17  // verifyBoardPermission
...
::1 - - [22/Aug/2026:16:24:19 +0000] "GET /board/.../members HTTP/1.1" 200 ...
```

(Log gồm 1 dòng 200 cho GET members — request đó thành công vì user đó có quyền. Nhưng còn nhiều request 403 trước đó user không paste do context stack-trace chỉ ra middleware.)

### Nguyên nhân gốc
1. **API spec:** `GET /board/:boardId/members` yêu cầu permission `VIEW_BOARD` (board-level hoặc project-level). Theo seed.ts, `PROJECT_MEMBER` chỉ có `VIEW_PROJECT` + `CREATE_BOARD` (không có `VIEW_BOARD`). `BOARD_MEMBER` có `VIEW_BOARD`. Vậy user chỉ là PROJECT_MEMBER thì 403 khi gọi endpoint này.
2. **`useBoardsMembers` (FE) trước đây:**
   - `queryFn` bọc try/catch nuốt error → return `[]`.
   - Cache ở trạng thái success với `data: []`, không có error.
   - Nhưng **default retry của React Query = 3 lần** (vì `main.tsx` không có `defaultOptions.queries`); mỗi lần retry gọi lại API → lại 403.
   - Mỗi 60s (`staleTime: 60_000`) React Query refetch → lại 403 → spam log + waste request.

3. **`useBoardListCounts` (FE)** có cùng pattern (try/catch return 0, không có retry control) → cũng spam 403 tương tự khi gọi `GET /board/:boardId/lists?page=1&limit=1` cho board không có quyền.

### Fix
Sửa cả 2 hook để **React Query không retry cho 403**:

**`useBoardsMembers`:**
- `queryFn` không nuốt error mặc định — chỉ catch 403 trả `[]`; các lỗi khác throw ra.
- Thêm `retry` callback: nếu `error.response.status === 403` thì return `false` (không retry); còn lại default `< 2`.
- Kết quả: cache lưu `data: []` ổn định cho board user không có quyền, không gọi lại API, không spam log. UI hiển thị avatar stack rỗng cho board đó — đúng với permission thực tế.

**`useBoardListCounts`:**
- Cùng pattern: thêm `retry` callback để skip retry cho 403.

### Tại sao KHÔNG sửa BE?
- Sửa BE cho phép PROJECT_MEMBER đọc members mà không cần `VIEW_BOARD` sẽ phá vỡ permission system (over-broad permission leak).
- Sửa BE trả `200 []` thay vì 403 cho non-member là leaky abstraction — client không biết là lỗi permission hay thực sự không có member.
- Sửa FE là cách đúng: hook chỉ dùng cho UI hiển thị grid → nếu user không có quyền, UI hiển thị rỗng là hợp lý, không cần API trả lỗi.

### Files sửa
- `FE/src/features/boards/hooks/useBoardsMembers.ts`
- `FE/src/features/boards/hooks/useBoardListCounts.ts`

### Verify
- `npx tsc --noEmit -p tsconfig.app.json` pass.
- `npx eslint src/features/boards src/components/projects` pass.

### Test case bổ sung
- User ở PROJECT A, board đó user không phải member. Mở `/projects/A` → không còn log 403 liên tục trên console. Avatar stack trên grid cho board đó hiển thị rỗng.
- User click vào board đó (nếu grid cho phép) → mở detail. Các call khác (GET /board/:id, GET /board/:id/lists, ...) vẫn cần permission riêng và sẽ 403 — đúng hành vi hiện tại.

---

## Board list ordering follow-up (2026-08-22) — newest-first + optional sort

### Vấn đề
User test list board ở `/projects/:id` xong nhận ra thứ tự render không ổn định. Quan sát `board.repository.ts:getBoards` không có `orderBy` → Postgres trả về theo row heap order, không guaranteed nhất quán giữa các lần fetch khi board bị CUD. Đặc biệt khi realtime insert từ turn trước (`applyBoardCreated` upsert `[board, ...old.data]`) — nếu BE không sort, thứ tự cache realtime có thể lệch với thứ tự trang tiếp theo.

Khảo sát các list khác trong codebase:
- Projects grid (`view-main.tsx`) — BE đã có `orderBy: { createdAt: "desc" }` ✅.
- Project members — BE `orderBy: { createdAt: "asc" }` ✅ (cũ trên, mới dưới).
- Board members — BE `orderBy: { createdAt: "asc" }` ✅.
- Lists (Kanban columns) — BE `orderBy: { order: "asc" }` ✅.
- Tasks (Kanban) — BE `orderBy: { createdAt: "asc" }` ✅.
- Comments — BE `orderBy: { createdAt: "desc" }` ✅.

Chỉ có 1 list thiếu orderBy: `getBoards` ở `board.repository.ts`.

### Phương án đã chọn
**Phương án A: BE hard-code `createdAt desc` + tie-break `id asc`** vì:
1. Đơn giản, đúng 1 chỗ ở `board.repository.ts`. Không cần thay đổi FE ngoài việc thread param qua.
2. Cache realtime (turn trước) đã dùng `[board, ...old.data]` → khớp với newest-first.
3. Pagination ổn định với tie-break `id asc` (UUID random, deterministic).

**Bonus: Optional `sort` query param** vì:
- User đề xuất "có ý tưởng gì thì đưa ra" — nên chừa kèo sort linh hoạt cho phase 2.
- Whitelist field (`createdAt|updatedAt|name|id`) tránh Prisma injection.
- Validate format ở Zod schema → reject request xấu sớm.
- Repository silently fallback default nếu parse fail → không 500 vì typo query param.
- Hiện **chưa expose UI dropdown ở FE** — chỉ thread param qua `boardApi.getAllByProjectId(..., sort?)`. Sau này cần UI sort chỉ cần thêm dropdown ở `detail-project.tsx` + lưu preference vào localStorage (ngoài scope turn này).

### Files sửa
**BE:**
- `Manage -Task/BE/src/modules/board/board.repository.ts`
  - Thêm `parseBoardsSort(sort)` helper với whitelist + tie-break `id asc`.
  - `getBoards` accept thêm `sort?: string`, forward vào Prisma `orderBy`.
- `Manage -Task/BE/src/modules/board/dtos/requests/getAllBoard.req.ts`
  - DTO thêm field `sort?: string`.
  - Zod schema refine sort string theo regex whitelist.
- `Manage -Task/BE/src/modules/board/board.service.ts`
  - `getAllBoards` destructure `sort` từ DTO, forward vào repository.

**FE:**
- `FE/src/features/boards/api/board-api.ts`
  - `getAllByProjectId` accept thêm `sort?: string`, attach vào query params (chỉ khi truthy).

### Verify
- `npx tsc --noEmit -p tsconfig.json` BE pass.
- `npx tsc --noEmit -p tsconfig.app.json` FE pass.
- `npx eslint src/features/boards src/components/projects` FE pass.

### Test case bổ sung
- Tạo 3 board A, B, C liên tiếp vào cùng project. Mở `/projects/:id`. Grid hiển thị C, B, A (newest first). ✅
- Lật page 1 → page 2 → page 1. Mỗi board giữ nguyên vị trí qua các lần fetch (tie-break `id asc`). ✅
- Tab khác tạo board D → realtime insert `[D, ...old.data]` → D đứng đầu grid ở tab này ngay lập tức. Sau khi refetch page 1 (do reconcile), thứ tự vẫn đúng D, C, B, A. ✅
- Update board C đổi `name` → board C KHÔNG tự động lên đầu (giữ vị trí sort theo `createdAt`). ✅ Đây là behavior mong đổi với yêu cầu "newest created".
- Gọi API với `?sort=name:asc` → grid sort theo name alphabet asc (tính năng optional, mở khi FE thêm dropdown).
- Gọi API với `?sort=invalid:asc` (sai field) → Zod reject 400. Field hợp lệ nhưng direction sai → repository parse skip phần đó, fallback default. Không 500. ✅
- Gọi API không có sort → grid dùng default `createdAt:desc`. ✅

### Hướng phase 2 (chưa implement)
- Thêm dropdown sort ở `detail-project.tsx` (Newest | Name A-Z | Recently Updated).
- Lưu preference vào localStorage (`board-sort:{projectId}`) để user không phải chọn lại mỗi lần mở.
- `useBoards` thread `sort` vào query key để cache phân biệt theo sort.

---

---

## Manual Acceptance Plan (sau khi BE ready)

Theo plan §8 Manual acceptance, cần test hai browser:
1. A tạo board ở board list của project → B thấy ngay.
2. A sửa name/description → B thấy ngay.
3. A xoá board → B thấy biến mất + cache detail bị xoá.
4. Hai browser mở cùng DetailBoard → A thêm member → B thấy ngay.
5. A đổi role board member → B thấy role cập nhật.
6. A xoá board member → B thấy biến mất.
7. A xoá project member từ trang project detail → B đang mở board của user đó thấy member bị xoá.
8. Ngắt mạng B → A sửa + thêm member + xoá board → kết nối lại → B refetch đầy đủ.
9. Hai browser mở hai board khác nhau → event không rò sang board còn lại.
10. React StrictMode không tạo listener/registry trùng.
