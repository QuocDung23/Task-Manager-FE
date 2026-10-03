# Review: Feature Projects (`src/features/projects/**`)

> Review thực hiện ngày 2026-09-15, phạm vi **chỉ feature-project**:
> `src/features/projects/{api,hooks,types,utils}/**` + component tiêu thụ
> (`view-main.tsx`, `detail-project.tsx`, `createProject-main.tsx`,
> `updateProject-main.tsx`, `settingProject-main.tsx`, `addMember-project.tsx`).
>
> Mọi kết luận về BE được đối chiếu trực tiếp với
> `Manage -Task/BE/src/modules/projects/{projects.service,projects.repository}.ts`
> và `dtos/response/project.res.ts`.

## Kết luận

Cấu trúc feature tốt: query-key factory tập trung, cache reducer chỉ ở một nơi
(`project-cache.ts`) được cả HTTP mutation lẫn socket reducer chia sẻ. Tuy
nhiên có **1 bug P1** (pagination total bị sai khi filter/search đang bật) và
**1 vấn đề P1 về hiệu năng** (mỗi project kéo 1 request board count riêng vì
BE không trả `boardCount`). Kèm theo vài điểm P2/P3.

| Severity | Vấn đề | Vị trí |
|----------|--------|--------|
| P1 | `bumpPaginationTotal` bị gọi khi filter-match thay đổi → `totalItems` lệch xa server | `project-cache.ts:72-89` |
| P1 | `applyProjectCreated` chạy 2 lần cho chính user tạo project (HTTP + socket) → bump total 2 lần | `useCreateProject.ts:17-19` + `project-event-handlers.ts:111-115` |
| P1 | BE không bao giờ trả `boardCount`/`_count.boards` → `useProjectBoardCounts` luôn N+1, refetch trên mỗi page/search | `useProjectBoardCounts.ts:26-39` + BE `project.res.ts` |
| P2 | `upsertProjectInLists` upsert mù vào mọi page cache (kể cả trang không thuộc thứ tự `createdAt desc`) | `project-cache.ts:56-96` |
| P2 | `ProjectRequest.id` là required nhưng create contract không gửi id → type nói dối | `types/index.ts:45-49` |
| P2 | 3 hook member (`useProjectMembers`, `useUpdateProjectMemberRole`, `useRemoveProjectMember`) là dead code — chưa UI nào dùng | `hooks/*.ts` |
| P2 | `useProject` thiếu `meta: { silentError: true }` — lệch hành vi với `useProjects` | `useProject.ts` |
| P3 | `useEditTitleProject` — Enter + blur double-fire `handleSave`; import `React` thừa | `useEditTitleProject.ts:1,27-35` |
| P3 | `isActiveProject` cast defensive nhưng BE không trả `status` | `project-cache.ts:19-24` |
| P3 | `useProjects` catch cho board count hóa 0, che lỗi thật | `useProjectBoardCounts.ts:33-35` |

---

## [P1] `upsertProjectInLists` bump `totalItems` khi project bị đổi tên theo filter

**Vị trí:** `src/features/projects/utils/project-cache.ts:72-89`

```ts
if (!matchesFilter) {
  const next = old.data.filter((p) => p.id !== project.id);
  return {
    ...old,
    data: next,
    pagination: bumpPaginationTotal(old.pagination, -1), // ← sai
  };
}
```

**Cơ chế (đã kiểm tra BE):** `projects.repository.ts:136-138` — `getProjects`
trả `totalProjects = projects.count(where)` **có áp filter `name`**. Nghĩa là
`totalItems` server vốn đã phản ánh số project khớp filter. Khi FE tự `-1`/`+1`
mỗi khi một project bị đổi tên để **lọt ra/vào** filter, total trong cache bị
kép đếm.

**Kịch bản hỏng:**
1. User đang search `"api"`, danh sách trả 3 project, `totalItems = 3`.
2. User đổi tên 1 project thành `"Web mobile"` (không khớp filter).
3. `applyProjectUpdated` → `upsertProjectInLists` → project bị gỡ khỏi list,
   `totalItems` giảm còn **2** (trong khi server vẫn đếm 3 — project chỉ không
   khớp filter, không bị xóa).
4. User xóa query search → refetch list không khớp original → project xuất hiện
   lại, total bị hụt nữa. `totalItems` lệch vĩnh viễn với server cho tới khi
   cache bị invalidate.

**Ảnh hưởng:** con số "X projects" và tổng số trang hiển thị sai sau mỗi lần
đổi tên kèm filter. Đây là nhánh để tránh hiển thị project không khớp filter
— nhưng **patch chỉ nên sửa `data`, không đụng `pagination`** khi filter đang
bật. Hoặc bỏ hẳn việc tự bump và để `invalidateQueries` lo sync.

---

## [P1] Project tạo ra bị upsert 2 lần → `totalItems` +2 thay vì +1

**Vị trí:**
- `useCreateProject.ts:17-19` — `onSuccess` gọi `applyProjectCreated(queryClient, response.data)`.
- `project-event-handlers.ts:111-115` — socket `project:created` cũng gọi `applyProjectCreated`.

**Cơ chế (đã kiểm tra BE):** `projects.service.ts:164-168` — sau `createProject`,
BE emit socket `project:created` đến user room có chứa **chính actor**. FE của
actor vừa gọi mutation nhận cả 2 đường: `onSuccess` của HTTP (với cùng payload)
và event realtime. Cả 2 đều chạy `applyProjectCreated` → `upsertProjectInLists`
chạy 2 lần.

```ts
// upsertProjectInLists — lần nào cũng bump total
if (currentIndex < 0) {
  ...
  pagination: bumpPaginationTotal(old.pagination, 1), // lần 1: +1
}
```
Sau lần 1, project đã ở đầu list, `currentIndex >= 0`, nhưng nhánh
`matchesFilter` merge không có guard → `totalItems` tăng 1 lần nữa trong lần
thứ 2.

**Ảnh hưởng:** Sau khi user tạo project, số "X projects" và "Page N of M" tăng
thêm 1 đơn vị giả. Nếu socket bị trễ so với HTTP thì thứ tự có thể khác nhưng
vẫn kép đếm.

**Đề xuất:** dedupe bằng một trong hai:
- Bỏ nhánh HTTP `applyProjectCreated` (đã có invalidate list ở dòng 19) và để
  socket kéo. Nhưng phòng khi socket chậm/mất → cần invalidate thay vì patch.
- Hoặc giữ `applyProjectCreated` ở HTTP và **không invalidate** (bỏ dòng 19),
  chấp nhận socket duplicate → thêm guard đếm lại trong `upsertProjectInLists`
  (only bump khi trước đó project chưa tồn tại **và** mới thực sự thêm mới chứ
  không chỉ merge). Hiện tại bug nằm ở chỗ `bumpPaginationTotal` gọi trong cả 2 lần.
- Nếu giữ nguyên cả hai đường bằng nhau, ít nhất thêm `rememberEvent(eventId)`
  hoặc guard "project đã tồn tại → không bump".

---

## [P1] Board count không bao giờ tới từ backend → N+1 request cho cả page

**Vị trí:** `useProjectBoardCounts.ts:7-42` + BE `dtos/response/project.res.ts:22-61`

**Cơ chế (đã kiểm tra BE — quyết định):** `ProjectResponseDto` **không** có
field `boardCount`, **không** có `_count.boards`. List `/project` và mọi event
realtime đều trả DTO này. Do đó:

```ts
function resolveProjectBoardCount(p): undefined  // boardCount undefined, _count undefined — LUÔN undefined
```

→ `missing` luôn bằng toàn bộ project của page hiện tại → với mỗi project,
hook chạy `boardApi.getAllByProjectId(p.id, 1, 1)` để lấy `pagination.totalItems`:

- **Mỗi lần đổi trang hoặc search**: `missing` đổi → query key đổi
  (`["project-board-counts", missing.map(p => p.id)]`) → React Query coi là query
  mới → refetch đủ 12 requests dù 11 project đã có count trong record trước.
- **Page mặc định 12 project = 12 request board riêng lẻ** mỗi lần mount.

**Ảnh hưởng:** số request thừa lớn; `getCount` đọc `query.data?.[project.id]`
mà query.data được key theo snapshot `missing` lúc chạy → project có sau
(member added, dữ liệu mới từ realtime) luôn fall về `undefined`, UI nhảy
giữa "loading" và 0.

**Đề xuất (chọn 1):**
1. **Tốt nhất:** yêu cầu BE thêm `boardCount`/`_count.boards` vào
   `ProjectResponseDto` → bỏ hẳn `useProjectBoardCounts`, đọc trực tiếp payload.
2. **Về phía FE:** query key theo **từng project id** (`["project-board-count",
   p.id]`) để mỗi project refetch độc lập, hoặc một query aggregate có `staleTime`
   dài + upsert cache mỗi khi có count mới, không key theo array (tránh refetch
   toàn bộ khi đổi trang). Sort `missing` trước khi thành key để không đổi khi thứ tự đổi.

---

## [P2] `upsertProjectInLists` upsert mù vào mọi page cache

**Vị trí:** `project-cache.ts:56-96`

`findAll({ queryKey: projectKeys.lists() })` quét **mọi** page list đang có
trong cache. BE sort `createdAt: desc` (`projects.repository.ts:132-134`), nên
project mới đúng ra chỉ thuộc page 1 (bất kể filter). Hiện project mới bị chèn
vào đầu của **cả page 2, page 5...** nếu user đã từng xem các page đó.

Hệ quả: page 2 (đã cache) giờ chứa 1 project cũ sang trùng lặp ở page 1. Sau
khi tạo project mới, user bấm sang trang 2 sẽ thấy project mới bị lặp lại.

**Đề xuất:** chỉ upsert vào page mà project thực sự thuộc về (page 1 khi không
filter, hoặc đúng trang chứa vị trí theo `createdAt`), hoặc chấp nhận và
invalidate list thay vì patch thủ công.

---

## [P2] `ProjectRequest.id` là required nhưng create không bao giờ gửi id

**Vị trí:** `types/index.ts:45-49`

```ts
export type ProjectRequest = {
  id: string        // ← required, nhưng createProject/useForm không hề có id
  name: string;
  description?: string;
};
```

`useForm<ProjectRequest>` (`createProject-main.tsx:50`) và
`projectApi.create(data: ProjectRequest)` đều nhận object không có `id` — BE
tự sinh. Type đang "nói dối": object create thực tế thiếu thuộc tính bắt buộc.

**Đề xuất:** tách contract create/update khỏi `ProjectRequest`:
`type CreateProjectDto = { name; description? }` và `type UpdateProjectDto =
Partial<CreateProjectDto>`. Bỏ `id` khỏi request body (id nằm ở params/route).

---

## [P2] `useProjectMembers`, `useUpdateProjectMemberRole`, `useRemoveProjectMember` là dead code

**Vị trí:** `hooks/useProjectMembers.ts`, `hooks/useUpdateProjectMemberRole.ts`,
`hooks/useRemoveProjectMember.ts` — grep toàn repo (chỉ component + option
không tính `.AI/`) **không nơi nào import**.

- `useProjectMembers` không được mount → `projectKeys.members(projectId)`
  không bao giờ active → phần tinh tế của `applyMemberToMembersCache` /
  `removeMemberFromMembersCache` (delta=1/-1, adjustMembersTotal) chỉ chạy được
  qua socket khi user có cache members, còn trong UI thì không.
- Vì member UI chưa được build, `useUpdateProjectMemberRole` /
  `useRemoveProjectMember` cũng không được dùng → nhánh "invalidate khi
  `removed?.userId` thiếu" ở `useRemoveProjectMember` chưa từng được thực thi ở
  môi trường thật.

Không phải bug tức thời, nhưng code member mutation được review như thể "đang
chạy" trong khi thực tế chưa có UX kích hoạt. Nhớ ràng buộc khi plan
`project-member-card-refresh.md` / `role-badge-permission-ui.md` được làm sau.

---

## [P2] `useProject` thiếu `meta: { silentError: true }` — lệch hành vi `useProjects`

**Vị trí:** `useProject.ts:6-10` vs `useProjects.ts:11`

```ts
// useProjects — yên lặng, view tự render ErrorState
meta: { silentError: true },
// useProject — không có meta → QueryCache.onError hiện toast global
```

`query-client.ts:40-47` chỉ skip toast khi `meta.silentError`. Nếu
`getById` fail (project bị soft-delete bởi user khác, network error), chi tiết
project sẽ bắn toast `"…"` generic ngoài tầm kiểm soát của view, trong khi các
query khác cùng feature không làm vậy. Nên thống nhất 1 trong 2 hành vi.

---

## [P3] `useEditTitleProject` double-fire save + import `React` thừa

**Vị trí:** `useEditTitleProject.ts:1, 16-35`

- `import React` không được dùng (JSX transform) → lint warning.
- `onKeyDown` Enter gọi `handleSave()`, rồi `onBlur` (khi focus mất) gọi
  `handleSave()` lại. Tuy `trimmedTitle !== initialTitle` giữ cho lần sau là no-op
  (title đã set về mới), nhưng nếu user edit và gõ Enter rồi còn blur trong cùng
  tick, vẫn có 2 lần gọi `updateProject` khả dĩ. Thêm guard `if (editing)` hoặc
  debounce để tránh 2 mutation cùng payload.

---

## [P3] `isActiveProject` cast defensive cho `status` mà BE không trả

**Vị trí:** `project-cache.ts:19-24`

```ts
const rawStatus = (project as unknown as { status?: string }).status;
return rawStatus === undefined || rawStatus === "ACTIVE";
```

`ProjectResponseDto` (BE) không có trường `status`. Cast này luôn produce
`undefined` → hàm luôn trả `true` → toàn bộ nhánh "skip soft-delete" là code
chết. Không gây bug, chỉ gây hiểu lầm khi đọc. Nếu giữ cho tương lai, thêm
comment rõ; nếu không, bỏ.

---

## [P3] Board count catch-all hóa 0 che lỗi thật

**Vị trí:** `useProjectBoardCounts.ts:33-35`

```ts
} catch {
  return [p.id, 0] as const;
}
```

Mọi lỗi (403, network, project bị xóa) đều biến thành `0` — project có board thiết
bị hiển thị "0 boards" sai, và nếu lỗi là network thì toàn page hiển thị 0 sai.
Cách chủ động handle: only fallback khi lỗi là 404/403 (project không quyền),
còn network/timeout nên để `query.isLoading` hiển thị skeleton thay vì ép số.

---

## Đã xem xét, không flag

- **`applyProjectMemberRemoved` filter theo `userId`** — comment và code nhất
  quán (`project-cache.ts:343-357`): members cache key theo member.id,
  list card key theo user.id. Đúng.
- **`listMatchesNameFilter`** key `["projects","list",page,limit,name??null]` ↔
  `queryKey[4]` — khớp factory. Đúng.
- **Bump ±1 cho create/delete thật** — khi không có filter, `totalItems`/`totalPages`
  tự tính lại chuẩn. Chỉ sai khi lẫn filter + upsert (đã nêu P1).
- **`handleProjectMemberAdded` → `applyProjectCreated` cho user mới được thêm**
  (`project-event-handlers.ts:130-142`) — chuẩn để member mới thấy project ngay,
  đúng ý đồ.
- **`useProjects` `placeholderData: keepPreviousData` + debounce search + set page**
  reset — pattern pagination chuẩn.

## Files liên quan

- `src/features/projects/utils/project-cache.ts` — P1 bump pagination, P2 upsert mù, P3 isActiveProject.
- `src/features/projects/hooks/useCreateProject.ts` + `src/features/realtime/handlers/project-event-handlers.ts` — P1 double upsert tạo project.
- `src/features/projects/hooks/useProjectBoardCounts.ts` + BE `project.res.ts` — P1 N+1 board count.
- `src/features/projects/types/index.ts` — P2 ProjectRequest.id.
- `src/features/projects/hooks/useProjectMembers|useUpdateProjectMemberRole|useRemoveProjectMember.ts` — P2 dead code.
- `src/features/projects/hooks/useProject.ts` — P2 thiếu silentError.
- `src/features/projects/hooks/useEditTitleProject.ts` — P3 double-fire + import thừa.

## Thứ tự sửa đề xuất

1. BE thêm `boardCount`/`_count.boards` vào `ProjectResponseDto` → bỏ `useProjectBoardCounts` (hoặc FE chuyển sang key-per-project).
2. Fix `upsertProjectInLists`/`applyProjectCreated` — không bump pagination khi filter thay đổi; guard bump khi project đã tồn tại.
3. Chọn 1 đường duy nhất cho create → list (HTTP patch hoặc socket invalidate).
4. Sửa `ProjectRequest` → tách create/update DTO.
5. Bỏ `meta` lệch — thống nhất silentError hoặc demo toast cho `useProject`.
6. Cleanup P3 (import thừa, isActiveProject, catch-all 0).