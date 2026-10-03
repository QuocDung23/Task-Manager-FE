# FE Plan - Implement Task Drag-Drop Với API `moveTask`

## 1. Mục tiêu

Implement drag-drop task trong board detail để user có thể:

- Kéo task đổi thứ tự trong cùng một list.
- Kéo task từ list này sang list khác cùng board.
- FE update UI mượt bằng optimistic update.
- FE rollback đúng khi BE trả lỗi.
- FE dùng đúng API move task hiện tại của BE, không dùng contract cũ `PATCH /task/reorderTask`.

Plan này dựa trên BE hiện tại:

- `Manage -Task/BE/src/modules/tasks/task.router.ts`
- `Manage -Task/BE/src/modules/tasks/task.controller.ts`
- `Manage -Task/BE/src/modules/tasks/task.service.ts`
- `Manage -Task/BE/src/modules/tasks/task.repository.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/request/moveTask.req.ts`
- `Manage -Task/BE/src/modules/tasks/dtos/response/task.res.ts`

Và FE hiện tại:

- `FE/src/components/boards/detail-board.tsx`
- `FE/src/components/lists/list-column.tsx`
- `FE/src/components/tasks/task-card.tsx`
- `FE/src/features/tasks/api/task-api.ts`
- `FE/src/features/tasks/hooks/useTasks.ts`
- `FE/src/features/tasks/types/index.ts`

## 2. Contract BE cần bám sát

### 2.1 Endpoint

BE mount task router dưới `/task`, route move là:

```http
PATCH /task/:taskId/move
```

Request params:

```ts
{
  taskId: string;
}
```

Request body:

```ts
{
  sourceListId: string;
  targetListId: string;
  orderedTaskIds: string[];
}
```

Response:

```ts
{
  success: true;
  data: {
    movedTask: TaskResponse;
    sourceTasks: TaskResponse[];
    targetTasks: TaskResponse[];
  };
}
```

### 2.2 Rule quan trọng từ BE

FE bắt buộc gửi `orderedTaskIds` là **toàn bộ active task ids trong target list sau khi drop**, theo đúng thứ tự mới.

Case reorder trong cùng list:

```ts
sourceListId === targetListId
orderedTaskIds = all task ids của list đó sau reorder
```

BE validate:

- `orderedTaskIds` không rỗng.
- Không có duplicate id.
- Phải chứa `taskId` đang move.
- Tất cả id phải thuộc list đó.
- Số lượng id phải bằng toàn bộ active tasks của list.
- Response `sourceTasks` là `[]`.
- Response `targetTasks` là full tasks của list sau reorder.

Case move sang list khác:

```ts
sourceListId !== targetListId
orderedTaskIds = all task ids của target list sau khi task được thả vào
```

BE validate:

- `taskId` phải đang thuộc `sourceListId`.
- `sourceListId` và `targetListId` phải cùng board.
- Mọi id khác `taskId` trong `orderedTaskIds` phải thuộc target list.
- `orderedTaskIds.length` phải bằng số task active hiện có của target list + task vừa move.
- BE tự update `listId` của moved task sang `targetListId`.
- BE tự reorder lại source list còn lại để đóng khoảng trống.
- Response `sourceTasks` là full tasks của source list sau khi bỏ moved task.
- Response `targetTasks` là full tasks của target list sau khi nhận moved task.

### 2.3 Điều FE không nên làm

- Không gọi API nếu drop vào đúng vị trí cũ.
- Không gửi `sourceTaskIds`; BE hiện tại không nhận field này.
- Không gửi partial target list.
- Không tự tính `orderTask`; BE tự set `orderTask = index * 65536`.
- Không để task detail/delete/dropdown bị trigger drag ngoài ý muốn.

## 3. Hiện trạng FE

FE đã có nền tảng tốt:

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` đã có trong `FE/package.json`.
- Drag-drop list đã được implement ở `DetailBoard`.
- `ListColumn` hiện đang tự gọi `useTasks(list.id)` để load tasks.
- `TaskCard` đang mở task detail khi click và có dropdown delete.
- `taskApi` đã có CRUD task cơ bản.

FE chưa có:

- Type request/response cho move task.
- `taskApi.move(...)`.
- Hook mutation `useMoveTask`.
- Sortable wrapper cho từng task card.
- DnD context cho task cross-list.
- Optimistic update across query cache `["tasks", sourceListId]` và `["tasks", targetListId]`.
- State/logic để xử lý empty list droppable area.

## 4. Kiến trúc đề xuất

Giữ list drag-drop ở level `DetailBoard`, nhưng thêm một `DndContext` riêng cho task hoặc mở rộng context hiện tại bằng typed id.

Khuyến nghị implement task DnD ở level board, không để mỗi `ListColumn` tự có `DndContext`, vì cross-list cần biết cả source và target list.

Tạo state task theo board ở `DetailBoard` hoặc một component mới:

```txt
DetailBoard
  DndContext list reorder hiện tại
  BoardTaskDndProvider hoặc TaskDndBoard
    ListColumn
      SortableTaskCard[]
```

Nếu muốn giảm thay đổi trong `DetailBoard`, tạo component trung gian:

```txt
FE/src/components/tasks/task-dnd-board.tsx
```

Component này nhận:

```ts
{
  lists: ListResponse[];
  boardId: string;
  disabled?: boolean;
}
```

Nhưng vì `DetailBoard` đang render `SortableListColumn`, cách ít đụng nhất là:

- Giữ `DndContext` list hiện tại trong `DetailBoard`.
- Implement task DnD bên trong `ListColumn` trước cho same-list reorder.
- Sau đó nâng task DnD lên `DetailBoard` để hỗ trợ cross-list.

Tuy nhiên mục tiêu có cross-list, nên plan chính nên đi theo hướng board-level task DnD.

## 5. File cần sửa/tạo

### 5.1 Sửa task types

File:

```txt
FE/src/features/tasks/types/index.ts
```

Thêm:

```ts
export type MoveTaskRequest = {
  sourceListId: string;
  targetListId: string;
  orderedTaskIds: string[];
};

export type MoveTaskResponse = {
  movedTask: TaskResponse;
  sourceTasks: TaskResponse[];
  targetTasks: TaskResponse[];
};
```

Cân nhắc bổ sung field BE đang trả:

```ts
export type TaskStatusAction = "TODO" | "IN_PROGRESS" | "DONE" | string;

export type TaskResponse = {
  // fields hiện tại
  statusAction?: TaskStatusAction;
};
```

Nếu enum thật trong Prisma khác tên, giữ `statusAction?: string` để không block FE.

### 5.2 Sửa task API layer

File:

```txt
FE/src/features/tasks/api/task-api.ts
```

Thêm method:

```ts
move: async (
  taskId: string,
  data: MoveTaskRequest,
): Promise<ApiResponse<MoveTaskResponse>> => {
  const response = await axiosLocal.patch<ApiResponse<MoveTaskResponse>>(
    `/task/${taskId}/move`,
    data,
  );
  return response.data;
}
```

Import thêm:

```ts
MoveTaskRequest,
MoveTaskResponse,
```

### 5.3 Tạo hook move task

File mới:

```txt
FE/src/features/tasks/hooks/useMoveTask.ts
```

Hook shape:

```ts
export type MoveTaskVariables = {
  taskId: string;
  sourceListId: string;
  targetListId: string;
  orderedTaskIds: string[];
};

export const useMoveTask = () => {
  return useMutation({
    mutationFn: ({ taskId, ...data }: MoveTaskVariables) =>
      taskApi.move(taskId, data),
  });
};
```

Không toast success mỗi lần kéo thả vì drag-drop có thể xảy ra liên tục. Chỉ toast error khi fail.

Optimistic update nên đặt ở nơi có đủ context lists/tasks, thường là component DnD, vì nó cần snapshot nhiều query:

```ts
queryClient.getQueryData<TaskApiResponse>(["tasks", sourceListId])
queryClient.getQueryData<TaskApiResponse>(["tasks", targetListId])
```

### 5.4 Tạo sortable task card

File mới:

```txt
FE/src/components/tasks/sortable-task-card.tsx
```

Trách nhiệm:

- Dùng `useSortable({ id: task.id, data: { type: "task", task, listId } })`.
- Wrap `TaskCard`.
- Apply `transform`, `transition`, `opacity`, `zIndex`.
- Truyền `dragHandleListeners`/`dragHandleAttributes` xuống `TaskCard` nếu muốn chỉ drag bằng handle.

Pseudo:

```tsx
type SortableTaskCardProps = {
  task: TaskResponse;
  listId: string;
  disabled?: boolean;
};
```

### 5.5 Sửa TaskCard để có drag handle

File:

```txt
FE/src/components/tasks/task-card.tsx
```

Thêm optional props:

```ts
dragHandleAttributes?: Record<string, unknown>;
dragHandleListeners?: Record<string, unknown>;
isDragging?: boolean;
disabled?: boolean;
```

UX:

- Thêm icon handle, ví dụ `GripVertical` từ `lucide-react`.
- Chỉ gắn listeners lên handle, không gắn lên toàn card.
- `onClick` mở detail vẫn hoạt động bình thường.
- Dropdown delete phải `stopPropagation` và `onPointerDown`.
- Khi dragging: opacity nhẹ, border/ring rõ hơn, cursor `grabbing`.

Điều quan trọng: nếu gắn listener lên toàn card, click mở detail rất dễ bị hiểu nhầm là drag. Nên dùng handle.

### 5.6 Sửa ListColumn để nhận tasks từ parent

File:

```txt
FE/src/components/lists/list-column.tsx
```

Hiện tại `ListColumn` tự gọi:

```ts
const { data, isLoading, isError } = useTasks(list.id);
const tasks = data?.data ?? [];
```

Để cross-list DnD mượt, nên cho parent quản lý task order. Sửa props:

```ts
tasks?: TaskResponse[];
isLoadingTasks?: boolean;
isErrorTasks?: boolean;
renderTask?: (task: TaskResponse) => ReactNode;
```

Pattern ít phá code:

- Nếu `tasks` prop được truyền vào thì dùng prop.
- Nếu không truyền thì fallback `useTasks(list.id)` như hiện tại.

```ts
const shouldUseExternalTasks = Array.isArray(tasksProp);
const taskQuery = useTasks(list.id, { enabled: !shouldUseExternalTasks });
const tasks = tasksProp ?? taskQuery.data?.data ?? [];
```

Vì `useTasks` hiện chưa nhận options, có 2 lựa chọn:

- Sửa `useTasks(listId, options?)`.
- Hoặc tách `ListColumnContent` để tránh conditional hook.

Khuyến nghị sửa `useTasks` nhận options.

### 5.7 Sửa useTasks để hỗ trợ enabled/options

File:

```txt
FE/src/features/tasks/hooks/useTasks.ts
```

Sửa signature:

```ts
export const useTasks = (
  listId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery<TaskApiResponse>({
    queryKey: ["tasks", listId],
    queryFn: () => taskApi.getAllByListId(listId),
    enabled: Boolean(listId) && (options?.enabled ?? true),
  });
};
```

Nếu sau này cần stale time cho drag-drop:

```ts
staleTime: 10_000
```

### 5.8 Tạo board-level task DnD component

File mới:

```txt
FE/src/components/tasks/task-dnd-board.tsx
```

Trách nhiệm:

- Nhận `orderedLists`.
- Load tasks cho từng list hoặc đọc query cache đã được `ListColumn` load.
- Tạo local state:

```ts
type TasksByListId = Record<string, TaskResponse[]>;
```

- Sync local state từ queries khi task data thay đổi.
- Wrap vùng lists bằng task `DndContext`.
- Render `ListColumn` với `tasks` từ local state.
- Trong mỗi list, render `SortableContext` cho task ids.
- Handle cross-list drag.

Vì số list trong board có thể nhiều, có 2 hướng load tasks:

1. Giữ mỗi `ListColumn` gọi `useTasks` và dùng query cache trong DnD.
2. Tạo child `TaskListColumnDnd` bên trong map, mỗi child gọi `useTasks(list.id)` rồi báo data lên parent.

Khuyến nghị thực tế: dùng hướng 2 để không vi phạm rules of hooks khi số list thay đổi.

Shape:

```txt
TaskDndBoard
  DndContext
    lists.map(list =>
      TaskDndListColumn
        useTasks(list.id)
        useEffect(reportTasksToParent)
        SortableContext verticalListSortingStrategy
        ListColumn tasks={tasksByListId[list.id]} renderTask={...}
    )
```

### 5.9 Empty list droppable

Cross-list move vào list rỗng cần droppable target là list body, không chỉ task card.

Trong list body tạo droppable id riêng:

```ts
const listDropId = `list:${list.id}`;
```

Khi `over.id` là:

- task id: target list lấy từ task metadata hoặc map taskId -> listId.
- `list:${listId}`: target list là list id đó, insert index là cuối list.

Nên dùng typed ids để không nhầm list drag và task drag:

```ts
type DragData =
  | { type: "task"; task: TaskResponse; listId: string }
  | { type: "task-list"; listId: string };
```

## 6. Drag end algorithm

### 6.1 Helper tìm source/target

Cần helper:

```ts
function findListIdByTaskId(tasksByListId, taskId): string | null
```

Và helper parse empty list drop:

```ts
function parseListDropId(id: UniqueIdentifier): string | null
```

### 6.2 Same-list reorder

Input:

- `taskId = active.id`
- `sourceListId = active.data.current.listId`
- `targetListId = sourceListId`
- `over.id = task id trong cùng list`

Flow:

```ts
const oldIndex = sourceTasks.findIndex((task) => task.id === taskId);
const newIndex = sourceTasks.findIndex((task) => task.id === over.id);
if (oldIndex === newIndex) return;

const nextTasks = arrayMove(sourceTasks, oldIndex, newIndex);
setTasksByListId({ ...prev, [sourceListId]: nextTasks });

moveTask({
  taskId,
  sourceListId,
  targetListId: sourceListId,
  orderedTaskIds: nextTasks.map((task) => task.id),
});
```

### 6.3 Cross-list move

Input:

- `sourceListId` từ active data.
- `targetListId` từ `over` data hoặc `list:${listId}`.
- `overTaskId` nếu thả lên task.

Flow:

```ts
const movingTask = sourceTasks.find((task) => task.id === taskId);
const nextSourceTasks = sourceTasks.filter((task) => task.id !== taskId);

const cleanTargetTasks = targetTasks.filter((task) => task.id !== taskId);
const insertIndex = overTaskId
  ? cleanTargetTasks.findIndex((task) => task.id === overTaskId)
  : cleanTargetTasks.length;

const nextTargetTasks = [
  ...cleanTargetTasks.slice(0, insertIndex),
  { ...movingTask, listId: targetListId },
  ...cleanTargetTasks.slice(insertIndex),
];
```

Call BE:

```ts
moveTask({
  taskId,
  sourceListId,
  targetListId,
  orderedTaskIds: nextTargetTasks.map((task) => task.id),
});
```

### 6.4 Rollback và sync từ response

Trước optimistic update lưu snapshot:

```ts
const previousTasksByListId = tasksByListId;
```

On error:

```ts
setTasksByListId(previousTasksByListId);
queryClient.setQueryData(["tasks", sourceListId], previousSourceQuery);
queryClient.setQueryData(["tasks", targetListId], previousTargetQuery);
toast.error(...)
```

On success, dùng response BE làm source of truth:

Same-list:

```ts
setTasksByListId((prev) => ({
  ...prev,
  [targetListId]: response.data.targetTasks,
}));
queryClient.setQueryData(["tasks", targetListId], patchData(response.data.targetTasks));
```

Cross-list:

```ts
setTasksByListId((prev) => ({
  ...prev,
  [sourceListId]: response.data.sourceTasks,
  [targetListId]: response.data.targetTasks,
}));
queryClient.setQueryData(["tasks", sourceListId], patchData(response.data.sourceTasks));
queryClient.setQueryData(["tasks", targetListId], patchData(response.data.targetTasks));
```

Cuối cùng invalidate nhẹ:

```ts
queryClient.invalidateQueries({ queryKey: ["tasks", sourceListId] });
queryClient.invalidateQueries({ queryKey: ["tasks", targetListId] });
```

## 7. Collision và sensor config

Task dragging nên dùng:

```ts
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  }),
);
```

Collision:

- Same-list vertical: `closestCenter` ổn.
- Cross-list với empty list: cân nhắc `pointerWithin` trước, fallback `closestCenter`.

Có thể dùng custom collision đơn giản:

```ts
collisionDetection={(args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
}}
```

## 8. Phân tách list drag và task drag

Vì `DetailBoard` đã có DnD cho list, cần tránh nested DnD gây conflict.

Hai cách:

### Option A - Hai context riêng, handle riêng

- List drag chỉ bắt đầu từ list header handle.
- Task drag chỉ bắt đầu từ task handle.
- Đây là cách ít sửa nhất với code hiện tại.

### Option B - Một DndContext cho cả list và task

- Dùng `active.data.current.type`.
- `type: "list"` cho list column.
- `type: "task"` cho task card.
- `handleDragEnd` route theo type.
- Sạch hơn dài hạn nhưng sửa nhiều hơn.

Khuyến nghị: chọn Option A để ship nhanh, vì list DnD hiện tại đã ổn và có handle riêng ở `ListColumn`.

## 9. UX cần có

- Task có handle kéo riêng, icon nhỏ ở cạnh trái hoặc cạnh actions.
- Khi đang kéo: task nổi lên bằng shadow/ring, opacity task gốc giảm nhẹ.
- Khi mutation pending: vẫn cho user tiếp tục thao tác hay lock?
  - Khuyến nghị lock task drag trong các list liên quan tới mutation đang pending để tránh race condition.
- Không toast success khi reorder thành công.
- Toast error khi fail và rollback ngay.
- Empty list vẫn có vùng drop đủ cao.
- Khi đang search list, task drag vẫn có thể hoạt động nếu tasks đang visible; nếu muốn đơn giản hơn thì disable task drag khi `debouncedSearch` có value.

## 10. Race condition cần tránh

Các tình huống dễ lỗi:

- User kéo task A, mutation chưa xong, tiếp tục kéo task B trong cùng source/target.
- Query refetch cũ overwrite optimistic state.
- Task detail đang mở task vừa move, `selectedTask.listId` cũ.

Giải pháp:

- Track `movingTaskIds` hoặc `isMovingTask`.
- Disable drag cho source/target list khi mutation pending.
- On success, nếu task detail đang mở moved task thì update context bằng `movedTask`.
- Dùng BE response để patch query cache ngay, rồi mới invalidate.

## 11. Checklist implementation

1. Cập nhật type `MoveTaskRequest`, `MoveTaskResponse` trong `FE/src/features/tasks/types/index.ts`.
2. Thêm `taskApi.move(taskId, data)` trong `FE/src/features/tasks/api/task-api.ts`.
3. Tạo `FE/src/features/tasks/hooks/useMoveTask.ts`.
4. Sửa `useTasks` nhận option `enabled`.
5. Tạo `SortableTaskCard`.
6. Sửa `TaskCard` có drag handle và trạng thái dragging.
7. Sửa `ListColumn` để nhận task data/render task từ parent, vẫn fallback query cũ.
8. Tạo board-level task DnD component hoặc tích hợp trực tiếp vào `DetailBoard`.
9. Implement same-list reorder, gọi `PATCH /task/:taskId/move`.
10. Implement cross-list move, chỉ gửi `orderedTaskIds` của target list.
11. Implement empty list droppable bằng id `list:${listId}`.
12. Implement optimistic update + rollback + response sync.
13. Disable/guard drag khi mutation pending để tránh double move.
14. Test thủ công các case chính.

## 12. Test thủ công

### Same-list reorder

1. Tạo list có ít nhất 3 tasks.
2. Kéo task cuối lên đầu.
3. Refresh page.
4. Thứ tự vẫn đúng.
5. Network request:

```http
PATCH /task/{taskId}/move
```

Body phải là:

```json
{
  "sourceListId": "same-list-id",
  "targetListId": "same-list-id",
  "orderedTaskIds": ["full", "task", "ids", "after", "drop"]
}
```

### Cross-list move

1. Có list A và list B.
2. Kéo task từ A sang giữa B.
3. Task biến mất khỏi A và xuất hiện đúng vị trí trong B.
4. Refresh page.
5. Thứ tự vẫn đúng.
6. Body chỉ chứa `orderedTaskIds` của B sau drop, không chứa task còn lại của A.

### Empty target list

1. Có list rỗng.
2. Kéo task từ list khác vào list rỗng.
3. Request `orderedTaskIds` chỉ có task vừa move.
4. BE response `targetTasks` có task đó.

### Error rollback

1. Tắt BE hoặc sửa request tạm để BE trả lỗi.
2. Kéo task.
3. UI rollback về đúng vị trí cũ.
4. Có toast error.

### Interaction

1. Click task vẫn mở detail.
2. Click dropdown delete không bắt đầu drag.
3. Kéo bằng handle mới drag.
4. Kéo list vẫn hoạt động như trước.

## 13. Ghi chú triển khai quan trọng

- BE đã sort task theo `orderTask asc`, nên FE chỉ cần tin vào response/query order.
- `orderedTaskIds` phải lấy từ local optimistic target list sau khi drop.
- Same-list response `sourceTasks` rỗng là bình thường.
- Cross-list source order do BE tự normalize, FE nên dùng `sourceTasks` response để cập nhật lại cache.
- Không cần sửa BE cho plan này.
