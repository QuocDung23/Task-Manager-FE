# Plan: Fix feature-project theo review `project-review-full.md`

> **Ngày:** 2026-09-15
> **Nguồn:** `.AI/review-code/project-review-full.md` (review feature-project,
> đối chiếu BE `Manage -Task/BE/src/modules/projects/**`).
> **Phạm vi:** `src/features/projects/**`, `src/components/projects/**`,
> `src/components/mainSpace/{view-main,createProject-main,updateProject-main}.tsx`,
> `src/features/realtime/handlers/project-event-handlers.ts`, BE
> `src/modules/projects/**` (chỉ nếu chốt Q1 — quyết định ở §3).
> **Trạng thái:** Chưa code gì cho tới khi user duyệt.

## 1. Bối cảnh & vấn đề

Review feature-project xác nhận **3 P1, 4 P2, 3 P3**. Tóm tắt:

| # | Severity | Vấn đề |
|---|----------|--------|
| 1 | **P1** | `upsertProjectInLists` gọi `bumpPaginationTotal` khi project lọt ra/vào filter theo tên → `totalItems`/`totalPages` trong cache lệch vĩnh viễn so với server (`project-cache.ts:72-89`). |
| 2 | **P1** | Project tạo được upsert **2 lần**: HTTP `onSuccess` + socket `project:created` (BE emit về chính actor) → `totalItems` +2 thay vì +1 (`useCreateProject.ts:17-19` + `project-event-handlers.ts:111-115`). |
| 3 | **P1** | BE **không** trả `boardCount`/`_count.boards` trong `ProjectResponseDto` → `useProjectBoardCounts` luôn N+1 (12 request/page), đổi trang/search refetch toàn bộ (`useProjectBoardCounts.ts:26-39`, BE `project.res.ts:22-61`). |
| 4 | **P2** | `upsertProjectInLists` upsert mù vào mọi page cache (page 2 chứa project mới của page 1, sai `createdAt desc`) (`project-cache.ts:56-96`). |
| 5 | **P2** | `ProjectRequest.id` required nhưng create không gửi id → type nói dối (`types/index.ts:45-49`). |
| 6 | **P2** | `useProject` thiếu `meta: { silentError: true }` → query dùng chung bị toast lệch (`useProject.ts`). |
| 7 | **P2** | `useProjectMembers` / `useUpdateProjectMemberRole` / `useRemoveProjectMember` là dead code (chưa UI nối tới). |
| 8 | **P3** | `useEditTitleProject` double-fire `handleSave` (Enter + blur), import `React` thừa. |
| 9 | **P3** | `isActiveProject` cast `status` mà BE không trả → luôn `true` (code chết). |
| 10 | **P3** | Board count `catch {}` hóa mọi lỗi thành `0` — che 403/network (`useProjectBoardCounts.ts:33-35`). |

## 2. Mục tiêu

1. `totalItems`/`totalPages` trong cache khớp server sau mọi create/update/delete/
   filter — không còn tự đếm lệch.
2. Project tạo (local + realtime) chỉ xuất hiện **1 lần**, count chỉ tăng **1**.
3. Board count hiển thị đúng không tốn N request thừa; không che lỗi 403/network.
4. Type đúng contract create/update.
5. Hành vi query đồng nhất (silentError), code chết được loại khỏi luồng chính.

## 3. Quyết định cần người duyệt

- **Q1 — Board count lấy bằng cách nào?**
  - **(A) Sửa BE (đề xuất):** thêm `_count: { boards }` vào `ProjectResponseDto`
    → mọi list/detail/socket đều mang count → FE **xóa hẳn** `useProjectBoardCounts`.
  - **(B) Chỉ sửa FE:** đổi thành key **per-project**
    `["project-board-count", projectId]` + `staleTime` dài — vẫn còn N request
    riêng lẻ nhưng mỗi project độc lập, không refetch toàn page khi đổi trang/search.
  - Plan viết theo (A) kèm nhánh (B) fallback nếu không đụng BE.
- **Q2 — Xử lý duplicate create (P1 #2):**
  - **(a) Giữ cả 2 đường + idempotent reducer (đề xuất):** `upsertProjectInLists`
    chỉ bump khi project **thực sự mới** trong list → cả socket lẫn HTTP cùng
    patch không kép đếm.
  - **(b) Bỏ `applyProjectCreated` ở HTTP**, giữ invalidate list — phụ thuộc
    socket (rủi ro nếu socket chậm).
- **Q3 — Dead code member (P2 #7):** Kế hoạch `project-member-card-refresh.md`
  / `role-badge-permission-ui.md` sẽ dùng lại 3 hook đó → **GIỮ nguyên**, chỉ ghi
  chú. *Mặc định plan không xóa.*

## 4. Chi tiết các fix

### Fix 1 [P1] — `upsertProjectInLists`: không bump khi filter thay đổi + idempotent

**File:** `src/features/projects/utils/project-cache.ts`

```ts
function upsertProjectInLists(queryClient, project) {
  const queries = queryClient.getQueryCache().findAll({ queryKey: projectKeys.lists() });
  for (const entry of queries) {
    const key = entry.queryKey;
    queryClient.setQueryData<ProjectListCache>(key, (old) => {
      if (!old) return old;
      const matchesFilter = listMatchesNameFilter(key, project);
      const currentIndex = old.data.findIndex((p) => p.id === project.id);
      const current = currentIndex >= 0 ? old.data[currentIndex] : undefined;

      // Filter LỌC project ra — tổng server không đổi, chỉ bỏ khỏi data.
      if (current && !matchesFilter) {
        return { ...old, data: old.data.filter((p) => p.id !== project.id) };
      }

      // Idempotent: project đã có trong list → chỉ merge field, KHÔNG bump.
      if (current) {
        const next = [...old.data];
        next[currentIndex] = { ...current, ...project };
        return { ...old, data: next };
      }

      // Project MỚI và khớp filter → chỉ thêm khi đang xem page 1 (xem Fix 4),
      // bump total chỉ khi %foreign mới vào list này.
      if (!matchesFilter) return old;
      return {
        ...old,
        data: [project, ...old.data],
        pagination: bumpPaginationTotal(old.pagination, 1),
      };
    });
  }
}
```

Điểm mấu chốt:
- **Bỏ nhánh cũ** `if (currentIndex < 0 && !matchesFilter)` (đã tồn tại sẵn) và
  **nhánh** `!matchesFilter` khi `currentIndex >= 0` (regression từ dòng 82-88).
- **Chỉ bump khi project chưa tồn tại** trong list (`current === undefined`) —
  nhờ đó `applyProjectCreated` gọi 2 lần (HTTP + socket) không kép đếm nữa.
- Miễn là `applyProjectCreated` giữ nguyên, `useCreateProject` + socket handler
  đều tự hưởng Fix này (Q2 hướng a).

### Fix 2 [P1] — Create project: không kép đếm (dedupe)

**File:** `src/features/projects/hooks/useCreateProject.ts` +

`src/features/realtime/handlers/project-event-handlers.ts`

Theo Q2-a: **giữ nguyên 2 đường gọi `applyProjectCreated`**; Fix 1 đã làm reducer
idempotent nên không cần sửa 2 file này. Chỉ verify:

- [ ] Tạo project với socket online → HTTP list cập nhật 1 lần, không kép đếm.
- [ ] Tạo project khi socket chậm → invalidate list (dòng 19 vốn có) là fallback.

Nếu chốt Q2-b: bỏ `applyProjectCreated` khỏi `useCreateProject.onSuccess`, giữ
`invalidateQueries(list)`; socket handler giữ nguyên.

### Fix 3 [P1] — Board count: BE trả `_count.boards`, bỏ hook N+1

**Nhánh A (BE + FE):**

1. BE — `src/modules/projects/projects.repository.ts`: `getProjects`/
   `getProject`/`createProject`/`updateProject` thêm `_count: { select: { boards:
   { where: { deletedAt: null } } } }` vào `include`.
2. BE — `src/modules/projects/dtos/response/project.res.ts`: `ProjectResponseDto`
   thêm `boardCount` (đọc từ `data._count?.boards ?? 0`) + `projectResponseSchema`
   thêm `boardCount: z.number().int().nonnegative()`.
3. FE — `src/features/projects/types/index.ts`: giữ `boardCount?: number` (đã có)
   làm source chính; **bỏ** đọc `_count` hoặc giữ làm fallback.
4. FE — `src/features/projects/hooks/useProjectBoardCounts.ts`: **xóa hook**
   (không còn nơi gọi), sửa `src/components/mainSpace/view-main.tsx`: bỏ
   `useProjectBoardCounts`, truyền `boardCount={project.boardCount}` trực tiếp.

**Nhánh B (chỉ FE, nếu không đụng BE):**

- Đổi `useProjectBoardCounts` sang 1 query per project:

```ts
function useProjectBoardCount(project: ProjectResponse) {
  return useQuery({
    queryKey: ["project-board-count", project.id],
    queryFn: () => boardApi.getAllByProjectId(project.id, 1, 1)
      .then(r => r.pagination?.totalItems ?? 0),
    enabled: resolveProjectBoardCount(project) === undefined,
    staleTime: 5 * 60_000,
  });
}
```

- Bỏ query aggregate key `["project-board-counts", missing.map(...)]` — đổi trang
  không còn refetch cả page. (Vẫn còn N query riêng lẻ — nhược điểm của B.)

### Fix 4 [P2] — Upsert mù vào mọi page → chỉ page 1 (khi không filter)

**File:** `src/features/projects/utils/project-cache.ts`

BE sort `createdAt: desc` → project mới luôn thuộc **page 1** (hoặc page chứa vị
trí đúng theo tổng). Trong `upsertProjectInLists`, nhánh "project mới + khớp
filter":
- Nếu list đang **không filter** và `page !== 1` → **skip** (project không thuộc
  page này; để refetch/reconcile xử lý).
- Nếu list đang **filter** → thêm/bỏ theo `listMatchesNameFilter` như hiện tại
  (filter không đảm bảo thứ tự page, chấp nhận patch theo filter).

```ts
const page = typeof key[2] === "number" ? key[2] : null;
const isFiltering = typeof key[4] === "string" && key[4].length > 0;
if (!isFiltering && page !== null && page > 1) return old; // skip
```

### Fix 5 [P2] — Tách DTO create/update, bỏ `id` khỏi body

**File:** `src/features/projects/types/index.ts`

```ts
export type CreateProjectDto = {
  name: string;
  description?: string;
};
export type UpdateProjectDto = Partial<CreateProjectDto>;
export type ProjectRequest = CreateProjectDto; // alias giữ tương thích tạm thời hoặc bỏ hẳn
```

- `src/features/projects/api/project-api.ts`: `create(data: CreateProjectDto)`,
  `update(id, data: UpdateProjectDto)`.
- `src/features/projects/hooks/useCreateProject.ts`: `mutationFn: (data:
  CreateProjectDto)`.
- `src/features/projects/hooks/useUpdateProject.ts`: `mutationFn: ({ id, data }:
  { id: string; data: UpdateProjectDto })`.
- `src/components/mainSpace/createProject-main.tsx`: `useForm<CreateProjectDto>`.
- Grep xác nhận không còn `ProjectRequest` (nếu bỏ hẳn) hoặc chỉ còn alias.

### Fix 6 [P2] — Đồng nhất `silentError`

**File:** `src/features/projects/hooks/useProject.ts`

```ts
useQuery({
  queryKey: projectKeys.detail(id),
  queryFn: () => projectApi.getById(id),
  enabled: !!id,
  meta: { silentError: true },
});
```

- Matrix `query-client.ts` skip toast cho query có `silentError` → `useProject`
  giờ yên lặng như `useProjects`; view tự render `ErrorState`.

### Fix 7 [P2/P3] — Ghi chú dead code member + cleanup nhỏ

**File:** `src/features/projects/hooks/useProjectMembers.ts`,
`useUpdateProjectMemberRole.ts`, `useRemoveProjectMember.ts`

- Thêm banner comment: `// NOTE: chưa có UI consume — sẽ dùng trong plan
  project-member-card-refresh / role-badge-permission-ui. Không xóa.`
- Không đổi logic. (Q3.)

**`src/features/projects/utils/project-cache.ts`:**

- `isActiveProject`: bỏ cast `status` chết, giữ form đơn giản:

```ts
function isActiveProject(project: ProjectResponse): boolean {
  const raw = (project as { status?: string }).status;
  return raw === undefined || raw === "ACTIVE";
}
```

(không đổi hành vi — luôn true với BE hiện tại, không vướng `unknown` cast)

### Fix 8 [P3] — Edit title không double-fire, bỏ import thừa

**File:** `src/features/projects/hooks/useEditTitleProject.ts`

- Bỏ `import React` (JSX transform) — dòng 1.
- `handleSave` chống gọi 2 lần trong cùng tick (Enter rồi blur):

```ts
const handleSave = () => {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle === initialTitle) {
    setTitle(initialTitle);
    setEditing(false);
    return;
  }
  setEditing(false);
  updateProject({ id: projectId, data: { name: trimmedTitle } });
};
```

### Fix 9 [P3] — Board count không hóa mọi lỗi thành 0

**File:** `useProjectBoardCounts.ts` — vào nhánh B của Fix 3:

```ts
const res = await boardApi.getAllByProjectId(p.id, 1, 1);
return [p.id, res.pagination?.totalItems ?? 0] as const;
```

- `404/403`: project không tồn tại/không quyền → trả 0 (đúng ngữ nghĩa hiển thị).
- `network/timeout`: **return undefined** để UI hiện skeleton/loading thay vì 0.

## 5. Ma trận file bị ảnh hưởng

| File | Thay đổi |
|------|----------|
| `FE/src/features/projects/utils/project-cache.ts` | Fix 1 + Fix 4 + Fix 7 (cleanup `isActiveProject`) |
| `FE/src/features/projects/hooks/useCreateProject.ts` | Fix 2 (tùy Q2) + Fix 5 type |
| `FE/src/features/projects/hooks/useUpdateProject.ts` | Fix 5 type |
| `FE/src/features/projects/api/project-api.ts` | Fix 5 type |
| `FE/src/features/projects/types/index.ts` | Fix 5 DTO |
| `FE/src/features/projects/hooks/useProjectBoardCounts.ts` | Fix 3 (xóa/B-rewrite) + Fix 9 |
| `FE/src/features/projects/hooks/useProject.ts` | Fix 6 silentError |
| `FE/src/features/projects/hooks/useEditTitleProject.ts` | Fix 8 |
| `FE/src/features/projects/hooks/useProjectMembers.ts` + 2 hook role/remove | Fix 7 comment |
| `FE/src/components/mainSpace/view-main.tsx` | Fix 3 (bỏ hook count) |
| `FE/src/components/mainSpace/createProject-main.tsx` | Fix 5 type |
| `FE/src/features/realtime/handlers/project-event-handlers.ts` | Không đổi (Fix 1 hưởng tự động) |
| `BE/src/modules/projects/projects.repository.ts` | Fix 3-A: `_count.boards` |
| `BE/src/modules/projects/dtos/response/project.res.ts` | Fix 3-A: `boardCount` |

Không đổi: `useProjects`, `useDeleteProject`, `useAddMemberProject`,
`useRemoveProjectMember`, `useUpdateProjectMemberRole`, `project-query-keys.ts`.

## 6. Verification

- `npm run build` (tsc -b && vite build) — pass.
- `npm run lint` (eslint .) — pass.
- Kiểm thử tay:
  - [ ] Đang search `"api"` → đổi tên 1 project sang tên không khớp → list mất
    project đó nhưng **"X projects" giữ nguyên** (không -1).
  - [ ] Đang search → project đổi tên vào filter → xuất hiện, total giữ nguyên.
  - [ ] Tạo project mới (socket online) → xuất hiện 1 lần, count tăng đúng 1.
  - [ ] Tạo project xong, bấm qua page 2 → không thấy project mới bị lặp ở page 2.
  - [ ] Xóa search, reload trang → page 1 có project mới (createdAt desc).
  - [ ] Board card hiển thị count đúng; **Network tab không còn** 12 request
    `boards?limit=1` khi vào trang Projects (nhánh A), hoặc chỉ 1 request/con
    project `staleTime` 5 phút (nhánh B).
  - [ ] Bẻ network giữa chừng → board count hiển thị skeleton/loading, không ép 0.
  - [ ] `useProject` fail (project bị xóa) → không toast global, chỉ ErrorState view.
  - [ ] Edit title: gõ Enter rồi blur nhanh → chỉ 1 request `PATCH /project/:id`.

## 7. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Fix 1 bỏ bump ở filter có thể khiến page 2+ không update đúng khi filter + page cache cũ tồn tại. | Refetch khi đổi page/search là fallback; `upsertProjectInLists` chỉ phục vụ instant-feedback cho page đang xem. |
| Nhánh A sửa BE `_count.boards` cần where `deletedAt: null` để không đếm board soft-delete. | Ghi rõ trong task BE; kiểm tra bằng PRISMA query mẫu. |
| Idempotent reducer vẫn kép đếm nếu 2 socket event khác `eventId` cùng payload created. | `rememberEvent` đã chặn duplicate eventId; verify ở test tay. |
| Bỏ `useProjectBoardCounts` (nhánh A) ảnh hưởng nơi đang import. | Grep `useProjectBoardCounts` trước khi xóa; chỉ có `view-main.tsx`. |
| `ProjectRequest` đang được import nhiều nơi. | Giữ alias 1 release, rồi xóa sau khi rename các nơi dùng. |

## 8. Checklist duyệt

- [ ] Q1 — Board count: **sửa BE (A)** (đề xuất) / chỉ sửa FE (B).
- [ ] Q2 — Duplicate create: **giữ 2 đường + reducer idempotent (a)** / bỏ HTTP patch (b).
- [ ] Q3 — 3 hook member dead code: **giữ + comment** (đề xuất) / xóa.
- [ ] Fix 1 + Fix 4 (cache project) làm trước — P1 ảnh hưởng số liệu hiển thị.
- [ ] Fix 3 (board count) — P1 N+1.
- [ ] Fix 5 + 6 + 8 (type/silentError/edit-title) sau.
- [ ] Fix 9 theo nhánh B nếu Q1=B.

## 9. Update log

### 2026-09-15 — Tạo plan

Lấy toàn bộ findings từ `.AI/review-code/project-review-full.md`, đối chiếu BE
(`projects.service/repository/res.ts`) xác nhận: `totalItems` server đã có filter,
`ProjectResponseDto` không có `_count.boards`, socket `project:created` fan-out tới
chính actor. Plan bám theo 3 quyết định Q1/Q2/Q3.

### 2026-09-15 — Implement

**Quyết định đã chốt theo đề xuất:**
- **Q1:** Branch A (sửa BE + FE). Thêm `_count.board` (relation field trong schema là `board` singular,
  không phải `boards`) vào Prisma include của `createProject`, `getProjects`, `getProject`, `updateProject`.
  `ProjectResponseDto` đọc `data._count?.board ?? 0` → `boardCount` field.
  FE ưu tiên `project.boardCount` từ BE response, fallback qua `useProjectBoardCounts` nếu BE chưa deploy.
- **Q2:** Giữ cả 2 đường + reducer idempotent (Fix 1 làm idempotent).
- **Q3:** Giữ 3 hook member + thêm banner comment.

**Files đã sửa:**

| File | Thay đổi |
|------|----------|
| `FE/src/features/projects/utils/project-cache.ts` | Fix 1 + Fix 4 + Fix 7 (cleanup `isActiveProject`) |
| `FE/src/features/projects/hooks/useCreateProject.ts` | Fix 2 (verify) + Fix 5 type |
| `FE/src/features/projects/hooks/useUpdateProject.ts` | Fix 5 type |
| `FE/src/features/projects/api/project-api.ts` | Fix 5 type |
| `FE/src/features/projects/types/index.ts` | Fix 5 DTO (`CreateProjectDto` / `UpdateProjectDto`) |
| `FE/src/features/projects/hooks/useProjectBoardCounts.ts` | Giữ làm fallback; resolveProjectBoardCount ưu tiên `project.boardCount` |
| `FE/src/features/projects/hooks/useProject.ts` | Fix 6 `silentError: true` |
| `FE/src/features/projects/hooks/useEditTitleProject.ts` | Fix 8 (bỏ React import, `setEditing(false)` trước mutate) |
| `FE/src/features/projects/hooks/useProjectMembers.ts` + 2 hook role/remove | Fix 7 banner comment |
| `FE/src/components/mainSpace/view-main.tsx` | Fix 3: `getBoardCount` ưu tiên `project.boardCount` |
| `FE/src/features/realtime/handlers/project-event-handlers.ts` | Không đổi (Fix 1 hưởng tự động) |
| `BE/src/modules/projects/projects.repository.ts` | Fix 3-A: thêm `_count.board` vào mọi query |
| `BE/src/modules/projects/dtos/response/project.res.ts` | Fix 3-A: `boardCount` field |

**Không đổi:** `useProjects`, `useDeleteProject`, `useAddMemberProject`, `useRemoveProjectMember`,
`useUpdateProjectMemberRole`, `project-query-keys.ts`.

**Build verify:**
- `FE`: `npm run build` ✅ pass
- `FE`: `npm run lint` — 7 lỗi pre-existing (không liên quan project fix), 0 lỗi mới
- `BE`: `npx tsc --noEmit` ✅ pass