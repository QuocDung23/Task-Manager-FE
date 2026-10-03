# Work Log: Change Password (Đổi mật khẩu)

**Ngày:** 29/09/2026
**Plan:** `FE/.AI/plan/change-password.md`
**Status:** IMPLEMENTED — cần test thủ công trên UI

---

## Tổng kết

Thêm tab `Password` vào Profile dialog (`ViewProfileUser`) cho user đã đăng nhập, gọi `PATCH /user/me/password`.
Backend sửa 3 bug an toàn trên nhánh `fix/auth`: response schema sai, typo `changPassword`, thiếu OpenAPI security.

Hai design skill (`design-taste-frontend`, `high-end-visual-design`) được áp dụng có chọn lọc: ưu tiên accessibility, focus ring, `prefers-reduced-motion`, touch target 36px, trạng thái disabled khi pending. Giữ nguyên shadcn/lucide hiện có, không redesign toàn bộ vì 2 skill viết cho landing page.

---

## FE — Files đã tạo/sửa

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/components/ui/tabs.tsx` | TẠO MỚI | Radix Tabs wrapper theo convention shadcn của dự án |
| `src/components/users/password-field.tsx` | TẠO MỚI | Field password có nút show/hide, `autoComplete`, `minLength/maxLength` |
| `src/components/users/change-password-form.tsx` | TẠO MỚI | Form 3 field + Cancel/Update, hiển thị lỗi inline |
| `src/hooks/users/useChangePasswordForm.ts` | TẠO MỚI | Validate client-side, map lỗi BE → field, reset form |
| `src/features/users/hooks/useChangePassword.ts` | TẠO MỚI | Mutation + toast, `invalidate` không dùng vì không đổi data user |
| `src/features/users/api/user-api.ts` | SỬA | Thêm `changePassword()` |
| `src/features/users/types/index.ts` | SỬA | Thêm `ChangePasswordPayload` |
| `src/components/users/profile-user.tsx` | SỬA | Bọc Tabs `Profile \| Password`, reset về `Profile` khi đóng |
| `src/components/users/profile-header.tsx` | SỬA | Thêm prop `showEditButton?: boolean` (mặc định `true`) |

**Không sửa:** `src/services/axios.ts` — endpoint `/user/me/password` cố ý KHÔNG thêm vào `NO_REFRESHTOKEN_ENDPOINTS` để giữ session sau khi đổi mật khẩu.

### Ghi chú thiết kế

- `PasswordField` dùng **uncontrolled input** + `formRef.current?.reset()`. Nếu dùng controlled value thì `reset()` của DOM không có tác dụng, form không xóa được sau khi thành công.
- Comment trong source viết tiếng Anh, đồng bộ convention hiện tại. Work log dùng tiếng Việt.
- Không thêm route, không thêm menu sidebar (đúng như plan).
- Nút "Edit" ở header ẩn khi đang ở tab `Password` (`showEditButton={tab === "profile"}`), tránh trạng thái edit treo lơ lửng khi chuyển tab.

---

## BE — Files đã sửa (nhánh `fix/auth`)

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/modules/user/dtos/response/changePassword.res.ts` | SỬA | `changPasswordResponseSchema` (`{password}`) → `ChangePasswordResponseDto` + `changePasswordResponseSchema` (`{message}`), theo đúng pattern `LogoutResponseDto` |
| `src/modules/auth/auth.service.ts` | SỬA | `changPassword` → `changePassword`; return `HttpResponseBodySuccessDto<ChangePasswordResponseDto>` + `data: new ChangePasswordResponseDto()` (thay `data: undefined`); thêm import `ChangePasswordResponseDto` |
| `src/modules/user/user.controller.ts` | SỬA | Gọi `this.authService.changePassword(...)` |
| `src/modules/user/user.router.ts` | SỬA | `changPasswordResponseSchema` → `changePasswordResponseSchema`; thêm `security: [{ bearerAuth: [] }]` vào `registerPath` |

### Vì sao sửa response shape là an toàn với FE

FE type `ApiResponse<void>` và **không đọc** `data.message`, nên việc BE đổi từ `data: undefined` sang `data: { message }` không làm hỏng client. Nhánh lỗi vẫn đọc `error.response.data.message` (envelope lỗi) — không đổi.

### Bug KHÔNG sửa (cần quyết định riêng)

| Bug | Vấn đề | Lý do bỏ qua |
|-----|--------|---------------|
| 4 | Không revoke refresh token cũ | Xung đột trực tiếp với quyết định "giữ session sau khi đổi mật khẩu". Sửa sẽ logout user ở mọi thiết bị. |
| 5–7 | Race condition khi 2 request đổi mật khẩu đồng thời | Cần transaction/optimistic lock, thay đổi kiến trúc `updateAccountPassword` |
| 8 | `currentPassword` đọc song song với `newPassword` | Cần tách field riêng trong DTO |
| 9 | Không chuẩn hóa `newPassword` | Cần chốt policy mật khẩu |
| 10 | Không có rate limit / lockout | Cần hạ tầng Redis (đã có sẵn cho OTP nhưng chưa tích hợp) |

---

## Verification

| Lệnh | Kết quả |
|------|---------|
| FE `npm run build` | PASS (`tsc -b` + vite build) |
| FE `npm run lint` | 10 lỗi — **giống hệt baseline**, 0 lỗi từ file mới |
| BE `npx tsc --noEmit` | 46 lỗi — **giống hệt baseline**, 0 lỗi từ file đã sửa |

### Pre-existing issues (không do thay đổi này)

1. **FE lint (10 lỗi):** `react-refresh/only-export-components` trong `ui/button.tsx`, `ui/sidebar.tsx`, `useSessionRestore.tsx`; `react-hooks/set-state-in-effect` tại `useSessionRestore.tsx:34,115`.
2. **BE typecheck (46 lỗi):** tất cả bắt nguồn từ `src/models/` bị thiếu — `Cannot find module './usersSchema'` và `Cannot find module '@/models'`. 40 lỗi trực tiếp trong `src/models/modelSchema/*` (thư mục auto-generate), 6 lỗi downstream trong `auth.repository.ts`, `account.res.ts`, `board.repository.ts`, `otp.service.ts`, `projects.repository.ts`, `roles.repository.ts`. Cần chạy `prisma generate` để sinh lại.

Cả hai đều đã verify bằng `git stash` để so sánh baseline chính xác.

---

## Nhánh Git

- FE: `feature-web-2-project-board` (nhánh hiện tại, không đổi)
- BE parent `Manage -Task`: `fix/auth`
- BE submodule `Manage -Task/BE`: **`fix/auth`** — code BE nằm ở đây, đã tạo nhánh riêng trước khi sửa, không đụng `main`

Chưa commit gì cả (user chưa yêu cầu).

---

## Test plan (cần thực hiện thủ công)

1. Mở profile dialog → thấy 2 tab `Profile` / `Password`
2. Tab `Password`: để trống → báo lỗi từng field
3. Nhập `currentPassword` sai → hiện "Current password is incorrect", form không mất dữ liệu
4. `newPassword` = `currentPassword` → bị chặn client-side
5. `confirmPassword` ≠ `newPassword` → bị chặn
6. Nhập mật khẩu hợp lệ → toast thành công, form xóa sạch, chuyển về tab `Profile`
7. **Kiểm tra session còn sống** sau khi đổi (đây là yêu cầu cốt lõi — nếu bị logout thì đã thêm nhầm endpoint vào `NO_REFRESHTOKEN_ENDPOINTS`)
8. Đăng nhập lại bằng mật khẩu mới → thành công; mật khẩu cũ → fail
9. Bấm Cancel → reset form + về tab `Profile`
10. Đóng dialog rồi mở lại → tab về `Profile`, không còn trạng thái edit treo
11. Check DevTools: request `PATCH /user/me/password` có `Authorization` header, response 200 `{success: true, data: {message: "..."}}`
12. Responsive: mở trên màn hình nhỏ → form không tràn ngang
