# Plan — Fix `any` ở toàn bộ `features/**/hooks/*.ts`

## Mục tiêu

Xoá mọi `any` còn sót lại trong hook layer, dùng chung `ApiError` type từ `src/lib/api-error.ts` (đã tạo ở round trước).

## Phạm vi (17 file)

### Nhóm 1 — Error handler `any` → `ApiError` (15 file)

| File | Lỗi | Action |
|---|---|---|
| `src/features/lists/hooks/useCreateList.ts` | `error: any` (line 14) | Replace → `error: ApiError` |
| `src/features/lists/hooks/useUpdateList.ts` | `error: any` (line 15) | Replace |
| `src/features/lists/hooks/useDeleteList.ts` | `error: any` (line 13) | Replace |
| `src/features/lists/hooks/useReorderList.ts` | `error: any` (line 13) | Replace |
| `src/features/lists/hooks/useReoderList.ts` | `error: any` (line 14) | Replace |
| `src/features/auth/hooks/useVerifyOtp.ts` | `error: any` (line 9) | Replace |
| `src/features/auth/hooks/useVerifyAccount.ts` | `error: any` (line 21) | Replace |
| `src/features/auth/hooks/useResendOtp.ts` | `error: any` (line 11) | Replace |
| `src/features/auth/hooks/useSendOtp.ts` | `error: any` (line 16) | Replace |
| `src/features/auth/hooks/useResetPassword.ts` | `error: any` (line 16) | Replace |
| `src/features/projects/hooks/useAddMemberProject.ts` | `error: any` (line 23) | Replace |
| `src/features/projects/hooks/useCreateProject.ts` | `error: any` (line 15) | Replace |
| `src/features/projects/hooks/useDeleteProject.ts` | `error: any` (line 14) | Replace |
| `src/features/projects/hooks/useUpdateProject.ts` | `error: any` (line 13) + `data: any` (line 8) | Replace cả 2 |
| `src/features/users/hooks/useUpdateUser.ts` | `error: any` (line 15) | Replace |

### Nhóm 2 — `setQueryData` callback `any` (1 file)

| File | Lỗi | Action |
|---|---|---|
| `src/features/users/hooks/useUpdateMyAvatart.ts` | `(old: any)` x 2 (line 15, 26) | Tạo `CurrentUserCache` type từ `ApiResponse<UserResponse>` (đã có) → dùng `import type` |

### Nhóm 3 — Mutation `data: any` (1 file, trùng nhóm 1)

| File | Lỗi | Action |
|---|---|---|
| `src/features/projects/hooks/useUpdateProject.ts` | `data: any` ở mutationFn params | Thay bằng đúng type `Omit<ProjectRequest, "id">` (vì `id` đã có ở vế trước) |

## Thứ tự thực hiện

1. Fix nhóm 1 (15 file) — đơn giản nhất, không cần type mới.
2. Tạo `CurrentUserCache` (trong `useUpdateMyAvatart.ts` cục bộ).
3. Fix nhóm 2 (1 file).
4. Fix nhóm 3 (1 file, sửa 2 chỗ).
5. Verify: `tsc` + `eslint src/features --max-warnings 0`.

## Tiêu chí hoàn thành

- 0 lỗi `any` còn lại trong `src/features/**/hooks/*.ts`.
- `tsc --noEmit`: 0 lỗi toàn project.
- `eslint src/features --max-warnings 0`: 0 lỗi.
- Không thay đổi behavior — chỉ thay type annotation.
