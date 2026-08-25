# Plan triển khai Task Tag cho FE

## 1. Mục tiêu

Triển khai Task Tag/Label trên FE theo đúng backend hiện có, với tag dùng chung
trong phạm vi một board và mỗi task có thể gắn nhiều tag.

Kết quả mong muốn:

- Người dùng xem được các tag đang gắn trên task ở task detail và task card.
- Người dùng có thể chọn nhiều tag, áp dụng một lần hoặc clear toàn bộ tag.
- Người dùng có thể tạo, sửa tên/màu và xoá mềm tag trong board.
- Board có thể lọc task theo một hoặc nhiều tag với mode `ANY`/`ALL`.
- Có data layer cho màn hình gom toàn bộ task theo một tag.
- Sau mọi mutation, task detail, task card, filter query và tag manager không bị
  giữ dữ liệu stale.
- UI xử lý đúng các lỗi trùng tên, tag khác board, task bị khóa và thiếu quyền.

Phạm vi này chỉ triển khai FE. Backend tag đã có router, DTO, service,
repository, permission và task response tương ứng.

## 2. Contract backend đã đọc

Nguồn chính:

- `Manage -Task/BE/src/modules/tasks/tag/tag.router.ts:39-179`
- `Manage -Task/BE/src/modules/tasks/tag/tag.service.ts:41-350`
- `Manage -Task/BE/src/modules/tasks/tag/tag.repository.ts:16-305`
- `Manage -Task/BE/src/modules/tasks/tag/dtos/request/*`
- `Manage -Task/BE/src/modules/tasks/tag/dtos/response/*`
- `Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts:40-190`
- `Manage -Task/BE/src/modules/tasks/dtos/request/getAllTask.req.ts:35-116`
- `Manage -Task/BE/src/modules/tasks/task.repository.ts:48-210`
- `Manage -Task/BE/src/app.ts:54-58`

`taskTagRouter` đã được đăng ký trong `Manage -Task/BE/src/modules/index.ts` và
được mount cùng task router dưới `/task`, nên FE gọi cùng `axiosLocal` như các
task API hiện tại.

### 2.1. Tag response

Tag đầy đủ từ board API:

```ts
type TagResponse = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
```

Task chỉ trả summary của tag đang active:

```ts
type TaskTagSummary = {
  id: string;
  name: string;
  color: string;
};
```

`TaskResponse.tags` là mảng luôn có, rỗng nếu task chưa gắn tag. Backend filter
`taskTags.deletedAt = null` và `tag.deletedAt = null`, nên FE không cần tự lọc
tag đã xoá trong response canonical.

### 2.2. API quản lý danh mục tag theo board

| Method | Endpoint | Body/query | Permission backend |
| --- | --- | --- | --- |
| `GET` | `/task/boards/:boardId/tags` | `name?`, `includeDeleted?` | `VIEW_TASK` |
| `POST` | `/task/boards/:boardId/tags` | `{ name, color? }` | `CREATE_TASK_TAG` |
| `PATCH` | `/task/boards/:boardId/tags/:tagId` | `{ name?, color? }` | `UPDATE_TASK_TAG` |
| `DELETE` | `/task/boards/:boardId/tags/:tagId` | none | `DELETE_TASK_TAG` |

Rules cần phản ánh trong UX:

- Tên được trim, gom whitespace và unique không phân biệt hoa thường trong
  cùng board.
- `name` dài 1-50 ký tự.
- `color` phải là hex `#RGB` hoặc `#RRGGBB`; nếu không gửi, backend dùng
  `#64748b`.
- Tạo lại tên của tag đã xoá sẽ revive record cũ, cập nhật màu nếu có, nhưng
  không tự gắn lại các task cũ.
- Xoá tag là soft delete tag và toàn bộ liên kết `taskTags`; task không bị xoá.

### 2.3. API gắn/gỡ tag trên task

| Method | Endpoint | Body | Permission backend |
| --- | --- | --- | --- |
| `PATCH` | `/task/:taskId/tags` | `{ tagIds: string[] }` | `ASSIGN_TASK_TAG` |
| `POST` | `/task/:taskId/tags/:tagId` | none | `ASSIGN_TASK_TAG` |
| `DELETE` | `/task/:taskId/tags/:tagId` | none | `UNASSIGN_TASK_TAG` |

Khuyến nghị MVP dùng `PATCH` replace-all cho picker nhiều lựa chọn:

- `tagIds: []` hợp lệ và clear toàn bộ tag.
- Backend từ chối duplicate `tagIds` và tag không thuộc board của task.
- Backend trả `ApiResponse<TaskResponse>` sau update, gồm danh sách `tags` mới.
- Backend từ chối mọi mutation tag khi task có `lockStatus ===
  "OVERDUE_LOCKED"`; message yêu cầu reschedule trước.
- `POST`/`DELETE` single-tag vẫn nên triển khai ở API layer để phục vụ thao tác
  nhanh hoặc phase sau, nhưng không dùng xen kẽ với replace trong cùng một UI
  save flow.

### 2.4. Lấy task theo tag và filter list

Gom task theo tag:

```http
GET /task/boards/:boardId/tags/:tagId/tasks
  ?status=ACTIVE&name=login&listId=<uuid>
```

Response:

```ts
ApiResponse<{
  tag: TaskTagSummary;
  tasks: TaskResponse[];
}>
```

List task hiện tại cũng nhận:

```http
GET /task/:listId/tasks?tagIds=id1,id2&tagMode=ANY
```

- `tagMode=ANY`: task có ít nhất một tag được chọn.
- `tagMode=ALL`: task phải có đủ mọi tag được chọn.
- Backend yêu cầu `tagMode` chỉ đi cùng `tagIds` không rỗng và không nhận
  duplicate tag id.

## 3. Hiện trạng FE và khoảng trống

### Đã có

- `TaskResponse` và task list query nằm trong
  `FE/src/features/tasks/types/index.ts` và `useTasks.ts`.
- Query key đã có abstraction tại
  `FE/src/features/tasks/utils/task-query-keys.ts` và hỗ trợ filters.
- Cache helper `replaceTaskAcrossCaches` tại
  `FE/src/features/tasks/utils/task-cache.ts` đã cập nhật mọi task-list cache
  theo `listId` và task detail cache.
- Board đã truyền `taskFilters` từ `DetailBoard` qua `BoardDndProvider` tới
  `useTasks` trong từng list.
- `LabelChip` trong
  `FE/src/components/tasks/task-detail/task-detail-meta-bar.tsx` hiện là
  placeholder disabled `Labels (coming soon)`.
- `TaskCard` chưa render tag; task detail chưa có tag picker, API hay hook tag.

### Gap cần xử lý

1. `TaskResponse` hiện chưa khai báo `tags`, dù backend đã trả field này.
2. `TaskListFilters`/`taskApi.buildListParams` chưa có `tagIds` và `tagMode`.
3. Chưa có `TagResponse`, `TaskTagSummary`, request DTO client hoặc response
   `GetTasksByTag` ở FE.
4. Chưa có API/hook cho tag CRUD, attach/detach/replace và tasks-by-tag.
5. `matchesFilters` trong `task-cache.ts` chưa tính tag filter.
6. `replaceTaskAcrossCaches` hiện không cập nhật task detail nếu detail cache đã
   có dữ liệu (`old ?? task`); tag mutation cần sửa thành update canonical.
7. Board header chưa có tag filter hoặc nơi quản lý danh mục tag.
8. Task card và task detail chưa hiển thị màu/tag name.
9. Chưa có UX cho quyền `CREATE/UPDATE/DELETE_TASK_TAG`, lỗi duplicate name,
   lỗi khác board và overdue lock.

## 4. Kiến trúc FE đề xuất

Tag là resource thuộc board, nên tách data layer `features/tags` khỏi task UI;
task API chỉ giữ những mutation tác động trực tiếp vào task.

```txt
FE/src/features/tags/
  api/tag-api.ts
  hooks/useTags.ts
  hooks/useCreateTag.ts
  hooks/useUpdateTag.ts
  hooks/useDeleteTag.ts
  hooks/useTasksByTag.ts
  types/index.ts
  utils/tag-query-keys.ts

FE/src/features/tasks/
  api/task-api.ts                 # thêm replace/attach/detach tags + filter
  hooks/useReplaceTaskTags.ts
  hooks/useAttachTaskTag.ts       # phase tiện ích
  hooks/useDetachTaskTag.ts       # phase tiện ích
  types/index.ts                  # thêm tags và tag filters
  utils/task-cache.ts             # match tag filters + detail canonical

FE/src/components/tags/
  task-tags-picker.tsx
  board-tags-manager-dialog.tsx
  tag-editor-dialog.tsx
  tag-filter.tsx
  task-tag-badge.tsx
```

Không thêm color-picker hoặc state-management package mới. Dùng React Query,
local component state, native `input[type="color"]` và các primitive Radix đang
có trong project.

## 5. Types và query keys

### 5.1. `FE/src/features/tags/types/index.ts`

Thêm các type:

```ts
export type TagStatus = "ACTIVE" | "INACTIVE";

export type TagResponse = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  status: TagStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type GetTagsParams = {
  name?: string;
  includeDeleted?: boolean;
};

export type CreateTagRequest = {
  name: string;
  color?: string;
};

export type UpdateTagRequest = {
  name?: string;
  color?: string;
};

export type GetTasksByTagParams = {
  listId?: string;
  name?: string;
  status?: "ACTIVE" | "INACTIVE";
};

export type GetTasksByTagResponse = {
  tag: TaskTagSummary;
  tasks: TaskResponse[];
};
```

`TaskTagSummary` và `TaskResponse` nên được định nghĩa/export trong
`FE/src/features/tasks/types/index.ts`, sau đó import type vào tag feature để
tránh duplicate shape:

```ts
export type TaskTagSummary = {
  id: string;
  name: string;
  color: string;
};

export type TaskTagFilterMode = "ANY" | "ALL";
```

Cập nhật `TaskResponse`:

```ts
tags: TaskTagSummary[];
```

Cập nhật `TaskListFilters`:

```ts
export type TaskListFilters = {
  tagIds?: string[];
  tagMode?: TaskTagFilterMode;
  scheduleState?: TaskScheduleState;
  lockStatus?: TaskLockStatus;
  dueBefore?: string;
  dueAfter?: string;
};
```

Client giữ `Date` dạng string như các response type hiện tại; không biến đổi
ngày giờ tag vì tag chỉ có metadata thời gian.

### 5.2. Query keys

Tạo `tagKeys` theo scope board:

```ts
export const tagKeys = {
  all: ["task-tags"] as const,
  board: (boardId: string, params?: GetTagsParams) =>
    [...tagKeys.all, "board", boardId, params ?? {}] as const,
  tasks: (boardId: string, tagId: string, params?: GetTasksByTagParams) =>
    [...tagKeys.all, "tasks", boardId, tagId, params ?? {}] as const,
};
```

Mở rộng `taskKeys`/`filtersAreEqual` để so sánh `tagIds` theo giá trị, không
theo reference. Khi normalize filters, loại duplicate và sort copy của `tagIds`
để query key ổn định; không mutate array do component sở hữu.

## 6. API layer

### 6.1. `FE/src/features/tags/api/tag-api.ts`

Implement:

```ts
getByBoard(boardId: string, params?: GetTagsParams)
create(boardId: string, data: CreateTagRequest)
update(boardId: string, tagId: string, data: UpdateTagRequest)
delete(boardId: string, tagId: string)
getTasksByTag(boardId: string, tagId: string, params?: GetTasksByTagParams)
```

Mapping:

```txt
GET    /task/boards/:boardId/tags
POST   /task/boards/:boardId/tags
PATCH  /task/boards/:boardId/tags/:tagId
DELETE /task/boards/:boardId/tags/:tagId
GET    /task/boards/:boardId/tags/:tagId/tasks
```

`getByBoard` mặc định gửi `includeDeleted: false` hoặc bỏ query vì backend đã
lọc active khi không truyền cờ. Không expose deleted tags trong picker.

### 6.2. Mở rộng `FE/src/features/tasks/api/task-api.ts`

Thêm request type:

```ts
export type ReplaceTaskTagsRequest = { tagIds: string[] };
```

Thêm methods:

```ts
replaceTags(taskId: string, data: ReplaceTaskTagsRequest)
attachTag(taskId: string, tagId: string)
detachTag(taskId: string, tagId: string)
```

Mapping:

```txt
PATCH  /task/:taskId/tags
POST   /task/:taskId/tags/:tagId
DELETE /task/:taskId/tags/:tagId
```

Mở rộng `buildListParams`:

- gửi `tagIds` bằng `filters.tagIds.join(",")` sau khi unique;
- chỉ gửi `tagMode` khi có ít nhất một tag id;
- giữ các filter schedule hiện tại;
- không gửi `tagIds=` rỗng, vì clear filter phải quay về query không có tag.

## 7. Hooks và cache behavior

### 7.1. Board tag hooks

`useTags(boardId, params?, options?)`:

- query key `tagKeys.board(boardId, params)`;
- enabled khi có board id;
- debounce search ở component hoặc truyền search đã debounce, không gửi request
  mỗi keystroke.

`useCreateTag(boardId)`:

- mutation `tagApi.create`;
- validate nhẹ ở client (`trim`, max 50, hex), backend vẫn là authority;
- `onSuccess`: set/insert tag vào board cache, invalidate board tag queries,
  toast success;
- nếu form đang ở tag picker, trả tag mới về callback để chọn vào draft, chưa
  tự attach trước khi user bấm Apply.

`useUpdateTag(boardId)`:

- cập nhật tag trong mọi `tagKeys.board(boardId, ...)` cache;
- invalidate task list caches để các `TaskTagSummary.name/color` được refetch;
- cập nhật tag đang được render trong task detail nếu task hiện tại chứa tag đó.

`useDeleteTag(boardId)`:

- mở confirm trước mutation, cảnh báo tag sẽ bị gỡ khỏi mọi task nhưng task
  không bị xoá;
- xóa tag khỏi board cache hoặc invalidate board cache;
- invalidate các task list cache và task detail/query-by-tag liên quan vì backend
  soft-delete toàn bộ `taskTags`;
- nếu task detail đang mở chứa tag đó, loại tag khỏi selected task sau khi
  server thành công hoặc refetch detail/list.

`useTasksByTag(boardId, tagId, params?, options?)`:

- query key `tagKeys.tasks(...)`;
- giữ response `{ tag, tasks }` để màn hình gom nhóm có heading màu đúng;
- invalidate sau create/update/delete/attach/detach khi query đang dùng.

### 7.2. Task tag mutation hooks

Tạo `useReplaceTaskTags` trong `features/tasks/hooks`:

- nhận `{ taskId, tagIds }`;
- bỏ duplicate và giữ thứ tự user chọn trước khi gửi;
- không optimistic update vì replace-all có thể bị `403`, `404` hoặc race giữa
  hai tab;
- `onSuccess`: gọi `replaceTaskAcrossCaches(queryClient, response.data)`,
  callback `onTaskUpdated(response.data)` cho detail và toast;
- `tagIds: []` vẫn gọi mutation để clear thật.

Tạo thêm `useAttachTaskTag` và `useDetachTaskTag` cho single-tag actions:

- cùng cập nhật `replaceTaskAcrossCaches` bằng `TaskResponse` trả về;
- disable action tương ứng khi request đang pending;
- không dùng đồng thời với Save của replace picker.

### 7.3. Sửa task cache cho tag filter

Trong `FE/src/features/tasks/utils/task-cache.ts`:

1. Mở rộng `matchesFilters`:
   - `ANY`: task có ít nhất một `task.tags[].id` trong `tagIds`;
   - `ALL`: task có đủ mọi id;
   - nếu `tagIds` rỗng thì không filter.
2. Khi response mutation đổi tags, replace task trong mọi query của list đó;
   query đang lọc tag mà task không còn khớp phải remove khỏi cache.
3. Khi task mới khớp một filtered query nhưng chưa có trong cache, chỉ append khi
   cần; ưu tiên invalidate query sau mutation để backend trả đúng `orderTask`.
4. Sửa detail cache từ `old ?? task` thành luôn set `task`, nếu query detail
   được dùng ở phase sau thì không giữ tag cũ.
5. Nếu tag CRUD chỉ trả `TagResponse`, invalidate prefix `taskKeys.lists()` vì
   chưa có danh sách task id để patch từng cache theo board.

## 8. UX task detail

### 8.1. Thay `LabelChip`

Trong `task-detail-meta-bar.tsx`, thay placeholder disabled bằng
`TaskTagsChip`:

- trigger hiển thị icon tag, số lượng hoặc `No labels`;
- hiển thị tối đa 2-3 màu tag dạng swatch/chip, phần dư là `+N`;
- task chưa có tag vẫn mở được picker để thêm;
- task `OVERDUE_LOCKED` cho phép xem nhưng disable Apply, kèm thông báo cần
  reschedule trước; không chặn các task lock state khác nếu backend cho phép.

### 8.2. `task-tags-picker.tsx`

Popover/modal có:

- search active tags;
- danh sách tag với color swatch, name và checkbox;
- selected tags ở đầu để remove nhanh;
- nút `Create tag` mở editor inline/dialog;
- `Apply` gửi toàn bộ `tagIds` hiện tại;
- `Cancel` khôi phục draft từ `task.tags`;
- `Clear all` gọi Apply với `[]`;
- skeleton, empty state và error state cho board tags.

Luồng chọn tag:

1. Mở popover, tạo `draftTagIds` từ `task.tags`.
2. Toggle chỉ đổi draft local, không request từng click.
3. Nếu draft giống current ids, đóng mà không gọi API.
4. Apply gọi `useReplaceTaskTags` một lần.
5. Chỉ sau response thành công mới gọi `onTaskUpdated`; lỗi giữ nguyên draft để
   user sửa hoặc cancel.

Không dùng text button bo tròn cho swatch; dùng checkbox/list row quen thuộc,
icon tag và tooltip cho hành động quản lý nếu chỉ có icon.

## 9. UX quản lý tag cấp board

### 9.1. `board-tags-manager-dialog.tsx`

Đặt entry point trong header `DetailBoard` cạnh các board filters, có label/icon
`Manage tags`.

Màn hình manager:

- list active tag theo alphabet, swatch màu, số task nếu dữ liệu có thể bổ sung
  sau; không tự đếm bằng nhiều request ở MVP;
- `Create tag` mở form name + native color input + vài swatch preset;
- mỗi dòng có menu edit/delete;
- edit chỉ gửi field thay đổi, không gửi body rỗng;
- delete yêu cầu confirm và cảnh báo ảnh hưởng tới mọi task trong board;
- không hiển thị `includeDeleted=true` ở MVP; nhập lại tên cũ sẽ để backend revive.

### 9.2. `tag-editor-dialog.tsx`

Validation client:

- trim name, collapse whitespace để phản ánh normalization backend;
- 1-50 ký tự;
- color đúng `#RGB`/`#RRGGBB`;
- disable submit khi không đổi dữ liệu ở edit.

Map lỗi:

- `400 Tag name already exists`: giữ dialog mở và focus name;
- `400 color/name invalid`: hiển thị lỗi field hoặc message backend;
- `403`: toast không có quyền;
- `404`: invalidate board tags và đóng editor nếu tag không còn.

Không suy đoán quyền bằng role FE vì backend permission được kiểm tra theo board.

## 10. Hiển thị trên board và filter

### 10.1. Task card

Tạo `task-tag-badge.tsx` presentational:

- render color swatch + tên ngắn dưới task name;
- tối đa 2 tag, phần dư `+N` với tooltip/danh sách đầy đủ;
- không bắt event drag/click; card vẫn mở detail và drag handle không thay đổi;
- tag màu không hợp lệ từ dữ liệu cũ dùng fallback `#64748b` thay vì làm layout
  hỏng.

### 10.2. Board filter

Tạo `tag-filter.tsx` và tích hợp vào `DetailBoard`:

- load tags theo `boardId`;
- multi-select tag;
- segmented control `ANY`/`ALL`, mặc định `ANY` khi có từ hai tag;
- clear filter trả `taskFilters` về không có `tagIds/tagMode`;
- hiển thị summary `Tags: ...` và loading state.

`hasActiveFilters` phải tính cả `taskFilters.tagIds`, để filter tag cũng disable
drag/reorder giống filter schedule hiện tại.

Khi filter đổi:

- `BoardDndProvider` tiếp tục truyền cùng `taskFilters` xuống `ListColumn`;
- `useTasks` tạo query key mới bằng normalized `tagIds/tagMode`;
- mỗi list gọi backend với `tagIds=id1,id2` và `tagMode` tương ứng.

## 11. Màn hình gom task theo tag

Implement data hook `useTasksByTag` trong MVP để không lãng phí endpoint BE.
UI có thể là phase sau:

- `TagTasksDialog` mở từ manager khi user chọn `View tasks`;
- hiển thị heading tag + màu, list task trả về từ API;
- hỗ trợ filter `listId`, `name`, `status` nếu product cần;
- click task dùng `TaskDetailProvider.openTask` nếu dialog nằm trong board
  context;
- không tạo thêm query riêng cho từng list, vì endpoint đã sort theo board/list.

Nếu chưa có nhu cầu màn hình này, giữ hook/API ở phase data layer và chưa thêm
entry point UI.

## 12. Error, lock và concurrent edit

Thông báo tối thiểu:

| Mã/tình huống | UX |
| --- | --- |
| `400` duplicate name | Giữ form mở, báo tên đã tồn tại |
| `400` invalid tagIds/foreign board | Không đổi local task, refetch tags/task |
| `403` thiếu tag permission | Toast không có quyền thao tác |
| `403` overdue locked | Đọc message backend, hướng user reschedule trước |
| `404` board/tag/task | Invalidate cache; đóng picker nếu resource biến mất |
| `404 Task tag not found` khi detach | Refetch task canonical, không coi là fatal UI |
| network/unknown | Toast fallback, giữ dữ liệu server trước mutation |

MVP chấp nhận race condition replace-all giữa hai tab theo tài liệu BE. Không
tự merge draft với response cũ; response cuối cùng từ server là canonical.
Version/`updatedAt` conflict cần backend hỗ trợ trước khi FE implement.

## 13. Trình tự triển khai

### Phase 1 - Contract và data layer

1. Thêm `TaskTagSummary`, `TagResponse`, request/response types.
2. Thêm `tags` vào `TaskResponse` và `tagIds/tagMode` vào `TaskListFilters`.
3. Tạo `tagApi`, `tagKeys`, task tag API methods và build query params.
4. Tạo `useTags`, `useTasksByTag`, replace/attach/detach hooks.
5. Sửa `taskKeys` normalization và cache helper cho tag filters/detail.
6. Chạy `npm run build` để bắt mọi consumer bị thiếu `tags`.

### Phase 2 - Task detail picker

1. Tạo `TaskTagsChip` và `TaskTagsPicker`.
2. Thay `LabelChip` placeholder.
3. Implement draft multi-select + Apply/Cancel/Clear.
4. Đồng bộ `TaskDetailProvider.selectedTask` và list cache sau response.
5. Xử lý overdue lock, loading, empty/error và permission errors.

### Phase 3 - Board tag management

1. Tạo `TagEditorDialog` và `BoardTagsManagerDialog`.
2. Thêm entry point manager vào `DetailBoard`.
3. Implement create/edit/delete + confirm + cache invalidation.
4. Khi rename/color/delete tag, đảm bảo task cards/detail không giữ metadata cũ.

### Phase 4 - Board filter và hiển thị

1. Tạo `TagFilter` trong board header.
2. Truyền filter qua `DetailBoard -> BoardDndProvider -> ListColumn -> useTasks`.
3. Render `TaskTagBadge` trong task card.
4. Kiểm tra filter tag không phá drag/drop và pagination/list ordering.

### Phase 5 - Group view và polish (tuỳ ưu tiên)

1. Dùng `useTasksByTag` cho `TagTasksDialog` hoặc view riêng.
2. Thêm keyboard navigation, tooltip, responsive mobile và color contrast.
3. Chỉ thêm realtime tag sau khi có board/task socket contract rõ ràng.

## 14. Verification checklist

Chạy trong `FE/`:

```bash
npm run build
npm run lint
```

Manual integration với backend chạy:

- board không có tag: chip hiển thị `No labels`, picker có empty state;
- tạo tag với color mặc định và color hex hợp lệ;
- tạo tên trùng khác hoa thường báo lỗi mà không đóng form;
- sửa name/color cập nhật manager, picker, card và task detail;
- chọn một/nhiều tag rồi Apply, response task có đúng `tags`;
- Apply `[]` clear toàn bộ tag;
- attach cùng tag hai lần không tạo duplicate;
- detach tag đang gắn cập nhật task; detach tag không gắn xử lý `404`;
- tag khác board bị backend từ chối và FE không hiển thị optimistic sai;
- delete tag đang dùng làm tag biến mất khỏi mọi task sau refetch, task vẫn còn;
- task `OVERDUE_LOCKED` xem được tag nhưng mutation bị chặn với hướng dẫn
  reschedule;
- filter `ANY`/`ALL` trả đúng task cho từng list;
- clear tag filter refetch về danh sách ban đầu;
- mở task từ card sau filter vẫn thấy đúng tag;
- task mutation từ status/schedule/assign vẫn giữ `tags` nguyên vẹn;
- đổi tag trong một query không làm duplicate task trong các cache khác;
- reload board/detail vẫn lấy đúng tags từ API.

## 15. Acceptance criteria

- `LabelChip` placeholder đã được thay bằng tag picker hoạt động.
- Task response FE khai báo và render `tags: TaskTagSummary[]`.
- CRUD tag board gọi đúng endpoint và xử lý soft delete/revive theo backend.
- Gắn/gỡ tag dùng `PATCH /task/:taskId/tags` cho flow multi-select, hỗ trợ
  clear bằng mảng rỗng.
- Mọi mutation thành công cập nhật detail cache và mọi task-list cache liên quan
  bằng response server; không còn local optimistic state không được xác nhận.
- Filter `ANY`/`ALL` gửi đúng query backend và trở thành một phần query key.
- Task card hiển thị màu/tên tag ổn định, không phá drag/drop.
- Permission, lock, duplicate, cross-board và not-found cases có feedback rõ.
- Build, lint và checklist manual hoàn tất.

## 16. Rủi ro và quyết định

- Backend task response hiện đã có `tags`; nếu môi trường FE gặp response cũ
  thiếu field, dùng fallback `tags ?? []` ở boundary fetch trong thời gian migrate,
  nhưng type canonical vẫn nên là `tags: TaskTagSummary[]`.
- Query task hiện key theo `listId`, chưa có `boardId`; tag CRUD nên invalidate
  toàn bộ `taskKeys.lists()` ở MVP để không hiển thị màu/tên cũ. Có thể thêm
  `boardId` vào query key sau khi board cache ownership được chuẩn hoá.
- Backend chưa emit realtime cho tag mutation; REST refetch/cache update là
  MVP. Realtime cần thêm event/board room trước khi triển khai.
- Không expose `includeDeleted` trong picker. Việc revive tag đã xoá xảy ra tự
  nhiên khi create lại tên, đúng contract backend.
