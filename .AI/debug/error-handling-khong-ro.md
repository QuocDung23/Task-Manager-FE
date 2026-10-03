# Lỗi: FE chưa chia rõ phần error - người dùng không biết mình bị lỗi gì

## Ngày: 2026-09-10

## Triệu chứng
- Khi API trả lỗi (500, 403, 404, network error, timeout...), người dùng thường **không thấy thông báo nào**, hoặc chỉ thấy text chung chung kiểu `"Could not load projects. Please try again."`.
- Nhiều màn hình thuộc nhóm "đọc dữ liệu" (board, list, task, comment, notifications...) fail **âm thầm** — không toast, không error state, không retry.
- Message lỗi không nhất quán: chỗ tiếng Anh, chỗ tiếng Việt, chỗ ko dấu (`"Dang nhap that bai"`), fallback khác nhau giữa từng hook.
- Không có phân loại lỗi rõ: lỗi mạng / timeout / validation / không có quyền / không tìm thấy... hiển thị na ná nhau.

## Nguyên nhân

### 1. Không có lớp xử lý lỗi tập trung cho React Query
**File:** `FE/src/main.tsx:7`

```tsx
const queryClient = new QueryClient()   // ← không config gì cả
```

Tạo `QueryClient` trần, **không có** `QueryCache.onError` / `MutationCache.onError` / `defaultOptions`. Nên mọi lỗi của query/mutation không có cơ chế toast mặc định → phụ thuộc hoàn toàn vào việc mỗi hook tự xử lý (mà nhiều hook không xử lý).

### 2. ~20 hook query không hề surface lỗi
Các hook đọc dữ liệu sau **không có `onError`, không toast, không trả error state rõ ràng**:

| Hook | File |
|---|---|
| `useProjects` | `features/projects/hooks/useProjects.ts` |
| `useBoards` / `useBoard` / `useBoardsMembers` / `useBoardMembers` / `useBoardListCounts` | `features/boards/hooks/*.ts` |
| `useLists` / `useListById` | `features/lists/hooks/*.ts` |
| `useTasks` / `useTaskComments` / `useTaskCommentReplies` | `features/tasks/hooks/*.ts` |
| `useTaskActivities` | `features/task-activities/hooks/*.ts` |
| `useTags` / `useTasksByTag` | `features/tags/hooks/*.ts` |
| `useNotifications` (phần query) | `features/notifications/hooks/useNotifications.ts` |
| `useCurrentUser` / `useUsers` | `features/users/hooks/*.ts` |
| `useProject` / `useProjectMembers` / `useProjectBoardCounts` | `features/projects/hooks/*.ts` |

VD điển hình `features/boards/hooks/useBoard.ts:5-11`: query fail nhưng không có bất kỳ cách nào cho user biết lý do.

### 3. Xử lý lỗi mutation bị duplicate + không nhất quán
- Helper `getApiErrorMessage` bị copy-paste ở **ít nhất 7 file** hook tasks (`useAssignTask`, `useUnassignTask`, `useCreateTaskComment`, `useCreateTaskCommentReply`, `useUpdateTaskComment`, `useDeleteTaskComment`, `useUpdateTaskStatusAction`), logic giống hệt nhau.
- Kiểu `ApiError` cũng bị khai báo/lỏng lẻo khác nhau: chỗ import `@/lib/api-error`, chỗ tự khai báo local (`useLogin.ts:9`), chỗ để `unknown`.
- Fallback message lệch nhau: `"Create Failed"` / `"Create Successfully"` / `"Update Avatar Failed"` / `"Dang nhap that bai"` (tiếng Việt ko dấu) / `"Failed to update assignees."`...
  - `FE/src/features/auth/hooks/useLogin.ts:34` → `"Dang nhap that bai"`.
  - `FE/src/features/projects/hooks/useCreateProject.ts:22` → `error.response?.data?.message || 'Create Failed'`.
- `useLogout` (`features/auth/hooks/useLogout.ts`) chỉ có `onSettled`, **không `onError`** → logout fail vẫn coi như thành công, không báo lỗi.

### 4. Kiểu `ApiError` quá nghèo nàn
**File:** `FE/src/lib/api-error.ts`

```ts
export type ApiError = { message?: string; response?: { status?: number; data?: {...} } };
```

Không chứa `code` (VD: `ERR_NETWORK`), `timeout` (`ECONNABORTED`), không map status → message. Nên không phân biệt được: lỗi mạng? hết thời gian? 401? 403? 404? 422?

### 5. Footer UI lỗi của query bị cứng, duplicate, ko dùng được lý do thật
- `FE/src/components/mainSpace/view-main.tsx:86-98` → `"Could not load projects. Please try again."`
- `FE/src/components/projects/detail-project.tsx:138` → `"Could not load boards. Please try again."`
- `FE/src/components/notifications/notification-center.tsx:82` → `"Could not load notifications"` (có Retry)
- `FE/src/components/tasks/comments/task-comments-section.tsx:152` → `"Could not load comments and activity."`

Tất cả để text tiếng Anh cứng, không hiển thị `error.message` thật, không UI thống nhất.

### 6. Chưa có ErrorBoundary
Grep toàn repo: **0 file** `ErrorBoundary`. Nếu có lỗi runtime trong render (VD dữ liệu null do API fail), React unmount toàn cây → **màn hình trắng** không báo gì.

### 7. Bug nhỏ trong axios interceptor
**File:** `FE/src/services/axios.ts:31-33`

```ts
(error) => {
  Promise.reject(error);   // ← thiếu "return", promise reject bị "nuốt"
},
```

Request interceptor báo lỗi nhưng không return → error bị drop.

## Cách khắc phục (tóm tắt)

1. **Xây `src/lib/error-message.ts`**: helper tập trung `getApiErrorMessage(error, fallback)` + `getHttpStatusMessage(status)` + nhận diện `ERR_NETWORK` / timeout / 401 / 403 / 404 / 422...
2. **Nâng cấp `src/lib/api-error.ts`**: type `ApiError` đầy đủ (bao gồm `code`, `timeout`, `response.status`, error sub-code nếu BE trả).
3. **Tạo `src/lib/query-client.ts`**: factory tạo `QueryClient` với `QueryCache.onError` + `MutationCache.onError` mirror cho mutation → toast lỗi tự động cho **mọi** query/mutation chưa handle, có dedupe. Đổi `main.tsx` dùng nó.
4. **Tạo ErrorBoundary** (`src/components/ui/error-boundary.tsx`) hiển thị fallback UI thay vì white screen.
5. **Tạo UI dùng chung** `src/components/ui/error-state.tsx` (message + nút Retry) thay cho 4 chỗ text cứng ở trên, truyền `error` thật vào.
6. **Refactor hooks**: xoá `getApiErrorMessage` duplicated 7 chỗ → import từ `lib/error-message`; dồn `ApiError` về 1 nguồn; thêm `onError` cho hook còn thiếu (VD `useLogout`).
7. **Fix `axios.ts`**: thêm `return Promise.reject(error)`.

## Files liên quan
- `FE/src/main.tsx` - tạo QueryClient không config
- `FE/src/lib/api-error.ts` - type ApiError quá mỏng
- `FE/src/services/axios.ts` - interceptor thiếu return
- `FE/src/features/**/hooks/*.ts` - error handling phân tán, ~20 query hook không xử lý error
- `FE/src/features/auth/hooks/useLogin.ts` - message tiếng Việt ko dấu
- `FE/src/components/mainSpace/view-main.tsx` - UI lỗi cứng
- `FE/src/components/projects/detail-project.tsx` - UI lỗi cứng
- `FE/src/components/notifications/notification-center.tsx` - UI lỗi cứng
- `FE/src/components/tasks/comments/task-comments-section.tsx` - UI lỗi cứng