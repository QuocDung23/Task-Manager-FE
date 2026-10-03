# Work Log - Fix Realtime Project Events Bug

## 1. Bug review

Tham chiếu: `FE/.AI/review-code/realtime-project-events-bug.md`

3 bug P1:

- `project:updated`/`project:deleted` chỉ emit vào `project:{projectId}` → main page
  (`view-main.tsx`) không join project room nên bị miss.
- `project:member_added` chỉ emit vào project room → user mới (chưa join project room) bị
  miss.
- Payload `member_added` không kèm `project` canonical → FE handler không patch được project
  vào list.

3 bug FE:

- `handleMemberAdded` không gọi `applyProjectCreated` khi người nhận là current user.
- `useGlobalRealtime` `onConnect` không invalidate `projectKeys.lists()` khi reconnect.
- Sau `project:deleted`, user mở detail không navigate ra main page.

## 2. Cấu trúc fix

BE: fan-out qua `user:{userId}` của owner + active members. Service resolve recipients rồi
truyền vào publisher (không query DB trong publisher). Snapshot recipients trước
soft-delete để query không trả record đã INACTIVE.

FE: mirror contract mới (`project` trong `ProjectMemberAddedPayload`), handler patch
project list khi member mới chính là current user, reconnect invalidate list, detail page
navigate khi cache trống sau khi đã fetched.

## 3. Files đã sửa

### Backend (4 files)

- `Manage -Task/BE/src/modules/realtime/realtime.types.ts` — thêm
  `project: ProjectResponseDto` vào `ProjectMemberAddedPayload`.
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts` — thêm helper
  `chainRoomTargets` (chain `.to(a).to(b).emit(name, payload)` cho Socket.IO union
  semantics). Mở rộng `emitProjectUpdated`, `emitProjectDeleted`, `emitProjectMemberAdded`
  với `recipientUserIds?: readonly string[]` và `project: ProjectResponseDto` cho
  `emitProjectMemberAdded`.
- `Manage -Task/BE/src/modules/projects/projects.repository.ts` — thêm
  `getActiveProjectMemberUserIds(projectId)` trả về `Set<userId>` của owner + active members.
- `Manage -Task/BE/src/modules/projects/projects.service.ts`:
  - `updateProject`: resolve recipients sau commit rồi truyền vào `emitProjectUpdated`.
  - `deleteProject`: **snapshot recipients trước soft-delete** rồi truyền vào
    `emitProjectDeleted`.
  - `addMember`: build `projectDto` từ `project` đã fetch (include members) rồi truyền
    vào `emitProjectMemberAdded` cùng với recipients = `[memberDto.userId, ...activeMembers]`.

### Frontend (5 files + 1 mới)

- `FE/src/features/realtime/contracts/realtime-events.ts` — thêm
  `project: ProjectResponse` vào `ProjectMemberAddedPayload`.
- `FE/src/features/realtime/handlers/project-event-handlers.ts`:
  - Import `getCurrentUserId` helper.
  - Cập nhật `isProjectMemberAddedPayload` validator để check `project.id`/
    `project.userId` khớp `projectId`.
  - `handleMemberAdded`: khi `member.userId === currentUserId && payload.data.project` →
    gọi `applyProjectCreated(queryClient, payload.data.project)`.
- `FE/src/features/realtime/utils/current-user-id.ts` (mới) — helper parse JWT payload
  base64 từ `socket.auth.token` để lấy current userId (chỉ decode, không verify vì server
  đã verify khi connect).
- `FE/src/features/realtime/hooks/useTaskSocket.ts` — `useGlobalRealtime.onConnect` thêm
  `invalidateQueries({ queryKey: projectKeys.lists() })` để bù cache cho khoảng disconnect.
- `FE/src/components/projects/detail-project.tsx`:
  - Import `useProject` và `toast`.
  - Mount `useProject(projectId)` để subscribe detail cache.
  - Thêm `useEffect` navigate về `APP_ROUTES.MAIN` khi `isFetched && !isLoading &&
    !data` (tức cache đã bị `applyProjectDeleted` remove).

## 4. Test status

- BE: `npx tsc --noEmit` pass.
- FE: `npx tsc -b` pass, `npx eslint` pass.
- ReadLints: clean trên tất cả files đã sửa.

## 5. Manual test (chưa chạy)

Acceptance test 6 case trong bug review:

1. A/B ở main page, A update → B thấy card đổi name/description không reload.
2. A delete → B thấy card biến mất + `totalItems` cập nhật.
3. A add B (B đang ở main page, chưa là member) → B thấy project xuất hiện realtime.
4. B offline khi được add → reconnect → B vẫn thấy project qua REST.
5. B mất mạng → A update/delete → B reconnect → list được invalidate và hội tụ.
6. B đang ở project detail → A delete → B navigate về main page, không crash.

## 6. Không làm (deferred)

- Thêm event `project:access_granted`/`project:access_revoked` (chờ remove/disable member).
- Fix `ProjectResponseDto` thiếu `members[]` (bug riêng, ngoài scope review này).
- Re-type `projectApi.addMember` response từ `AddProjectMemberResponse` → `ProjectMemberResponse`
  (FE optimization, không thuộc bug review).

## 7. Notes

- BE `addMember` lấy `project` từ `getProject({ id: projectId })` đã có sẵn đầu hàm (line
  285), không thêm query mới.
- `chainRoomTargets` chain `.to(...)` liên tiếp — Socket.IO đảm bảo socket thuộc nhiều
  room chỉ nhận một lần. Không cần dedupe phía server, FE `eventId` dedupe là lớp bảo vệ
  thứ hai.
- BE `deleteProject` snapshot trước soft-delete là bắt buộc: `getActiveProjectMemberUserIds`
  query `deletedAt: null` nên sau delete sẽ trả empty, mất toàn bộ recipient list.