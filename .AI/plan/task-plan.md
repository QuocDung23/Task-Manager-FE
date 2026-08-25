# Plan triển khai Task FE theo BE hiện có

## 1. Mục tiêu

Triển khai phần task ở FE để:

- Tạo task theo từng list.
- Task sau khi tạo phải hiển thị nằm bên trong đúng list đã chọn.
- Hiển thị danh sách task của từng list.
- Xóa task khỏi list.
- Bám theo API task hiện có trong `Manage -Task/BE/`.

## 2. Context BE đã đọc

Module BE task nằm tại:

- `Manage -Task/BE/src/modules/tasks/task.router.ts`
- `Manage -Task/BE/src/modules/tasks/task.controller.ts`
- `Manage -Task/BE/src/modules/tasks/task.service.ts`
- `Manage -Task/BE/src/modules/tasks/task.repository.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/*`
- `Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts`
- `Manage -Task/BE/prisma/schema.prisma`

Router task được mount trong `app.ts`:

```ts
app.use("/task", Modules.taskRouter);
```

Các endpoint FE cần dùng:

```txt
POST   /task/:listId/tasks
GET    /task/:listId/tasks
GET    /task/:id
PUT    /task/:id
DELETE /task/:id
```

Payload tạo task:

```ts
{
  name: string;
  description?: string;
}
```

Response task chính:

```ts
{
  id: string;
  name: string;
  description?: string;
  orderTask: number;
  dueDate?: string;
  listId: string;
  assign: string[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

Lưu ý BE:

- Task thuộc về list qua `listId`.
- `GET /task/:listId/tasks` trả task theo list.
- `DELETE /task/:id` là soft delete: set `deletedAt` và status `INACTIVE`.
- Repository đang sort task theo `orderTask asc`.
- Query get all hỗ trợ `name`, `status`, pagination `page`, `limit`.

## 3. Cấu trúc FE nên tạo

Tạo feature mới theo pattern giống `features/lists`:

```txt
FE/src/features/tasks/
  api/
    task-api.ts
  hooks/
    useTasks.ts
    useCreateTask.ts
    useDeleteTask.ts
  types/
    index.ts
```

Tạo component UI task:

```txt
FE/src/components/tasks/
  task-card.tsx
  create-task-dialog.tsx
  delete-task-dialog.tsx
```

Sửa component list hiện có:

```txt
FE/src/components/lists/list-column.tsx
```

Mục tiêu của sửa `ListColumn`: thay vùng placeholder `No cards yet` bằng danh sách task thật của list, kèm nút tạo task trong list đó.

## 4. Types cho task

File: `FE/src/features/tasks/types/index.ts`

Cần khai báo:

```ts
export type TaskStatus = "ACTIVE" | "INACTIVE";

export type TaskResponse = {
  id: string;
  name: string;
  description?: string;
  orderTask: number;
  dueDate?: string;
  listId: string;
  assign: string[];
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateTaskRequest = {
  name: string;
  description?: string;
};

export type TaskApiResponse = {
  success: boolean;
  data: TaskResponse[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};
```

## 5. API layer

File: `FE/src/features/tasks/api/task-api.ts`

Implement các hàm:

```ts
taskApi.getAllByListId(listId, page, limit, name?, status?)
taskApi.create(listId, data)
taskApi.delete(id)
```

Endpoint mapping:

```ts
GET    /task/${listId}/tasks
POST   /task/${listId}/tasks
DELETE /task/${id}
```

Query params cho get all:

```ts
{
  page,
  limit,
  name: name || undefined,
  status: status || undefined,
}
```

## 6. Hooks React Query

### 6.1. Hiển thị task theo list

File: `FE/src/features/tasks/hooks/useTasks.ts`

Query key nên dùng:

```ts
["tasks", listId, page, limit, name, status]
```

Hook:

```ts
useTasks(listId, page = 1, limit = 100, name?, status?)
```

Hook này sẽ được gọi bên trong từng `ListColumn`, vì mỗi list cần tự load task của chính nó.

### 6.2. Tạo task

File: `FE/src/features/tasks/hooks/useCreateTask.ts`

Mutation:

```ts
useCreateTask(listId)
```

Sau khi tạo thành công:

- Toast `Create Task Successfully`.
- Invalidate query:

```ts
queryClient.invalidateQueries({ queryKey: ["tasks", listId] });
```

Điều này đảm bảo task mới được fetch lại và nằm trong đúng list.

### 6.3. Xóa task

File: `FE/src/features/tasks/hooks/useDeleteTask.ts`

Mutation:

```ts
useDeleteTask(listId)
```

Input mutation là `taskId`.

Sau khi xóa thành công:

- Toast `Delete Task Successfully`.
- Invalidate query:

```ts
queryClient.invalidateQueries({ queryKey: ["tasks", listId] });
```

Chỉ refresh task của list chứa task bị xóa.

## 7. UI tạo task

File: `FE/src/components/tasks/create-task-dialog.tsx`

Props:

```ts
type CreateTaskDialogProps = {
  listId: string;
};
```

Form fields:

- `name`: required, max 255 ký tự.
- `description`: optional, max 2000 ký tự.

Flow:

1. User bấm nút `Add task` trong list.
2. Mở dialog tạo task.
3. Submit gọi `useCreateTask(listId)`.
4. Tạo thành công thì reset form, đóng dialog.
5. React Query invalidate `["tasks", listId]`.
6. `ListColumn` fetch lại và render task mới trong list đó.

Nút tạo task nên nằm ở cuối danh sách task trong mỗi list.

## 8. UI hiển thị task trong list

File: `FE/src/components/tasks/task-card.tsx`

Props:

```ts
type TaskCardProps = {
  task: TaskResponse;
  listId: string;
};
```

Hiển thị tối thiểu:

- Tên task.
- Description nếu có.
- Menu actions hoặc nút xóa.

File cần sửa: `FE/src/components/lists/list-column.tsx`

Trong `ListColumn`:

1. Gọi:

```ts
const { data, isLoading, isError } = useTasks(list.id, 1, 100);
```

2. Lấy tasks:

```ts
const tasks = data?.data ?? [];
```

3. Thay vùng hiện tại:

```tsx
No cards yet
```

bằng:

```tsx
{isLoading && <loading state />}
{isError && <error state />}
{tasks.length > 0 && tasks.map((task) => <TaskCard key={task.id} task={task} listId={list.id} />)}
{tasks.length === 0 && !isLoading && <empty state />}
<CreateTaskDialog listId={list.id} />
```

Layout đề xuất:

- Header list giữ nguyên.
- Body list là vùng scroll dọc nếu task nhiều.
- Task card nằm trong list column.
- Empty state chỉ hiện khi list chưa có task.
- Nút `Add task` luôn nằm trong list, dưới task list.

## 9. UI xóa task

File: `FE/src/components/tasks/delete-task-dialog.tsx`

Props:

```ts
type DeleteTaskDialogProps = {
  task: TaskResponse;
  listId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
```

Flow:

1. User bấm action delete trên `TaskCard`.
2. Mở dialog confirm.
3. Confirm gọi `useDeleteTask(listId)` với `task.id`.
4. Thành công thì đóng dialog.
5. Invalidate `["tasks", listId]`.
6. Task biến mất khỏi đúng list.

## 10. Thứ tự implement đề xuất

### Phase 1: API và type

- [ ] Tạo `FE/src/features/tasks/types/index.ts`.
- [ ] Tạo `FE/src/features/tasks/api/task-api.ts`.
- [ ] Mapping đúng endpoint BE `/task/:listId/tasks` và `/task/:id`.

### Phase 2: Hooks

- [ ] Tạo `useTasks`.
- [ ] Tạo `useCreateTask`.
- [ ] Tạo `useDeleteTask`.
- [ ] Dùng query key theo `listId` để task không bị lẫn giữa các list.

### Phase 3: Component task

- [ ] Tạo `TaskCard`.
- [ ] Tạo `CreateTaskDialog`.
- [ ] Tạo `DeleteTaskDialog`.

### Phase 4: Gắn task vào list

- [ ] Sửa `FE/src/components/lists/list-column.tsx`.
- [ ] Gọi `useTasks(list.id, 1, 100)` trong từng list.
- [ ] Render task bên trong body của list.
- [ ] Đặt `CreateTaskDialog` trong từng list.
- [ ] Đảm bảo task mới tạo chỉ xuất hiện trong list có `list.id` tương ứng.

### Phase 5: Kiểm tra

- [ ] Vào board có nhiều list.
- [ ] Tạo task ở list A, kiểm tra task chỉ nằm trong list A.
- [ ] Tạo task ở list B, kiểm tra task chỉ nằm trong list B.
- [ ] Reload page, kiểm tra task vẫn hiển thị đúng list.
- [ ] Xóa task ở list A, kiểm tra list A refresh và list B không bị ảnh hưởng.
- [ ] Kiểm tra empty state khi list không có task.

## 11. Ghi chú rủi ro

- BE hiện chưa có endpoint reorder task, nên phase này chưa làm kéo thả task giữa các list.
- BE hiện create task chưa set `orderTask` theo số task hiện có, mặc định Prisma là `0`. Nếu sau này cần reorder hoặc sort chuẩn hơn, BE nên cập nhật logic tạo `orderTask`.
- Nếu số lượng list nhiều, mỗi `ListColumn` gọi `useTasks` riêng sẽ tạo nhiều request. Với scope hiện tại vẫn ổn vì yêu cầu là task nằm trong từng list. Sau này có thể tối ưu bằng endpoint lấy board kèm lists/tasks.
- Permission BE đang dùng `verifyTaskPermission`, FE chỉ cần xử lý lỗi permission bằng toast hiện có.

## 12. Definition of Done

- FE có feature `tasks` riêng gồm type, api, hooks.
- Mỗi list tự load task theo `list.id`.
- User tạo task trong list nào thì task xuất hiện trong list đó.
- User xóa task nào thì task đó biến mất khỏi list.
- UI không còn chỉ hiện `No cards yet` cố định khi list đã có task.
