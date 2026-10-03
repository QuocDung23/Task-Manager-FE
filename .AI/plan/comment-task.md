# Plan triển khai comment cho task ở FE

## 1. Mục tiêu

Triển khai feature comment cho task ở FE dựa trên module comment đã có ở BE trong:

- `Manage -Task/BE/src/modules/tasks/comment/`
- `Manage -Task/BE/src/modules/realtime/`

Kết quả mong muốn:

- Trong task detail có thể xem danh sách comment gốc của task.
- Có thể tạo comment mới.
- Có thể reply comment 1 cấp.
- Có thể xem/load thêm reply theo từng comment.
- Có thể sửa comment/reply của chính mình.
- Có thể xoá comment/reply theo rule BE.
- UI comment hiển thị user avatar/name, thời gian, nội dung, số lượng reply.
- Dữ liệu comment cập nhật mượt bằng React Query cache, không cần reload task detail.
- Phase 1 dùng REST API ổn định trước.
- Phase 2 có thể bật realtime Socket.IO dựa trên event BE đã expose.

## 2. Contract BE đã đọc được

Nguồn chính:

- `Manage -Task/BE/src/modules/tasks/comment/comment.router.ts`
- `Manage -Task/BE/src/modules/tasks/comment/comment.controller.ts`
- `Manage -Task/BE/src/modules/tasks/comment/comment.service.ts`
- `Manage -Task/BE/src/modules/tasks/comment/comment.repository.ts`
- `Manage -Task/BE/src/modules/tasks/comment/dtos/request/`
- `Manage -Task/BE/src/modules/tasks/comment/dtos/response/`
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts`
- `Manage -Task/BE/src/modules/realtime/task-comment.socket.ts`

### 2.1. Base route

Backend mount router ở:

```ts
app.use("/task", [Modules.taskRouter, Modules.taskCommentRouter]);
```

Vì vậy FE gọi API comment theo prefix:

```http
/task/:taskId/comments
```

### 2.2. Comment response

BE trả comment theo shape:

```ts
type CommentUserLite = {
  id: string;
  name: string;
  avatar: string | null;
};

type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user?: CommentUserLite;
  replies?: TaskComment[];
};
```

Ghi chú:

- DTO BE dùng `Date`, nhưng qua HTTP FE nhận string ISO.
- `user` được include sẵn gồm `id`, `name`, `avatar`.
- `replyCount` là số reply active.
- `replies` chỉ có khi query root comments với `includeReplies=true`.
- BE chỉ hỗ trợ reply 1 cấp. Reply không thể là parent của reply khác.

### 2.3. Get root comments

Endpoint:

```http
GET /task/:taskId/comments?cursor=&limit=&includeReplies=
```

Query:

```ts
type GetTaskCommentsQuery = {
  cursor?: string;
  limit?: number; // min 1, max 50, default 20
  includeReplies?: boolean; // default false
};
```

Response:

```ts
type GetTaskCommentsResponse = {
  items: TaskComment[];
  nextCursor: string | null;
};
```

Behavior quan trọng:

- Repository fetch theo `createdAt DESC`.
- Service reverse lại trước khi trả về, nên mỗi page FE nhận theo thứ tự cũ -> mới.
- `nextCursor` là id của comment cũ nhất trong batch vừa fetch.
- UX hợp lý: ban đầu hiển thị page mới nhất, nút `Load older comments` ở phía trên danh sách.

### 2.4. Create root comment

Endpoint:

```http
POST /task/:taskId/comments
Content-Type: application/json

{
  "content": "..."
}
```

Validation:

- `content.trim()` min 1.
- max 2000 ký tự.

Permission:

- Access token bắt buộc.
- Cần `CREATE_TASK_COMMENT`.

Response:

```ts
ApiResponse<TaskComment>
```

### 2.5. Get replies

Endpoint:

```http
GET /task/:taskId/comments/:commentId/replies?cursor=&limit=
```

Query:

```ts
type GetCommentRepliesQuery = {
  cursor?: string;
  limit?: number; // min 1, max 50, default 20
};
```

Response:

```ts
type GetCommentRepliesResponse = {
  items: TaskComment[];
  nextCursor: string | null;
};
```

Behavior:

- Chỉ nhận `commentId` là root comment active.
- Nếu truyền reply làm parent, BE trả bad request.

### 2.6. Create reply

Endpoint:

```http
POST /task/:taskId/comments/:commentId/replies
Content-Type: application/json

{
  "content": "..."
}
```

Validation:

- `content.trim()` min 1.
- max 2000 ký tự.
- Parent phải là root comment active.

Response:

```ts
ApiResponse<TaskComment>
```

### 2.7. Update comment/reply

Endpoint:

```http
PATCH /task/:taskId/comments/:commentId
Content-Type: application/json

{
  "content": "..."
}
```

Rule:

- Chỉ author được sửa comment/reply.
- BE check `comment.userId === actorUserId`.
- Nếu không phải author, BE trả `403`.

Response:

```ts
ApiResponse<TaskComment>
```

### 2.8. Delete comment/reply

Endpoint:

```http
DELETE /task/:taskId/comments/:commentId
```

Rule:

- Author được xoá comment/reply của mình.
- User có `DELETE_TASK_COMMENT` có thể xoá comment/reply của người khác.
- Xoá root comment sẽ soft delete luôn các reply active bên dưới.
- Xoá reply chỉ soft delete reply đó.

Response:

```ts
type DeleteCommentResponse = {
  comment: TaskComment;
  isReply: boolean;
  parentCommentId: string | null;
  deletedReplyIds: string[];
};
```

## 3. Realtime BE đã có

Backend đã expose Socket.IO:

Client events:

```ts
"task:join": (payload: { taskId: string }, ack?: (res) => void) => void;
"task:leave": (payload: { taskId: string }, ack?: (res) => void) => void;
```

Server events:

```ts
"task:comment_created"
"task:comment_replied"
"task:comment_updated"
"task:comment_reply_updated"
"task:comment_deleted"
"task:comment_reply_deleted"
```

Socket auth:

- BE nhận token từ `socket.handshake.auth.token`.
- Hoặc nhận token từ cookie `accessToken`.
- Khi join task room, BE check quyền `VIEW_TASK`.

FE hiện tại:

- `FE/package.json` chưa có `socket.io-client`.
- Chưa có socket service/hook.

Kết luận:

- Phase 1 nên làm REST trước để hoàn thiện UI/cache.
- Phase 2 thêm realtime sau, tái sử dụng cùng cache update helpers.

## 4. Hiện trạng FE liên quan

Các file đã có:

- `FE/src/features/tasks/types/index.ts`
- `FE/src/features/tasks/api/task-api.ts`
- `FE/src/features/tasks/hooks/useTasks.ts`
- `FE/src/features/tasks/hooks/useUpdateTask.ts`
- `FE/src/components/tasks/task-detail.tsx`
- `FE/src/components/tasks/task-detail-content.tsx`
- `FE/src/components/tasks/task-detail-context.tsx`
- `FE/src/components/tasks/task-card.tsx`
- `FE/src/components/boards/detail-board.tsx`
- `FE/src/services/axios.ts`
- `FE/src/features/users/hooks/useCurrentUser.ts`
- `FE/src/components/ui/avatar.tsx`
- `FE/src/components/ui/textarea.tsx`
- `FE/src/components/ui/button.tsx`
- `FE/src/components/ui/dropdown-menu.tsx`
- `FE/src/components/ui/skeleton.tsx`
- `FE/src/utils/getInitials.ts`
- `FE/src/utils/getAvatarUrl.ts`

Hiện tại:

- `taskApi` chưa có API comment.
- `features/tasks/types` chưa có type comment.
- `TaskDetailContent` là nơi tốt nhất để gắn comment section.
- `TaskDetailProvider` chỉ giữ `selectedTask`; comment state nên để React Query quản lý, không nhét vào task context.
- FE đã có `useCurrentUser`, dùng được để quyết định hiển thị action edit/delete cho comment của mình.

## 5. Thiết kế data/API ở FE

### 5.1. Cập nhật task types

File: `FE/src/features/tasks/types/index.ts`

Thêm:

```ts
export type TaskCommentUser = {
  id: string;
  name: string;
  avatar: string | null;
};

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user?: TaskCommentUser;
  replies?: TaskComment[];
};

export type TaskCommentsResponse = {
  items: TaskComment[];
  nextCursor: string | null;
};

export type GetTaskCommentsParams = {
  cursor?: string;
  limit?: number;
  includeReplies?: boolean;
};

export type GetTaskCommentRepliesParams = {
  cursor?: string;
  limit?: number;
};

export type CreateTaskCommentRequest = {
  content: string;
};

export type UpdateTaskCommentRequest = {
  content: string;
};

export type DeleteTaskCommentResponse = {
  comment: TaskComment;
  isReply: boolean;
  parentCommentId: string | null;
  deletedReplyIds: string[];
};
```

### 5.2. Cập nhật task API client

File: `FE/src/features/tasks/api/task-api.ts`

Thêm methods vào `taskApi`:

```ts
getComments: async (
  taskId: string,
  params?: GetTaskCommentsParams,
): Promise<ApiResponse<TaskCommentsResponse>> => {
  const response = await axiosLocal.get<ApiResponse<TaskCommentsResponse>>(
    `/task/${taskId}/comments`,
    { params },
  );
  return response.data;
},

createComment: async (
  taskId: string,
  data: CreateTaskCommentRequest,
): Promise<ApiResponse<TaskComment>> => {
  const response = await axiosLocal.post<ApiResponse<TaskComment>>(
    `/task/${taskId}/comments`,
    data,
  );
  return response.data;
},

getCommentReplies: async (
  taskId: string,
  commentId: string,
  params?: GetTaskCommentRepliesParams,
): Promise<ApiResponse<TaskCommentsResponse>> => {
  const response = await axiosLocal.get<ApiResponse<TaskCommentsResponse>>(
    `/task/${taskId}/comments/${commentId}/replies`,
    { params },
  );
  return response.data;
},

createCommentReply: async (
  taskId: string,
  commentId: string,
  data: CreateTaskCommentRequest,
): Promise<ApiResponse<TaskComment>> => {
  const response = await axiosLocal.post<ApiResponse<TaskComment>>(
    `/task/${taskId}/comments/${commentId}/replies`,
    data,
  );
  return response.data;
},

updateComment: async (
  taskId: string,
  commentId: string,
  data: UpdateTaskCommentRequest,
): Promise<ApiResponse<TaskComment>> => {
  const response = await axiosLocal.patch<ApiResponse<TaskComment>>(
    `/task/${taskId}/comments/${commentId}`,
    data,
  );
  return response.data;
},

deleteComment: async (
  taskId: string,
  commentId: string,
): Promise<ApiResponse<DeleteTaskCommentResponse>> => {
  const response = await axiosLocal.delete<ApiResponse<DeleteTaskCommentResponse>>(
    `/task/${taskId}/comments/${commentId}`,
  );
  return response.data;
},
```

## 6. Query key convention

Dùng key nhất quán:

```ts
export const taskCommentKeys = {
  all: ["task-comments"] as const,
  lists: () => [...taskCommentKeys.all, "list"] as const,
  list: (taskId: string) => [...taskCommentKeys.lists(), taskId] as const,
  replies: (taskId: string, commentId: string) =>
    [...taskCommentKeys.all, "replies", taskId, commentId] as const,
};
```

Nên đặt helper này ở:

```txt
FE/src/features/tasks/hooks/comment-query-keys.ts
```

Hoặc để trong:

```txt
FE/src/features/tasks/api/comment-query-keys.ts
```

Khuyến nghị: đặt trong `hooks` nếu chỉ hooks dùng.

## 7. Hooks cần thêm

### 7.1. useTaskComments

File: `FE/src/features/tasks/hooks/useTaskComments.ts`

Mục tiêu:

- Fetch root comments bằng `useInfiniteQuery`.
- Limit mặc định `20`.
- `includeReplies` mặc định `false` để tránh payload lớn.

Pseudo:

```ts
export const useTaskComments = (taskId: string, options?: { enabled?: boolean }) => {
  return useInfiniteQuery({
    queryKey: taskCommentKeys.list(taskId),
    queryFn: ({ pageParam }) =>
      taskApi.getComments(taskId, {
        cursor: pageParam,
        limit: 20,
        includeReplies: false,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: Boolean(taskId) && (options?.enabled ?? true),
    staleTime: 10_000,
  });
};
```

### 7.2. useTaskCommentReplies

File: `FE/src/features/tasks/hooks/useTaskCommentReplies.ts`

Mục tiêu:

- Fetch replies theo từng root comment.
- Chỉ enable khi user bấm mở replies hoặc reply composer.

Pseudo:

```ts
export const useTaskCommentReplies = (
  taskId: string,
  commentId: string,
  options?: { enabled?: boolean },
) => {
  return useInfiniteQuery({
    queryKey: taskCommentKeys.replies(taskId, commentId),
    queryFn: ({ pageParam }) =>
      taskApi.getCommentReplies(taskId, commentId, {
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: Boolean(taskId && commentId) && (options?.enabled ?? false),
    staleTime: 10_000,
  });
};
```

### 7.3. useCreateTaskComment

File: `FE/src/features/tasks/hooks/useCreateTaskComment.ts`

Behavior:

- Gọi `taskApi.createComment`.
- On success append comment mới vào cache root comments.
- Toast success nhẹ hoặc không toast nếu UX comment nên im lặng.

Khuyến nghị:

- Không toast success cho mỗi comment vì dễ ồn.
- Chỉ toast error.

### 7.4. useCreateTaskCommentReply

File: `FE/src/features/tasks/hooks/useCreateTaskCommentReply.ts`

Behavior:

- Gọi `taskApi.createCommentReply`.
- On success append reply vào reply cache nếu cache đã tồn tại.
- Tăng `replyCount` của root comment trong root comments cache.
- Nếu replies đang đóng, chỉ tăng count là đủ.

### 7.5. useUpdateTaskComment

File: `FE/src/features/tasks/hooks/useUpdateTaskComment.ts`

Behavior:

- Gọi `taskApi.updateComment`.
- Nếu response là root comment (`parentCommentId === null`), replace trong root comments cache.
- Nếu response là reply, replace trong reply cache của parent.

### 7.6. useDeleteTaskComment

File: `FE/src/features/tasks/hooks/useDeleteTaskComment.ts`

Behavior:

- Gọi `taskApi.deleteComment`.
- Nếu delete root:
  - remove root comment khỏi root comments cache.
  - remove/clear reply cache của root comment nếu cần.
- Nếu delete reply:
  - remove reply khỏi reply cache.
  - giảm `replyCount` của root comment.

## 8. Cache update helpers

Nên tạo helper để tránh logic lặp trong nhiều hooks:

File đề xuất:

```txt
FE/src/features/tasks/hooks/comment-cache.ts
```

Helper cần có:

```ts
appendRootComment(queryClient, taskId, comment)
replaceRootComment(queryClient, taskId, comment)
removeRootComment(queryClient, taskId, commentId)
incrementRootReplyCount(queryClient, taskId, parentCommentId)
decrementRootReplyCount(queryClient, taskId, parentCommentId)
appendReply(queryClient, taskId, parentCommentId, reply)
replaceReply(queryClient, taskId, parentCommentId, reply)
removeReply(queryClient, taskId, parentCommentId, replyId)
```

Lưu ý với `useInfiniteQuery` data shape:

```ts
type InfiniteData<ApiResponse<TaskCommentsResponse>> = {
  pages: ApiResponse<TaskCommentsResponse>[];
  pageParams: unknown[];
};
```

Khi update cache:

- Luôn giữ nguyên `pages` và `pageParams`.
- Chỉ clone page cần sửa.
- Không mutate trực tiếp object cũ.

## 9. UI components cần thêm

Tạo folder:

```txt
FE/src/components/tasks/comments/
```

Các component:

```txt
task-comments-section.tsx
task-comment-composer.tsx
task-comment-item.tsx
task-comment-replies.tsx
task-comment-actions.tsx
```

### 9.1. TaskCommentsSection

Props:

```ts
type TaskCommentsSectionProps = {
  taskId: string;
};
```

Nhiệm vụ:

- Gọi `useTaskComments(taskId)`.
- Render composer root comment.
- Render loading skeleton.
- Render empty state khi chưa có comment.
- Render list comment.
- Render nút `Load older comments` nếu `hasNextPage`.

Vị trí gắn:

File: `FE/src/components/tasks/task-detail-content.tsx`

Đặt sau section `Description`, trước footer:

```tsx
<TaskCommentsSection taskId={task.id} />
```

### 9.2. TaskCommentComposer

Props:

```ts
type TaskCommentComposerProps = {
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
};
```

Behavior:

- Dùng `Textarea`.
- Submit khi click button.
- Không submit nếu `trim()` rỗng.
- Hiển thị counter đơn giản `current/2000` nếu gần giới hạn hoặc luôn hiển thị nhỏ.
- `Escape` gọi cancel nếu có.
- Không cần submit bằng Enter vì comment multiline; có thể dùng `Cmd/Ctrl + Enter`.

### 9.3. TaskCommentItem

Props:

```ts
type TaskCommentItemProps = {
  taskId: string;
  comment: TaskComment;
  currentUserId?: string;
};
```

Render:

- Avatar user.
- Name.
- Relative/absolute time.
- Content với `white-space: pre-wrap`.
- Nút Reply.
- Nút Edit/Delete nếu `comment.userId === currentUserId`.
- `Edited` nếu `updatedAt !== createdAt`.
- Reply count + toggle replies.

Không dùng nested card. Mỗi comment chỉ là row/block trong section.

### 9.4. TaskCommentReplies

Props:

```ts
type TaskCommentRepliesProps = {
  taskId: string;
  parentComment: TaskComment;
  currentUserId?: string;
  open: boolean;
};
```

Behavior:

- Khi `open=true`, enable `useTaskCommentReplies`.
- Render `Load older replies` nếu `hasNextPage`.
- Render composer reply khi user bấm Reply.
- Reply item không hiện nút Reply tiếp.

### 9.5. TaskCommentActions

Props:

```ts
type TaskCommentActionsProps = {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};
```

Dùng `DropdownMenu` với icon `MoreVertical`, `Pencil`, `Trash2`.

## 10. Current user và permission UI

Dùng:

```ts
const { data: currentUserRes } = useCurrentUser();
const currentUserId = currentUserRes?.data.id;
```

Rule FE:

- Nếu `comment.userId === currentUserId`, hiện Edit/Delete.
- Nếu không phải author, mặc định không hiện Delete vì FE chưa có permission matrix rõ.
- Nếu sau này có permission context, có thể hiện Delete cho user có `DELETE_TASK_COMMENT`.

Rule BE vẫn là nguồn quyết định cuối cùng:

- Update: author only.
- Delete: author hoặc có `DELETE_TASK_COMMENT`.

## 11. Format thời gian

FE hiện chưa có helper date relative cho comment.

Tạo helper:

```txt
FE/src/utils/formatDateTime.ts
```

Đề xuất:

```ts
export function formatDateTime(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
```

Có thể thêm relative sau, nhưng absolute ổn và ít rủi ro.

## 12. UX chi tiết

### 12.1. Empty state

Khi chưa có comment:

```txt
No comments yet
```

Không cần giải thích dài trong app.

### 12.2. Loading state

Skeleton gồm:

- Avatar circle.
- Name/time line.
- 2 dòng content.

### 12.3. Error state

Nếu fetch comments lỗi:

- Hiển thị text ngắn.
- Có nút retry.

Mutation error:

- Dùng `toast.error(error.response?.data?.message || "Failed to ...")`.

### 12.4. Delete confirm

Nên có confirm nhẹ trước khi delete:

- Có thể dùng `window.confirm` cho MVP.
- Tốt hơn: tạo dialog confirm riêng nếu muốn polish.

Vì project đã có dialog delete task, nhưng comment delete nhỏ hơn, MVP có thể dùng confirm để tránh thêm nhiều UI.

## 13. Phase 2 realtime

Chỉ làm sau khi REST ổn.

### 13.1. Cài dependency

```bash
npm install socket.io-client
```

### 13.2. Tạo socket client

File đề xuất:

```txt
FE/src/services/socket.ts
```

Behavior:

- Base URL lấy từ `VITE_API_URL`, nhưng bỏ `/api` nếu BE socket nằm cùng host HTTP server.
- Gửi token từ `authStorage.getValidToken()` qua `auth: { token }`.
- `withCredentials: true`.

### 13.3. Tạo hook

File:

```txt
FE/src/features/tasks/hooks/useTaskCommentSocket.ts
```

Behavior:

- Khi task detail mở, connect/join room:

```ts
socket.emit("task:join", { taskId }, ack => ...)
```

- Cleanup:

```ts
socket.emit("task:leave", { taskId })
```

- Listen event và gọi cache helper:
  - `task:comment_created` -> append root.
  - `task:comment_replied` -> append reply + increment count.
  - `task:comment_updated` -> replace root.
  - `task:comment_reply_updated` -> replace reply.
  - `task:comment_deleted` -> remove root.
  - `task:comment_reply_deleted` -> remove reply + decrement count.

### 13.4. Chống duplicate realtime

Vì người tạo comment cũng nhận socket event, cache helper cần idempotent:

- Khi append root/reply, nếu item id đã tồn tại thì replace hoặc bỏ qua.
- Điều này tránh duplicate khi mutation success đã append rồi socket event cũng append.

## 14. Thứ tự triển khai khuyến nghị

### Phase 1: REST MVP

1. Thêm comment types trong `features/tasks/types`.
2. Thêm comment API methods trong `task-api`.
3. Thêm query keys.
4. Thêm hooks `useTaskComments`, `useTaskCommentReplies`.
5. Thêm mutation hooks create/update/delete root/reply.
6. Thêm cache helpers.
7. Build components trong `components/tasks/comments`.
8. Gắn `TaskCommentsSection` vào `TaskDetailContent`.
9. Chạy `npm run build`.
10. Test manual trên UI.

### Phase 2: Polish

1. Confirm delete dialog thay cho `window.confirm`.
2. Relative time nếu muốn.
3. Scroll behavior sau khi create comment/reply.
4. Loading optimistic UI nếu cần.
5. Nút retry cho từng replies list.

### Phase 3: Realtime

1. Cài `socket.io-client`.
2. Tạo socket service.
3. Tạo `useTaskCommentSocket`.
4. Gắn hook vào `TaskCommentsSection`.
5. Test 2 browser/user cùng mở task detail.

## 15. Checklist test manual

REST:

- Mở task detail thấy comment section.
- Task chưa có comment hiển thị empty state.
- Tạo root comment thành công.
- Không submit được comment rỗng.
- Comment dài quá 2000 ký tự bị chặn ở FE hoặc BE trả lỗi rõ.
- Load older comments hoạt động khi nhiều hơn `limit`.
- Reply một root comment thành công.
- Không có reply lồng sâu.
- Load older replies hoạt động.
- Author sửa root comment được.
- Author sửa reply được.
- User khác không thấy action edit của comment không thuộc mình.
- Author xoá reply được, `replyCount` giảm.
- Author xoá root comment được, comment biến mất khỏi list.
- Lỗi `403`, `404`, `500` hiển thị toast hợp lý.

Cache:

- Sau create/update/delete không cần reload.
- Đóng mở lại task detail vẫn fetch được dữ liệu đúng.
- Comment/reply không bị duplicate sau nhiều mutation.

Responsive:

- Dialog task detail không overflow ngang trên mobile.
- Comment content dài wrap đúng.
- Button/action không đè text.

Realtime phase:

- Browser A tạo comment, Browser B thấy comment.
- Browser A update comment, Browser B thấy update.
- Browser A delete root, Browser B remove root và replies.
- Browser A reply, Browser B thấy reply count tăng.

## 16. Rủi ro và lưu ý

- FE hiện chưa có permission context chi tiết, nên chỉ hiện edit/delete theo author. BE vẫn enforce permission thật.
- Nếu sau này muốn admin delete visible, cần expose permission của user trong board/project.
- Nếu dùng `includeReplies=true` cho root comments, cần merge replies từ response với reply cache cẩn thận. MVP nên dùng `includeReplies=false`.
- Cursor pagination dùng id nhưng BE map sang `createdAt`; nếu 2 comment cùng timestamp sát nhau vẫn thường ổn, nhưng idempotent cache helper sẽ giúp tránh duplicate.
- `TaskDetailProvider` không nên chứa comments để tránh state phình và lệch cache.
- Socket phase cần xử lý token refresh/reconnect; REST MVP không phụ thuộc socket nên ít rủi ro hơn.
