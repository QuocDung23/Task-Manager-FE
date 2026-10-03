# Plan triển khai assign member cho task ở FE

## 1. Mục tiêu

Triển khai feature gán member cho task trên FE dựa trên API assignment đã có ở BE trong `Manage -Task/BE/src/modules/tasks/`.

Kết quả mong muốn:

- Trong task detail có thể xem danh sách assignee hiện tại.
- Có thể thêm một hoặc nhiều member vào task.
- Có thể gỡ từng member khỏi task.
- Task card trên board hiển thị avatar/initials assignee thay vì chỉ lưu ngầm trong dữ liệu.
- Sau khi assign/unassign, dữ liệu task trong React Query cache được cập nhật ngay ở list hiện tại, không cần reload trang.
- UI không cho người dùng chọn trùng member và xử lý tốt các lỗi `400`, `403`, `404`.

## 2. Contract BE đã đọc được

Nguồn chính:

- `Manage -Task/BE/src/modules/tasks/task.router.ts`
- `Manage -Task/BE/src/modules/tasks/task.controller.ts`
- `Manage -Task/BE/src/modules/tasks/task.service.ts`
- `Manage -Task/BE/src/modules/tasks/task.repository.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/assignTask.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/unassignTask.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts`

### 2.1. Task response

BE trả task theo shape:

```ts
type TaskResponse = {
  id: string;
  name: string;
  description?: string;
  orderTask: number;
  dueDate?: string;
  listId: string;
  assign: string[];
  status: "ACTIVE" | "INACTIVE";
  statusAction?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
```

Ghi chú:

- `assign` là danh sách `userId` đang được assign vào task.
- BE đã query kèm `taskAssignments` ở các flow `getAllTasks`, `getTaskById`, `updateTask`, `moveTask`, `assignTask`, `unassignTask`, nên FE có thể tin `assign` là dữ liệu mới nhất sau mutation.
- FE hiện đã có `assign: string[]` trong `FE/src/features/tasks/types/index.ts`, nhưng chưa map sang user name/avatar.

### 2.2. Assign task

Endpoint:

```http
PATCH /task/:taskId/assign
Content-Type: application/json

{
  "userIds": ["uuid-user-1", "uuid-user-2"]
}
```

Ý nghĩa:

- Đây là replace-all endpoint.
- Danh sách assignee hiện tại sẽ được thay bằng đúng `userIds` gửi lên.
- User nào đang assign nhưng không nằm trong `userIds` mới sẽ bị unassign bằng soft delete.
- `userIds` bắt buộc `min(1)`, không được gửi mảng rỗng.
- `userIds` không được trùng, BE sẽ reject duplicate.
- Mọi `userId` trong body phải là active board member của board chứa task.
- Nếu có user không thuộc board, BE trả `403 Forbidden`.
- `assignedById` được lấy từ access token, FE không cần gửi.

Response:

```ts
ApiResponse<TaskResponse>
```

### 2.3. Unassign task

Endpoint:

```http
DELETE /task/:taskId/assign/:userId
```

Ý nghĩa:

- Gỡ 1 member khỏi task.
- Nếu assignment active không tồn tại, BE trả `404 Task assignment not found`.
- Phù hợp để gỡ từng assignee và để clear assignee cuối cùng, vì endpoint assign không cho gửi `userIds: []`.

Response:

```ts
ApiResponse<TaskResponse>
```

### 2.4. Rule nghiệp vụ quan trọng cho FE

- Không dùng `PATCH /assign` với mảng rỗng.
- Khi thêm member mới, FE nên gửi toàn bộ danh sách sau khi merge:

```ts
const nextUserIds = [...task.assign, selectedUserId];
taskApi.assign(task.id, { userIds: nextUserIds });
```

- Khi gỡ member, ưu tiên gọi `DELETE /assign/:userId`.
- Khi thay nhiều member trong picker, nếu kết quả vẫn còn ít nhất 1 user thì dùng `PATCH /assign`.
- Nếu kết quả là 0 user thì gọi `DELETE` lần lượt cho các assignee đang active hoặc chỉ cho phép gỡ từng người.

## 3. Hiện trạng FE liên quan

Các file FE cần quan tâm:

- `FE/src/features/tasks/types/index.ts`
- `FE/src/features/tasks/api/task-api.ts`
- `FE/src/features/tasks/hooks/useTasks.ts`
- `FE/src/features/tasks/hooks/useUpdateTask.ts`
- `FE/src/components/tasks/task-detail-content.tsx`
- `FE/src/components/tasks/task-card.tsx`
- `FE/src/components/tasks/task-detail-context.tsx`
- `FE/src/components/boards/detail-board.tsx`
- `FE/src/components/boards/board-dnd-provider.tsx`
- `FE/src/features/boards/api/board-api.ts`
- `FE/src/features/boards/types/index.ts`
- `FE/src/features/projects/api/project-api.ts`
- `FE/src/features/users/api/user-api.ts`
- `FE/src/features/users/hooks/useUsers.ts`
- `FE/src/components/ui/avatar.tsx`
- `FE/src/utils/getInitials.ts`
- `FE/src/utils/getAvatarUrl.ts`

Hiện tại:

- `TaskResponse.assign` đã tồn tại.
- `TaskDetailContent` đang render assignee bằng UUID trực tiếp:

```tsx
{task.assign.map((user) => <span>{user}</span>)}
```

- `TaskCard` chưa hiển thị assignee.
- `taskApi` chưa có `assign`/`unassign`.
- Chưa có hook `useAssignTask`/`useUnassignTask`.
- `TaskDetailContext` chỉ lưu `selectedTask`, chưa có helper update selected task sau mutation.
- Board page chỉ biết `boardId`; có fetch `board` qua `useBoard(boardId)` nên có thể lấy `projectId` từ board response.

## 4. Vấn đề nguồn dữ liệu member

BE task assignment yêu cầu user phải là active board member, nhưng hiện trong BE đã đọc:

- Có `POST /board/:boardId/members` để thêm member vào board.
- Chưa thấy endpoint `GET /board/:boardId/members`.
- `GET /board/:boardId` không trả danh sách board members.
- `GET /project/:projectId` theo DTO hiện tại cũng không trả `members`, dù FE type có khai báo `members?: ProjectMemberUser[]`.
- FE có `GET /user?email=&status=ACTIVE` để search user theo email, dùng trong add project member.

Vì vậy cần quyết định nguồn candidate cho assignee:

### Option khuyến nghị

Bổ sung hoặc yêu cầu BE expose danh sách active board members:

```http
GET /board/:boardId/members
```

Response đề xuất:

```ts
type BoardMemberUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  boardMemberId?: string;
  role?: string;
};
```

Lý do:

- Picker chỉ hiển thị người chắc chắn assign được.
- Tránh UX chọn xong bị `403`.
- Task card/detail có thể map `assign userId` sang name/avatar ổn định.

### Option tạm thời nếu chưa sửa BE

Dùng search user theo email (`useUsers`) để chọn user, sau đó gọi assign:

- Ưu điểm: làm FE nhanh hơn.
- Nhược điểm: có thể chọn user không thuộc board và bị `403`.
- UI phải hiện lỗi rõ: "User này chưa là member của board".
- Không map được toàn bộ assignee đang có nếu chỉ có userId và chưa search user đó.

Plan bên dưới ưu tiên Option khuyến nghị, nhưng vẫn ghi fallback để có thể triển khai từng bước.

## 5. Thiết kế data/API ở FE

### 5.1. Cập nhật task types

File: `FE/src/features/tasks/types/index.ts`

Thêm request types:

```ts
export type AssignTaskRequest = {
  userIds: string[];
};

export type UnassignTaskParams = {
  taskId: string;
  userId: string;
};
```

Cân nhắc thêm `statusAction` vào `TaskResponse` vì BE response schema có field này:

```ts
statusAction?: string;
```

### 5.2. Cập nhật task API client

File: `FE/src/features/tasks/api/task-api.ts`

Thêm:

```ts
assign: async (
  taskId: string,
  data: AssignTaskRequest,
): Promise<ApiResponse<TaskResponse>> => {
  const response = await axiosLocal.patch<ApiResponse<TaskResponse>>(
    `/task/${taskId}/assign`,
    data,
  );
  return response.data;
},

unassign: async (
  taskId: string,
  userId: string,
): Promise<ApiResponse<TaskResponse>> => {
  const response = await axiosLocal.delete<ApiResponse<TaskResponse>>(
    `/task/${taskId}/assign/${userId}`,
  );
  return response.data;
},
```

### 5.3. Thêm board member API nếu BE có endpoint list member

File: `FE/src/features/boards/types/index.ts`

```ts
export type BoardMemberUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
};
```

File: `FE/src/features/boards/api/board-api.ts`

```ts
getMembers: async (boardId: string): Promise<ApiResponse<BoardMemberUser[]>> => {
  const response = await axiosLocal.get<ApiResponse<BoardMemberUser[]>>(
    `/board/${boardId}/members`,
  );
  return response.data;
},
```

File mới: `FE/src/features/boards/hooks/useBoardMembers.ts`

```ts
export const useBoardMembers = (
  boardId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["board-members", boardId],
    queryFn: () => boardApi.getMembers(boardId),
    enabled: Boolean(boardId) && (options?.enabled ?? true),
    staleTime: 30_000,
  });
};
```

Fallback nếu chưa có endpoint:

- Không tạo `useBoardMembers`.
- Tạo component picker dùng `useUsers(email)`.
- Chỉ hiển thị assignee dạng UUID hoặc fetch từng user bằng `GET /user/:userId` nếu cần.

## 6. React Query hooks cho assignment

### 6.1. Helper cập nhật task trong cache

Nên tạo helper dùng chung để tránh duplicate giữa assign/unassign/update task.

File mới đề xuất: `FE/src/features/tasks/utils/task-cache.ts`

```ts
import type { QueryClient } from "@tanstack/react-query";
import type { TaskApiResponse, TaskResponse } from "../types";

export function updateTaskInListCache(
  queryClient: QueryClient,
  task: TaskResponse,
) {
  queryClient.setQueryData<TaskApiResponse | undefined>(
    ["tasks", task.listId],
    (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((item) => (item.id === task.id ? task : item)),
      };
    },
  );
}
```

Nếu sau này có query detail riêng `["task", task.id]`, update thêm:

```ts
queryClient.setQueryData(["task", task.id], { success: true, data: task });
```

### 6.2. Hook `useAssignTask`

File mới: `FE/src/features/tasks/hooks/useAssignTask.ts`

Behavior:

- Mutation nhận `{ taskId, listId, userIds }`.
- Validate client-side: nếu `userIds.length === 0`, không gọi API assign.
- Optimistic update optional, nhưng giai đoạn đầu nên cập nhật cache trong `onSuccess` để an toàn.
- On success: update task trong `["tasks", listId]`, toast success nhẹ.
- On error:
  - `400`: duplicate/invalid payload.
  - `403`: user không phải board member hoặc thiếu quyền `ASSIGN_TASK`.
  - default: assign failed.

Pseudo:

```ts
export const useAssignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      userIds,
    }: {
      taskId: string;
      listId: string;
      userIds: string[];
    }) => taskApi.assign(taskId, { userIds }),
    onSuccess: (res) => {
      updateTaskInListCache(queryClient, res.data);
      toast.success("Assignees updated");
    },
    onError: (error: any) => {
      const status = error.response?.status;
      if (status === 403) {
        toast.error("User is not an active board member or you do not have permission.");
        return;
      }
      if (status === 400) {
        toast.error(error.response?.data?.message || "Invalid assignee list.");
        return;
      }
      toast.error(error.response?.data?.message || "Assign task failed");
    },
  });
};
```

### 6.3. Hook `useUnassignTask`

File mới: `FE/src/features/tasks/hooks/useUnassignTask.ts`

Behavior:

- Mutation nhận `{ taskId, listId, userId }`.
- Gọi `taskApi.unassign(taskId, userId)`.
- On success: update task trong cache bằng response.
- On 404: thông báo assignment đã không còn tồn tại, invalidate `["tasks", listId]` để sync lại.

Pseudo:

```ts
export const useUnassignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; listId: string; userId: string }) =>
      taskApi.unassign(taskId, userId),
    onSuccess: (res) => {
      updateTaskInListCache(queryClient, res.data);
      toast.success("Assignee removed");
    },
    onError: (error: any, variables) => {
      if (error.response?.status === 404) {
        toast.error("Assignee was already removed.");
        queryClient.invalidateQueries({ queryKey: ["tasks", variables.listId] });
        return;
      }
      toast.error(error.response?.data?.message || "Unassign task failed");
    },
  });
};
```

## 7. Đồng bộ selected task trong task detail

Hiện `TaskDetailContext` chỉ set `selectedTask` khi mở dialog. Nếu assign mutation update React Query cache, task list/card sẽ đúng, nhưng dialog đang mở vẫn có thể giữ object cũ.

Nên mở rộng context ở `FE/src/components/tasks/task-detail-context.tsx`:

```ts
interface TaskDetailContextValue {
  selectedTask: TaskResponse | null;
  isOpen: boolean;
  isPending: boolean;
  openTask: (task: TaskResponse) => void;
  closeTask: () => void;
  updateSelectedTask: (task: TaskResponse) => void;
}
```

Implementation:

```ts
const updateSelectedTask = useCallback((task: TaskResponse) => {
  setSelectedTask((current) => {
    if (!current || current.id !== task.id) return current;
    return task;
  });
}, []);
```

Trong `TaskDetailContent`, sau assign/unassign success:

```ts
updateSelectedTask(res.data);
```

Lợi ích:

- Dialog phản ánh assignee mới ngay.
- Không cần đóng mở task detail.
- Giữ cùng pattern local state của name/description/dueDate.

## 8. UI/UX trong task detail

File chính: `FE/src/components/tasks/task-detail-content.tsx`

### 8.1. Trạng thái hiển thị

Thay block Assignees hiện tại bằng component riêng để tránh file detail phình quá lớn:

File mới đề xuất:

- `FE/src/components/tasks/task-assignees.tsx`
- hoặc `FE/src/components/tasks/task-assignee-picker.tsx`

Props đề xuất:

```ts
type TaskAssigneesProps = {
  task: TaskResponse;
  boardId: string;
  members?: BoardMemberUser[];
  isLoadingMembers?: boolean;
  onTaskUpdated?: (task: TaskResponse) => void;
};
```

Vấn đề: `TaskDetailContent` hiện chỉ nhận `task`, chưa nhận `boardId`. Có 2 hướng:

- Hướng A: truyền `boardId` từ `DetailBoard` xuống context/provider.
- Hướng B: vì task có `listId` nhưng không có `boardId`, dùng board members được fetch ở `DetailBoard` rồi truyền qua context.

Khuyến nghị hướng A:

- `TaskDetailProvider` nhận thêm `boardId`.
- `DetailBoard` render:

```tsx
<TaskDetailProvider boardId={boardId}>
  ...
</TaskDetailProvider>
```

- Context expose `boardId`.
- `TaskAssignees` lấy `boardId` từ context và gọi `useBoardMembers(boardId)`.

### 8.2. Hiển thị assignee hiện tại

Nếu có board members:

- Map `task.assign` sang `membersById`.
- Hiển thị avatar group hoặc chips:
  - Avatar image nếu có.
  - Fallback initials bằng `getInitials(user.name || user.email)`.
  - Text: name, email.
  - Nút remove dạng icon `X` trên chip/avatar.

Nếu không tìm thấy user trong `membersById`:

- Hiển thị fallback `Unknown user`.
- Tooltip/title chứa `userId`.
- Vẫn cho remove bằng `DELETE`, vì task đang có assignment active.

### 8.3. Picker thêm assignee

UI đề xuất:

- Nút icon `UserPlus` cạnh title `Assignees`.
- Click mở dropdown/dialog nhỏ.
- Có input search theo name/email.
- Danh sách member active của board.
- Member đã assign hiển thị checked/disabled.
- Click member chưa assign sẽ gọi:

```ts
const nextUserIds = Array.from(new Set([...task.assign, member.id]));
assignTask({ taskId: task.id, listId: task.listId, userIds: nextUserIds });
```

Vì BE `PATCH /assign` là replace-all, FE bắt buộc merge với danh sách cũ, không gửi mỗi user mới.

### 8.4. Remove assignee

Click remove trên chip/avatar:

```ts
unassignTask({
  taskId: task.id,
  listId: task.listId,
  userId,
});
```

Không dùng assign với `userIds` sau khi remove nếu danh sách có thể rỗng.

### 8.5. Loading/disabled states

- Disable nút add/remove khi mutation đang pending.
- Nếu đang load board members, hiển thị skeleton/chip loading nhỏ.
- Nếu lỗi load members:
  - Vẫn hiển thị userId fallback từ `task.assign`.
  - Disable add picker hoặc cho fallback search user, tùy quyết định.

## 9. UI trên task card

File: `FE/src/components/tasks/task-card.tsx`

Mục tiêu:

- Card hiển thị assignee compact, không chiếm quá nhiều chiều cao.
- Không cần thao tác assign trực tiếp trên card ở phase đầu.

Thiết kế:

- Thêm avatar group ở cuối card hoặc cạnh metadata.
- Hiển thị tối đa 3 assignee.
- Nếu nhiều hơn 3, hiển thị `+N`.
- Nếu không có member data, hiển thị initials theo userId hoặc icon `Users`.

Vấn đề truyền dữ liệu:

- `TaskCard` hiện chỉ nhận `task`.
- Nếu cần map userId sang avatar/name, cần context board members ở cấp board.

Khuyến nghị:

- Tạo `BoardMembersProvider` trong `DetailBoard` hoặc `TaskDetailProvider` mở rộng để cung cấp `membersById`.
- `TaskCard` gọi hook context `useBoardMembersContext()` để render avatar.
- Nếu muốn scope nhỏ hơn ở phase đầu, chỉ render count:

```tsx
{task.assign.length > 0 && (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <Users className="h-3.5 w-3.5" />
    {task.assign.length}
  </div>
)}
```

Phase đẹp hơn sẽ dùng AvatarGroup.

## 10. Cấu trúc component/hook đề xuất

Tạo mới:

- `FE/src/features/tasks/hooks/useAssignTask.ts`
- `FE/src/features/tasks/hooks/useUnassignTask.ts`
- `FE/src/features/tasks/utils/task-cache.ts`
- `FE/src/components/tasks/task-assignees.tsx`
- `FE/src/components/tasks/assignee-avatar-group.tsx`
- Nếu có endpoint board members:
  - `FE/src/features/boards/hooks/useBoardMembers.ts`
  - thêm type `BoardMemberUser`

Cập nhật:

- `FE/src/features/tasks/types/index.ts`
- `FE/src/features/tasks/api/task-api.ts`
- `FE/src/components/tasks/task-detail-context.tsx`
- `FE/src/components/tasks/task-detail-content.tsx`
- `FE/src/components/tasks/task-card.tsx`
- `FE/src/components/boards/detail-board.tsx`

## 11. Luồng dữ liệu đề xuất

### 11.1. Board load

1. `DetailBoard` nhận `boardId` từ route.
2. `useBoard(boardId)` lấy board detail.
3. Nếu có `GET /board/:boardId/members`, `useBoardMembers(boardId)` lấy member list.
4. `TaskDetailProvider` hoặc `BoardMembersProvider` cung cấp `boardId`, `members`, `membersById`.
5. `BoardDndProvider` vẫn load task theo từng list như hiện tại.

### 11.2. Mở task detail

1. User click task card.
2. `openTask(task)` lưu task vào context.
3. `TaskDetailContent` render task.
4. `TaskAssignees` đọc `task.assign` và `membersById`.

### 11.3. Add assignee

1. User mở picker.
2. Chọn board member chưa assign.
3. FE tạo `nextUserIds = unique([...task.assign, userId])`.
4. Gọi `PATCH /task/:taskId/assign`.
5. BE trả task mới.
6. FE cập nhật:
   - `["tasks", task.listId]`
   - `selectedTask` trong context
7. UI đóng picker hoặc giữ mở để assign thêm.

### 11.4. Remove assignee

1. User click remove trên assignee.
2. Gọi `DELETE /task/:taskId/assign/:userId`.
3. BE trả task mới.
4. FE cập nhật cache và selected task.
5. Nếu 404, invalidate list tasks để sync.

## 12. Error handling cần có

### 12.1. `400 Bad Request`

Nguyên nhân có thể:

- `userIds` rỗng khi gọi assign.
- `userIds` trùng.
- UUID sai format.

FE xử lý:

- Client-side dedupe bằng `Set`.
- Không gọi assign nếu danh sách rỗng.
- Toast: "Danh sách assignee không hợp lệ."

### 12.2. `403 Forbidden`

Nguyên nhân có thể:

- User được chọn không phải active board member.
- Current user không có permission `ASSIGN_TASK` hoặc `UNASSIGN_TASK`.

FE xử lý:

- Nếu có board members endpoint, lỗi này hiếm hơn.
- Toast: "Bạn không có quyền gán task hoặc user chưa là member của board."
- Không update optimistic nếu chưa có rollback tốt.

### 12.3. `404 Not Found`

Nguyên nhân:

- Task đã bị xoá.
- Assignment đã bị gỡ ở nơi khác.

FE xử lý:

- Invalidate `["tasks", listId]`.
- Nếu task không còn tồn tại, đóng dialog.
- Toast ngắn: "Task hoặc assignee không còn tồn tại."

## 13. Permission và UX

BE đang enforce permission ở middleware:

- `TaskPermissions.ASSIGN_TASK`
- `TaskPermissions.UNASSIGN_TASK`

FE hiện chưa có permission model rõ trong type user/board. Vì vậy:

- Phase đầu cứ render control assign/unassign.
- Nếu BE trả `403`, hiển thị toast.
- Phase sau nếu BE trả role/permissions cho board member, FE có thể ẩn/disable control trước.

Không nên hard-code role name ở FE khi chưa có contract rõ.

## 14. Các bước triển khai chi tiết

### Phase 0: Chốt nguồn member

1. Xác nhận BE có bổ sung `GET /board/:boardId/members` hay không.
2. Nếu có:
   - Implement `boardApi.getMembers`.
   - Implement `useBoardMembers`.
   - Dùng member list cho picker và avatar.
3. Nếu chưa có:
   - Implement fallback picker search user bằng email.
   - Chấp nhận assign có thể fail `403`.
   - Assignee đang có chỉ hiển thị UUID hoặc fetch từng user theo id.

### Phase 1: API và hooks

1. Cập nhật `TaskResponse` nếu thiếu `statusAction`.
2. Thêm `AssignTaskRequest`.
3. Thêm `taskApi.assign`.
4. Thêm `taskApi.unassign`.
5. Tạo `updateTaskInListCache`.
6. Tạo `useAssignTask`.
7. Tạo `useUnassignTask`.
8. Đảm bảo toast lỗi đủ rõ.

### Phase 2: Đồng bộ task detail context

1. Thêm `updateSelectedTask` vào `TaskDetailContext`.
2. Sau update name/description/dueDate cũng có thể gọi `updateSelectedTask(res.data)` để context luôn mới.
3. Sau assign/unassign bắt buộc gọi `updateSelectedTask(res.data)`.

### Phase 3: Task detail assignees UI

1. Tách block assignee khỏi `TaskDetailContent`.
2. Tạo `TaskAssignees`.
3. Render danh sách assignee hiện tại bằng chip/avatar.
4. Add nút `UserPlus`.
5. Tạo picker:
   - Search input.
   - List member.
   - Disable member đã assign.
   - Empty state.
   - Loading state.
6. Hook add gọi `useAssignTask`.
7. Hook remove gọi `useUnassignTask`.

### Phase 4: Task card indicator

1. Thêm avatar/count ở `TaskCard`.
2. Không làm card click bị conflict với dropdown/detail.
3. Giới hạn số avatar để layout ổn định.
4. Kiểm tra card vẫn drag/drop tốt.

### Phase 5: Polish

1. Tooltip/title cho avatar/chip hiển thị email/name.
2. Fallback unknown user.
3. Empty state "No assignees" giữ nhẹ, không chiếm nhiều diện tích.
4. Disable remove khi mutation pending.
5. Đảm bảo dark mode class nhất quán với style hiện tại.

## 15. Acceptance criteria

- Gọi được `PATCH /task/:taskId/assign` khi thêm assignee.
- Gọi được `DELETE /task/:taskId/assign/:userId` khi gỡ assignee.
- Không bao giờ gọi assign với `userIds: []`.
- Không gửi duplicate userId.
- Sau mutation thành công, task detail cập nhật ngay.
- Sau mutation thành công, task card/list cache cập nhật ngay.
- Reload trang vẫn thấy assignee đúng vì `getAllTasks` trả `assign`.
- User không thuộc board hoặc thiếu quyền được báo lỗi rõ.
- Remove assignee cuối cùng hoạt động qua endpoint `DELETE`.
- Drag/drop task vẫn giữ nguyên behavior sau khi thêm avatar/count vào card.

## 16. Test checklist

Manual test:

- Mở board có nhiều list/task.
- Mở task detail của task chưa có assignee.
- Assign 1 member.
- Assign thêm member thứ 2.
- Thử assign lại người đã assign, UI phải disable hoặc không gọi API.
- Remove 1 member.
- Remove member cuối cùng.
- Đóng/mở lại task detail, assignee vẫn đúng.
- Reload page, assignee vẫn đúng.
- Drag task sang list khác, assignee vẫn đi theo task.
- Update task name/description sau khi đã assign, assignee không bị mất.
- Dùng user không thuộc board để assign, thấy toast lỗi `403`.
- Mô phỏng assignment stale: gỡ một người ở nơi khác rồi gỡ lại trên FE, thấy sync/invalidate.

Build/test:

```bash
cd FE
npm run build
```

Nếu project có lint ổn định:

```bash
cd FE
npm run lint
```

## 17. Rủi ro và điểm cần xác nhận

- Thiếu endpoint list board members là rủi ro lớn nhất cho UX.
- `assignTaskRequestBodySchema` đang `.min(1)`, nên clear all không thể dùng PATCH.
- `ProjectResponseDto` BE hiện không map `members`, nên không nên dựa vào `project.members` ở FE.
- `getInitials` hiện đang split từng ký tự (`split("")`) thay vì split theo khoảng trắng; nếu dùng initials nhiều hơn nên sửa helper này để initials đẹp hơn.
- `TaskDetailContext` giữ object task snapshot, nên nếu không thêm `updateSelectedTask`, dialog sẽ stale sau mutation.
- Nếu dùng optimistic update, phải rollback kỹ cho cả list cache và selected task; phase đầu nên update theo response để giảm rủi ro.

## 18. Thứ tự implement khuyến nghị

1. Thêm task API `assign`/`unassign` và hooks.
2. Thêm cache helper và context `updateSelectedTask`.
3. Làm UI assignee trong task detail với fallback hiển thị UUID trước.
4. Sau khi có nguồn board members, nâng cấp picker và avatar/name.
5. Thêm assignee indicator ở task card.
6. Chạy build, test manual các case chính.
