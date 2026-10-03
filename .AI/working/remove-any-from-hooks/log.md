# Remove `any` toàn bộ hook layer + types — log

## Brief

Mở rộng từ round trước (tasks) — anh chọn "Mở rộng: fix any ở tất cả hook feature còn lại".

## Files đã thay đổi

### Hook layer (15 file) — `error: any` → `error: ApiError`

- `src/features/lists/hooks/useCreateList.ts`
- `src/features/lists/hooks/useUpdateList.ts`
- `src/features/lists/hooks/useDeleteList.ts`
- `src/features/lists/hooks/useReorderList.ts`
- `src/features/auth/hooks/useVerifyOtp.ts`
- `src/features/auth/hooks/useVerifyAccount.ts`
- `src/features/auth/hooks/useResendOtp.ts`
- `src/features/auth/hooks/useSendOtp.ts`
- `src/features/auth/hooks/useResetPassword.ts`
- `src/features/projects/hooks/useAddMemberProject.ts`
- `src/features/projects/hooks/useCreateProject.ts`
- `src/features/projects/hooks/useDeleteProject.ts`
- `src/features/projects/hooks/useUpdateProject.ts` — thêm fix `data: any` → `data: Partial<ProjectRequest>`
- `src/features/users/hooks/useUpdateUser.ts`

### Xoá

- `src/features/lists/hooks/useReoderList.ts` — duplicate typo (`useReoderList`), không consumer nào, chỉ là alias đã gộp vào `useReorderList.ts`.

### Hook layer (1 file) — `setQueryData(old: any)` → typed callback

- `src/features/users/hooks/useUpdateMyAvatart.ts`
  - Định nghĩa `CurrentUserCache = ApiResponse<UserResponse> | undefined` cục bộ.
  - Generic `setQueryData<CurrentUserCache>` ở cả 2 callback (`onMutate` + `onSuccess`).
  - Importer: dùng `import type { ApiResponse, UpdateAvatarPayload, UserResponse }`.

### Type layer (1 file)

- `src/features/boards/types/index.ts`
  - `_count: any` → `_count?: { lists?: number; tasks?: number }` (parity `projects/types/index.ts`).

## Kết quả verify

| Check | Trước | Sau |
|---|---|---|
| `tsc --noEmit` | 0 lỗi (đã pass) | 0 lỗi |
| `eslint src/features --max-warnings 0` | 27 lỗi `any` + 3 react-refresh pre-existing | 0 lỗi `any`, 0 lỗi react-refresh |
| `eslint src --max-warnings 0` | 27 lỗi | 2 lỗi pre-existing (`button.tsx`, `sidebar.tsx` — `react-refresh/only-export-components`) |
| Grep `: any` trong `**/hooks/**/*.ts` | 17 match | 0 match |
| ReadLints `src/features` | lỗi `any` | sạch |

## Lỗi pre-existing còn lại (NGOÀI scope)

Hai lỗi `react-refresh/only-export-components` ở:

- `src/components/ui/button.tsx:67` — shadcn `buttonVariants` re-export alongside component.
- `src/components/ui/sidebar.tsx:701` — shadcn `useSidebar` hook re-export alongside components.

Pattern chuẩn của shadcn là tách `buttonVariants` / `useSidebar` ra file `*.variants.ts` / `*.hook.ts`. Không thuộc scope "fix any hooks" — recommend tách riêng round sau nếu anh muốn zero-error ESLint toàn project.

## Ghi nhận

- `src/lib/api-error.ts` giờ được consume ở **20 hook** (5 round trước + 15 round này). Coverage rất tốt.
- `useUpdateProject.ts` đã chuyển sang `data: Partial<ProjectRequest>` — đây là type duy nhất chính xác do `projectApi.update` đã ký là nhận `Partial<ProjectRequest>` (line 46 `api/project-api.ts`). Caller có thể pass subset fields, không yêu cầu tất cả.
- `useUpdateMyAvatart.ts` — `CurrentUserCache` định nghĩa cục bộ thay vì tách `lib/`: vì chỉ 1 consumer, số consumer sẽ tăng → nếu sau này cần dùng ở `useUpdateUser` hoặc `useUpdateMyAvatar` (file khác) → tách ra `src/features/users/types/current-user.ts` round sau.
- `useReoderList.ts` (typo) xoá không ảnh hưởng: grep confirm không consumer.
