# Plan: Fix auth error handling — Đợt review 2 (P1/P2/P3)

> **Ngày:** 2026-09-14
> **Nguồn:** `.AI/review-code/auth-error-review.md` — mục "Đợt review 2".
> **Phạm vi:** FE `src/lib/auth-error-message.ts`, `src/features/auth/hooks/use*.ts`,
> `src/components/auth/*-view.tsx`, `src/hooks/auth/useResetPasswordForm.ts`.
> **Trạng thái:** Chưa code gì cho tới khi user duyệt.

## 1. Bối cảnh & vấn đề

Đợt review 2 đã đối chiếu source BE (`auth.service.ts`, `otp.service.ts`,
`validationRequest.middleware.ts`, các `dtos/requests/*`) và xác nhận 7 điểm:

| # | Severity | Vấn đề |
|---|----------|--------|
| 1 | **P1** | Lockout login đọc `lastErrorRef` (đồng bộ qua `useEffect`) → đọc *status lỗi trước*, fail đầu tiên không đếm → khóa sau 6 lần thay vì 5; fail/success xen kẽ thì không bao giờ khóa. |
| 2 | **P1** | BE trả **409** khi OTP còn hạn (case phổ biến nhất khi Resend/forgot) nhưng `SEND_OTP_MESSAGE` chỉ map 400/404/429 (429 BE **không bao giờ** trả) → user thấy raw `"the otp will be reissuded after N seconds"` (sai chính tả, lộ chi tiết nội bộ). |
| 3 | **P2** | OTP hết hạn BE trả **401** `"Otp expired"` nhưng `VERIFY_OTP_MESSAGE` / `VERIFY_ACCOUNT_MESSAGE` / `RESET_PASSWORD_MESSAGE` thiếu mục 401 → hiện raw. |
| 4 | **P2** | Parser 422 viết cho **Zod 3** (`"String must contain at least..."`); BE/FE chạy **Zod 4.3.6** (thật: `"Too small: expected string to have >=6 characters"`) → password-422 rơi vào generic, mất red border; login 422 bị `detectField` gắn nhầm email. Đã chạy thử `zod@4.3.6` để xác nhận chuỗi. |
| 5 | **P3** | `useResetPasswordForm` dùng tiếng Việt trong khi toàn bộ auth view + `auth-error-message.ts` tiếng Anh. |
| 6 | **P3** | Tầng `AuthErrorAction` / `pickAuthAction` / `AuthErrorAlert` / `FormFieldError` + `isRetry` của register là code chết (tính toán nhưng không nơi nào render/đọc). |
| 7 | **P3** | Bị khóa nhưng nhấn **Enter** trong ô input vẫn kích hoạt `onSubmit` (HTML Form không phụ thuộc nút disabled) → `bumpAttempt()` reset timer thêm 60s → lockout vô hạn nếu spam Enter. |

## 2. Mục tiêu

1. Lockout login chính xác theo `MAX_ATTEMPTS = 5`, đếm đúng status, không đọc state trễ.
2. Mọi lỗi BE trong bảng status đều có message thân thiện — không còn raw message lộ nội bộ.
3. Parser 422 bám đúng định dạng Zod 4.3.6, gắn đúng field → red border chính xác.
4. Ngôn ngữ thống nhất (quyết định ở §3).
5. Xoá/thu gọn code chết để giảm mặt code duy trì.
6. Không còn lối gửi submit khi form đang bị khóa.

## 3. Quyết định cần người duyệt

- **Q1 — Ngôn ngữ:** Chốt toàn bộ auth flow (kể cả resetPassword) dùng **tiếng Anh**
  (khớp auth-error-categorization "Language switch to English" 2026-09-10,
  khớp `auth-error-message.ts`). Nếu muốn tiếng Việt → chuyển toàn bộ 6 view + helper.
- **Q2 — Code chết (P3 #6):** Khuyến nghị **XÓA** (`action`/`pickAuthAction`,
  `AuthErrorAction`, `isRetry`, `FormFieldError`, `AuthErrorAlert`) vì các view đã tự
  render `ResendOtpButton` + link sẵn. Nếu muốn giữ → nối tối thiểu 1 chỗ render CTA
  "Resend OTP code" ở verifyOtp/verifyAccount. *Mặc định plan theo hướng xóa.*
- **Q3 — Lockout có tính 422?** Đề xuất giữ nguyên tập `{400, 401, 404}` (chỉ đếm lỗi
  xác thực thật). 422 là lỗi validation của user, không phải brute-force.

## 4. Chi tiết các fix

### Fix 1 [P1] — Lockout login đọc `status` trực tiếp, bỏ `lastErrorRef`

**Vấn đề:** `login-view.tsx:35-41, 67, 71-73` — `onAuthError` đọc
`lastErrorRef.current`, ref chỉ được đồng bộ qua `useEffect` **sau** commit, trong khi
React Query gọi `onError` synchronous ngay khi lỗi → ref luôn là status của lần trước.

**Cách sửa (giống `useVerifyAccount` đã làm):**

1. `src/features/auth/hooks/useLogin.ts`:
   - `LoginAuthErrorContext` thêm `status?: number`.
   - Trong `onError`, tính `status = (error as ApiError)?.response?.status` và truyền vào
     `onAuthError?.({ result, payload: variables, status })`.
   - Import `type { ApiError }` từ `@/lib/api-error`.
2. `src/components/auth/login-view.tsx`:
   - Bỏ `lastErrorRef` + `useEffect` đồng bộ + import `ApiError` (nếu không dùng nơi khác).
   - `onAuthError: ({ result, status })` → dùng `status` trực tiếp với `LOCKOUT_STATUSES`.
   - Thêm `if (isLockedOut) return;` ở **đầu** `onSubmit` (xử lý luôn P3 #7 — Enter khi khóa).

**Kết quả:** fail thứ 5 (đúng status) → khóa; không còn trễ nhịp; Enter lúc khóa bị chặn.

### Fix 2 [P1] — Map 409 cho flow sendOtp / resend OTP

**Vấn đề:** `auth-error-message.ts:94-98` — `SEND_OTP_MESSAGE` thiếu 409; BE trả
`OptionalException(CONFLICT, "the otp will be reissuded after N seconds")` từ
`otp.service.ts:13-17` khi OTP cũ còn hạn.

**Cách sửa** (`src/lib/auth-error-message.ts`):
- `SEND_OTP_MESSAGE` thêm:
  `409: "An OTP was already sent. Please wait a moment and try again."`
- Ghi chú comment trên mục `429`: "defensive — BE chưa có rate-limit (otp.service không
  throw 429)". Giữ nguyên để phòng khi BE bổ sung.
- `useResendOtp.ts` vốn gọi `getAuthErrorMessage(error, "sendOtp")` → tự được hưởng fix,
  không cần đổi.

**Lưu ý:** nếu muốn message nhắc đúng số giây còn lại trong response (`"after N seconds"`),
có thể parse trong helper (tùy chọn, không bắt buộc).

### Fix 3 [P2] — Map 401 OTP hết hạn vào 3 bảng verify/reset

**Vấn đề:** `otp.service.ts:64-66` — `verifyOtp` throw `OptionalException(UNAUTHORIZED,
"Otp expired")` (status **401**), nhưng `auth-error-message.ts:100-118` không có mục 401.

**Cách sửa** (`src/lib/auth-error-message.ts`):
- `VERIFY_OTP_MESSAGE`, `VERIFY_ACCOUNT_MESSAGE`, `RESET_PASSWORD_MESSAGE` cùng thêm:
  `401: "The OTP code has expired. Please request a new one."`
- Không ảnh hưởng `shouldSkipToastForStatus` (chặn 401 cho toast global) vì hook đã tự
  toast qua bảng mapping, global cache skip nhờ `mutation.options.onError`.

**Kiểm tra:** verify OTP với mã hết hạn → toast "The OTP code has expired..." + red border.

### Fix 4 [P2] — Parser 422 theo Zod 4.3.6, sửa `detectField`

**Vấn đề (đã chạy thử `zod@4.3.6`):**
- Message thật: `"email Invalid email address; password Too small: expected string to have >=6 characters"`.
- `looksLikeZod` + `ZOD_FIELD_TRANSLATIONS` (`auth-error-message.ts:159-193`) chỉ nhận
  keyword Zod 3 (`"must contain at least"`, `"string must contain"`, `"invalid email"`)
  → password-only 422 trả `null` (không gắn field) → generic message, mất red border.
- login 422: message `"Email or password is invalid."` → `detectField` trả `"email"`
  trước khi chạm `"password"` (dòng 259) → gắn nhầm field.

**Cách sửa** (`src/lib/auth-error-message.ts`):
- `looksLikeZod`: thêm điều kiện khớp Zod 4: `"too small"`, `"too big"`,
  `"invalid email address"`, `"expected "` ... giữ nguyên branch cũ (an toàn ngược).
- `ZOD_FIELD_TRANSLATIONS` thêm entry:
  - `"too small"` → `{ password: "Password must be at least 6 characters.",
    confirmPassword: "... at least 6 characters." }`
  - `"too big"` → `{ password: "Password must be at most 20 characters.",
    confirmPassword: "... at most 20 characters." }`
  - `"invalid email address"` → `{ email: "Please enter a valid email address." }`
  - `"password confirmation does not match"` → `{ confirmPassword: "Passwords do not match." }`
    (refine trong `resetPass.req.ts:25-28`).
- `detectField`: ưu tiên keyword đặc thù trước — check `password`/`otp`/`confirm`/`name`
  **trước** `email`, chỉ fallback email khi không có keyword cụ thể khác.
- (Khuyến nghị) `login-view.tsx`: thêm client-side `password.length < 6` check như
  register để không phụ thuộc 422 — *để mặc định KHÔNG thêm để tránh chặn hợp lệ sai,
  chỉ thêm khi user muốn*.

**Kết quả:** register/login/resetPassword 422 → `fieldErrors` đúng field, red border đúng.

### Fix 5 [P3 (Q1)] — Thống nhất ngôn ngữ tiếng Anh cho resetPassword

**Vấn đề:** `src/hooks/auth/useResetPasswordForm.ts:56-63, 76-78` dùng tiếng Việt.

**Cách sửa** (nếu chốt tiếng Anh — Q1):
- `"Vui lòng nhập mật khẩu mới."` → `"Please enter a new password."`
- `Mật khẩu phải có ít nhất N ký tự.` → `"Password must be at least ${N} characters."`
- `"Vui lòng xác nhận mật khẩu."` → `"Please confirm your password."`
- `"Mật khẩu xác nhận không khớp."` → `"Passwords do not match."`
- `"Yêu cầu không hợp lệ. Vui lòng bắt đầu lại quy trình."` → `"Invalid request. Please start the process again."`

### Fix 6 [P3 (Q2)] — Xóa code chết

**Cách sửa (theo hướng xóa, chờ duyệt Q2):**
- `auth-error-message.ts`: xóa type `AuthErrorAction`, field `action` trong
  `AuthErrorResult`, hàm `pickAuthAction`, và lời gọi `pickAuthAction` trong
  `getAuthErrorMessage`.
- `useRegister.ts:38`: bỏ `{ isRetry: true }` → còn `getAuthErrorMessage(error, "register")`.
- `getAuthErrorMessage`: giữ nguyên tham số `options.preferField` (vẫn hữu ích),
  bỏ `isRetry` khỏi type.
- Xóa file `src/components/ui/form-field-error.tsx`, `src/components/ui/auth-error-alert.tsx`
  (không còn nơi import nào).
- Sau khi xóa: chạy `grep` xác nhận không còn reference.

### Fix 7 [P3] — Chặn submit Enter khi bị khóa

- Nằm chung Fix 1: `if (isLockedOut) return;` đầu `onSubmit` trong `login-view.tsx`.
- Giữ nút `disabled={... || isLockedOut}` như hiện tại (đã có).

## 5. Ma trận file bị ảnh hưởng

| File | Thay đổi |
|------|----------|
| `src/lib/auth-error-message.ts` | +409 sendOtp; +401 ×3 bảng; cập nhật parser Zod 4 + `detectField`; (Q2) xóa `action`/`pickAuthAction`. |
| `src/features/auth/hooks/useLogin.ts` | Context thêm `status`; import `ApiError`. |
| `src/components/auth/login-view.tsx` | Bỏ `lastErrorRef`/`useEffect`; dùng `status` từ context; thêm guard `isLockedOut` trong `onSubmit`. |
| `src/features/auth/hooks/useRegister.ts` | (Q2) bỏ `isRetry: true`. |
| `src/hooks/auth/useResetPasswordForm.ts` | (Q1) chuỗi tiếng Anh. |
| `src/components/ui/form-field-error.tsx` | (Q2) xóa. |
| `src/components/ui/auth-error-alert.tsx` | (Q2) xóa. |

Không đổi: `useVerifyAccount`, `useVerifyOtp`, `useResetPassword`, `useSendOtp`,
`useResendOtp`, `query-client.ts` (đã đúng).

## 6. Verification

- `npm run build` (tsc -b && vite build) — pass.
- `npm run lint` (eslint .) — pass.
- Kiểm thử tay:
  - [ ] Login sai mật khẩu **5 lần liên tiếp** → khóa đúng lần thứ 5 (không phải 6+).
  - [ ] Fail rồi login thành công rồi fail lại → bộ đếm chỉ đếm các lần fail liên tiếp đúng.
  - [ ] Trong lúc bị khóa, nhấn Enter liên tục → không gửi request, không reset timer.
  - [ ] Forgot/Resend OTP khi OTP còn hạn (409) → toast thân thiện, không raw `reissuded`.
  - [ ] Verify OTP / verify account / reset password với mã hết hạn (401) → toast
    "The OTP code has expired...".
  - [ ] Register: email hợp lệ + password ngắn → red border đúng password, message nói "≥ 6 characters".
  - [ ] Login: email sai + password sai (422) → red border cả 2 đúng field.
  - [ ] Reset password: 2 password không khớp (refine 422) → red border confirmPassword.
  - [ ] (Q2 nếu xóa) `grep -r "AuthErrorAlert\|FormFieldError\|pickAuthAction\|isRetry" src/` → rỗng.

## 7. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| `detectField` đổi thứ tự có thể đổi field hiển thị ở message chứa cả email+otp chưa liệt kê. | Chỉ ưu tiên password/otp/confirm/name trước email; message OTP hiện tại không chứa "email". |
| Xóa `action` (Q2) làm mất khả năng CTA tương lai. | Các view đã render `ResendOtpButton`/link; nếu sau cần CTA động thì thêm lại theo dạng hook mới chứ không phục hồi code chết. |
| Lockout vẫn có thể bị vượt bằng cách thay email khác nếu form cho phép đổi email giữa chuỗi fail. | Hiện form không reset đếm khi đổi email; chấp nhận cho UX. Không phải là bảo mật (client-side). |

## 8. Checklist duyệt

- [ ] Q1 — Ngôn ngữ: **tiếng Anh** (đề xuất) / tiếng Việt / để nguyên (mix hiện tại).
- [ ] Q2 — Code chết: **xóa** (đề xuất) / giữ và nối CTA.
- [ ] Q3 — Lockout đếm status: giữ `{400,401,404}`.
- [ ] P1 Fix 1 + Fix 2 + P3 Fix 7: ưu tiên làm trước.
- [ ] P2 Fix 3 + Fix 4 sau.
- [ ] P3 Fix 5 (theo Q1) + Fix 6 (theo Q2).

## 9. Update log

### 2026-09-14 — Tạo plan

Lấy findings từ `.AI/review-code/auth-error-review.md` "Đợt review 2", đối chiếu lại
trực tiếp với BE (`auth.service.ts`, `otp.service.ts`, `validationRequest.middleware.ts`,
`dtos/requests/*`) và chạy thử `zod@4.3.6` để xác nhận định dạng message 422.