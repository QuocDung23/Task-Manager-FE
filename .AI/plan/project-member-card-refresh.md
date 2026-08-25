# Sửa UI không re-render khi thêm member vào project

> Ngày 2026-08-24. Dựa trên code hiện tại của `FE`
> (`src/features/projects/**`, `src/features/realtime/handlers/project-event-handlers.ts`,
> `src/components/mainSpace/view-main.tsx`, `src/components/mainSpace/projectCard-main.tsx`).

## 1. Mục tiêu

Khi thêm member vào project, avatar stack và số lượng member trên project card
(`ProjectCard` ở trang Projects) phải cập nhật ngay, cả khi chính mình thao tác
và khi member được thêm từ client khác (realtime). Remove member và đổi role
cũng phải ảnh hưởng đúng đến card.

## 2. Root cause

Dữ liệu mà card hiển thị và dữ liệu mà mutation/socket ghi vào cache nằm ở hai
key tree khác nhau, không có code nào nối hai bên:

- Card đọc từ **projects-list cache**: `view-main.tsx` gọi `useProjects(...)`
  (key `["projects","list",page,limit,name]`) rồi truyền `project.members`
  (embed trong list response, kiểu `ProjectMemberUser[]`) vào `ProjectCard`.
  Count = `members.length` (`projectCard-main.tsx:35`).
- Mutation `useAddMemberProject.onSuccess` chỉ ghi vào key
  `["project-members", projectId]` (qua `applyProjectMemberAdded`) và bump
  `totalMembers` trên `["project", projectId]` (detail).
- Realtime handler `project:member_added`
  (`project-event-handlers.ts:130-142`) dùng cùng `applyProjectMemberAdded`,
  nên cũng chỉ ghi `["project-members", id]` + detail. Chỉ riêng trường hợp
  chính user bị thêm vào mới `applyProjectCreated` upsert list — nhưng payload
  đó không mang members mới.

=> Không có bất kỳ code path nào patch/invalidate `project.members` nằm trong
các entry của `["projects","list",...]`, nên card không bao giờ re-render.

Board không bị bug này vì `detail-project.tsx` fetch trực tiếp bằng
`useBoardsMembers` (đọc đúng key mà mutation/socket ghi: `boardKeys.members`).

Các vị trí đang ảnh hưởng (đều chung root cause):

| Flow | File | Hiện tại |
|---|---|---|
| Add member (mutation) | `useAddMemberProject.ts:37-50` | Chỉ ghi members + detail |
| Add member (socket) | `project-event-handlers.ts:130-142` | Chỉ ghi members + detail |
| Remove member | `applyProjectMemberRemoved` | Chỉ ghi members + detail |
| Role updated | `applyProjectMemberRoleUpdated` | Chỉ ghi members |

## 3. Nguyên tắc fix

- **Patch list cache thay vì invalidate** (`setQueryData` granular): giữ UX
  instant, không refetch tất cả các page/filter của projects list. Invalidate
  `lists()` chỉ làm fallback.
- Một reducer duy nhất là source of truth cho việc đồng bộ member vào list,
  dùng bởi cả HTTP mutation và socket handler (dùng pattern hiện có của
  `project-cache.ts`: "socket reducer và HTTP mutation cùng thay một bề mặt key").
- Reducer phải idempotent (dedupe theo member/user id) vì socket event có thể
  đến trùng lặp với response của mutation.
- Không sửa `ProjectCard` về mặt data flow — vẫn nhận `members` qua props;
  chỉ đảm bảo cache nguồn của props được cập nhật.

## 4. Thiết kế chi tiết

### 4.1. Thêm reducers vào `src/features/projects/utils/project-cache.ts`

```ts
// Map ProjectMemberResponse -> ProjectMemberUser để patch vào list cache
function toProjectMemberUser(member: ProjectMemberResponse): ProjectMemberUser {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    avatar: member.avatar ?? null,
  };
}

// Patch toàn bộ entries của ["projects","list",...] cho một project
export function syncProjectMembersInLists(
  queryClient: QueryClient,
  projectId: string,
  next: (current: ProjectMemberUser[] | undefined) => ProjectMemberUser[],
): void;

// Wrapper tiện ích
export function applyProjectMemberToLists(
  queryClient: QueryClient,
  member: ProjectMemberResponse,
): void;   // append nếu chưa tồn tại (dedupe theo id), replace nếu đã có

export function removeProjectMemberFromLists(
  queryClient: QueryClient,
  projectId: string,
  memberId: string,
): void;

// KHÔNG thêm applyProjectMemberRoleToLists ở plan này.
// Lý do: ProjectMemberUser hiện không có field role, ProjectCard không hiển
// thị role. Nếu sau cần badge role, tạo task riêng (thêm field vào type trước).
```

Ghi chú quan trọng:

- Dedupe theo `member.id`. Cần buộc verify contract BE ở Milestone 0: id trong
  `members` embed của list response là **membership id hay user id**. Nếu khác
  với `id` của `ProjectMemberResponse` trả về từ add-member API thì phải chuyển
  sang dedupe theo `email` (hoặc BE trả thêm `userId` vào `ProjectMemberUser`)
  trước khi implement.
- `syncProjectMembersInLists` iterate `getQueryCache().findAll({ queryKey:
  projectKeys.lists() })` giống `upsertProjectInLists` hiện tại để patch cả
  các page/filter đang tồn tại trong cache.
- Filter search không liên quan đến members nên không cần check
  `listMatchesNameFilter` (khác với created/updated).
- **Guard `current === undefined`**: nếu list entry chưa fetch (cache rỗng),
  KHÔNG tự khởi tạo array mới với chỉ 1 member. Lý do: cache rỗng nghĩa là
  trang Projects chưa mount hoặc query key chưa active; tạo data giả sẽ không
  khớp với server shape khi refetch xảy ra. Skip an toàn.
- **Replace nguyên entry (không merge field)**: khi member đã tồn tại và được
  patch lại (vd: socket `member_added` đến sau khi mutation success), thay
  thế toàn bộ object của entry cũ, không merge từng field. Lý do: response mới
  từ BE/socket là source of truth; merge có thể gây bug khi BE reset field
  (vd: avatar cũ bị xóa).

### 4.2. Wire vào cache helpers hiện có

Sửa trong `project-cache.ts`:

- `applyProjectMemberAdded`: sau khi ghi members + detail, gọi thêm
  `applyProjectMemberToLists`.
- `applyProjectMemberRemoved`: sau khi ghi members + detail, gọi thêm
  `removeProjectMemberFromLists`.
- `applyProjectMemberRoleUpdated`: KHÔNG cần sửa (xem 4.4 lý do bỏ role helper).

Vì cả mutation và socket handler đều đi qua 2 helper này, không cần sửa logic
ở từng nơi gọi — đây là lý do chọn patch ngay trong `project-cache.ts`.

### 4.3. Revert bằng `onError` rollback (thay cho fallback invalidate)

**Quyết định review**: KHÔNG sử dụng fallback invalidate như draft ban đầu.

Lý do:
- Nếu BE trả shape khác mong đợi -> đây là bug riêng, không nên "tự sửa" bằng
  refetch ngầm (sẽ làm mất deterministic của cache).
- `refetchType: "none"` vẫn có thể trigger refetch ngầm khi query key active,
  gây "blink" nhất mà plan đang muốn tránh.

**Cách làm mới**:
Trong `useAddMemberProject.ts` (và tương ứng `useRemoveProjectMember.ts`,
`useUpdateProjectMemberRole.ts`):

1. Trước khi mutation: chụp snapshot entry hiện tại của `["projects","list",...]`
   bằng `queryClient.getQueryData(...)` và lưu vào closure của `onMutate`.
2. Mutation thất bại (`onError`): set lại snapshot vào cache
   (`queryClient.setQueryData(key, snapshot)`) để revert patch.
3. Mutation thành công: KHÔNG cần rollback, patch đã được apply đúng qua
   `applyProjectMember*`.

Lưu ý: với 3 list-key đang active (vd: page=1, page=2, filtered), cần revert
toàn bộ. Reuse helper `syncProjectMembersInLists` với `next` callback trả về
snapshot cũ.

### 4.4. Role update và ProjectCard

**Câu hỏi review**: `applyProjectMemberRoleToLists` có thực sự cần không?

`ProjectMemberUser` hiện tại (`id/name/email/avatar`) không chứa role. Field
role chỉ nằm trong `ProjectMemberResponse` (trả về từ API mutation) và
`boardMembers` detail. Nên:

| Trường hợp | Xử lý |
|---|---|
| `ProjectCard` hiện tại KHÔNG hiển thị role | BỎ `applyProjectMemberRoleToLists`, không cần helper. Role update chỉ ghi `["project-members", id]` (hành vi hiện tại đã đúng). |
| `ProjectCard` SẼ thêm badge role (owner/editor) sau này | GIỮ helper nhưng PHẢI update type `ProjectMemberUser` trước (thêm field `role`). Làm riêng task khác, không nhét vào plan này. |

**Chốt cho plan này**: mặc định BỎ `applyProjectMemberRoleToLists`. Nếu sau
review thấy cần, hook vào task riêng. Ghi chú ở file plan (mục 5) để khỏi quên.

### 4.5. Socket handler

Không cần sửa logic trong `project-event-handlers.ts` vì nó đã gọi đúng 2 helper
trên (4.2: `applyProjectMemberAdded`/`applyProjectMemberRemoved`). Chỉ kiểm tra
lại `handleMemberRemoved` truyền đúng `memberId` (theo id mà list cache đang
sử dụng — phụ thuộc kết quả verify ở Milestone 0).

### 4.6. Verify reactivity của view-main.tsx

`view-main.tsx` gọi `useProjects(...)` rồi truyền `project.members` xuống
`ProjectCard`. Patch vào cache chỉ có hiệu lực nếu:

- Component đang subscribe đúng key (không dùng `select` selector trả về
  reference mới mỗi render).
- `ProjectCard` nhận `members` qua props (không clone deep trong parent).

**Cần verify trong Milestone 0**: đọc `view-main.tsx` để đảm bảo không có
selector/clone gây mất reactivity. Nếu phát hiện, sửa ở task riêng (cần thay
đổi data flow, nằm ngoài scope plan này).

## 5. File plan

```text
Sửa:
- src/features/projects/utils/project-cache.ts        // +2 list-sync reducers
                                                      // (addMember, removeMember),
                                                      // wire vào 2 apply* hiện có
- src/features/projects/hooks/useAddMemberProject.ts  // +onError rollback
- src/features/projects/hooks/useRemoveProjectMember.ts

Verify (không sửa, nhưng cần đọc để xác nhận reactivity):
- src/components/mainSpace/view-main.tsx             // xác nhận subscribe đúng key
                                                      // của useProjects

Không sửa:
- src/components/mainSpace/projectCard-main.tsx       // data flow giữ nguyên
- src/features/realtime/handlers/project-event-handlers.ts // tự cập nhật theo helper
- src/features/projects/hooks/useUpdateProjectMemberRole.ts
                                                     // role update không ảnh hưởng card
```

### 5.1. Cần phải sửa thêm nếu view-main.tsx có vấn đề

Nếu sau Milestone 0 phát hiện `view-main.tsx` có selector/clone làm mất
reactivity: cần tạo issue/task riêng để sửa data flow. Plan này chỉ xử lý
cache layer, không xử lý presentation layer.

## 6. Thứ tự implementation

### Milestone 0 - verify contract (nhanh)

1. Đối chiếu response của GET projects list: `members[].id` là membership id
   hay user id; so sánh với `id` trả về từ POST add-member.
2. Nếu hai id khác nhau: quyết định dedupe key (email hoặc BE bổ sung
   `userId` vào `ProjectMemberUser`). Chốt trước khi code.
3. **Verify `staleTime` của `useProjects`**: xem file hook/query để biết khi
   nào cache tự refetch. Nếu staleTime quá ngắn (vd < 30s) có thể gây refetch
   sớm hơn mong đợi, patch có thể bị overwrite. Ghi nhận giá trị hiện tại vào
   comment trong code để người sau biết.
4. **Verify reactivity của `view-main.tsx`**: đọc để đảm bảo `useProjects`
   trả về data được component sử dụng trực tiếp, không qua selector/clone
   mất reactivity. Nếu có, tạo issue riêng (không nằm trong scope này).

### Milestone 1 - implement

1. Thêm `toProjectMemberUser` + 2 reducers (addMember, removeMember) vào
   `project-cache.ts`. KHÔNG thêm `applyProjectMemberRoleToLists` (xem 4.4).
2. Wire vào `applyProjectMemberAdded` / `applyProjectMemberRemoved`.
3. Thêm `onError` rollback vào `useAddMemberProject` + `useRemoveProjectMember`.
4. Kiểm tra StrictMode/multi-tab không tạo duplicate entry trong list.

Output: thêm/remove member cập nhật avatar stack + count trên card ngay lập tức,
cả local và realtime. Role update không ảnh hưởng card (xem 4.4).

## 7. Test plan

### Manual

1. User A mở trang Projects, add member B -> card A tăng count + avatar B ngay,
   không refetch (network tab trống).
2. Tab 2 (user C cùng nhìn project) nhận `project:member_added` -> card C cũng
   cập nhật.
3. Remove member -> count giảm + avatar biến mất ngay, cả local và realtime.
4. Role update -> không làm duplicate avatar trong stack.
5. Socket event trùng với mutation response (dedupe theo eventId/id) -> count
   không tăng gấp đôi.
6. Search filter đang active -> card vẫn được patch (filter name không liên
   quan members).
7. Refetch list (đổi page quay lại) -> dữ liệu không bị "revert" về state cũ
   (patch không xung đột với server truth).
8. **User remove chính mình khỏi project**: khi user A remove A khỏi project
   đó, A có thể bị:
   - Redirect ra ngoài (nếu A không còn quyền truy cập)
   - Card của A trong list vẫn hiển thị (nếu A vẫn owner của project khác)
   Verify: socket handler không gây crash, list cache cho các project khác
   không bị ảnh hưởng (chỉ patch entry của project bị remove).

### Automated (nếu repo có setup test cho cache utils)

- `applyProjectMemberToLists` idempotent: gọi 2 lần với cùng member -> 1 entry.
- `removeProjectMemberFromLists` không làm sai pagination totalItems.
- Reducer skip an toàn khi list cache rỗng/chưa fetch.

## 8. Definition of Done

Qualitative:
- Add/remove member qua mutation HOẶC socket đều cập nhật `project.members`
  trong projects-list cache.
- `ProjectCard` hiện đúng avatar stack (max 3 + "+N") và member count ngay lập
  tức sau thay đổi.
- Không duplicate member, không refetch toàn bộ lists sau mỗi thay đổi.
- Id của member trong list cache được verify và dedupe đúng theo contract BE.

Measurable (verify bằng tooling):
- Member count hiển thị trên card khớp với `serverResponse.length` trong vòng
  1 frame sau action (verify bằng React DevTools Profiler).
- Không có extra network request (GET projects list) sau khi patch thành công
  (verify Network tab trong DevTools).
- Mutation error trigger rollback: cache trở về snapshot cũ trong vòng 1 frame,
  card hiển thị đúng state trước action.
- Multi-tab: socket event đến tab 2 trong vòng < 2s, card tab 2 cập nhật
  không cần refresh.

## 9. Changelog

- 2026-08-24 (sau review lần 1):
  - 4.1: làm rõ role update — chốt BỎ `applyProjectMemberRoleToLists` (xem 4.4).
  - 4.1: thêm guard `current === undefined` (không tự khởi tạo array mới).
  - 4.1: quy ước replace nguyên entry (không merge field).
  - 4.3: đổi từ "fallback invalidate lists" sang `onError` rollback với snapshot.
  - 5: thêm `view-main.tsx` vào mục "Verify" (cần đọc để xác nhận reactivity).
  - 6 (Milestone 0): thêm bước verify `staleTime` của `useProjects`.
  - 7: thêm test case #8 "user remove chính mình khỏi project".
  - 8: thêm measurable DoD (Profiler, Network tab, rollback timing, multi-tab).
- 2026-08-24 (lần 2): chỉnh toàn bộ nội dung sang tiếng Việt có dấu rõ ràng.