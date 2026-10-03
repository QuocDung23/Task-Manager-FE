# Review: Auth error handling (login / register / OTP / reset password)

> Cập nhật **2026-09-10 (implement):** theo yêu cầu, error auth giờ **chỉ hiện
> toast** (không hiện inline text), input lỗi chỉ báo **red border** qua
> `aria-invalid`. Xem mục "ĐÃ IMPLEMENT" ở cuối file.

> Review thực hiện ngày 2026-09-10, phạm vi các file auth đang thay đổi:
> `src/components/auth/*-view.tsx`, `src/features/auth/hooks/use*.ts`,
> `src/hooks/auth/useResetPasswordForm.ts`, kết hợp với tầng xử lý lỗi đã có
> (`src/lib/query-client.ts`, `src/lib/error-message.ts`, `src/lib/auth-error-message.ts`).

## Kết luận

Phần error cho auth hiện đã được mapping khá tốt: mỗi flow có bảng message theo
status, có gắn lỗi vào đúng field (`getAuthErrorMessage`), có inline error +
toast, và đã bỏ được message tiếng Việt ko dấu (`"Dang nhap that bai"`). Tuy nhiên
có **1 lỗi P1** làm **toast bị lặp trên hầu hết các lỗi auth**, và vài điểm P2/P3
về logíc thừa và trải nghiệm:

- **P1:** Toàn bộ auth form truyền `onError` vào `mutate()` (không phải khai báo
trong `useMutation`), nên nút skip toast của `MutationCache` không nhận ra → mỗi
lỗi auth (trừ 401) hiện 2 toast, trong đó 1 toast là message generic/raw.
- **P2:** `AuthErrorResult.action` được tính toán trong `getAuthErrorMessage`
nhưng không nơi nào tiêu thụ → toàn bộ tầng action là code thừa.
- **P2:** Check 409 trong `verifyAccount-view` có điều kiện tiếng Việt chết
(`"đã được xác thực"`) — message 409 thực tế trả về là tiếng Anh.
- **P2:** Lockout login đếm mọi loại lỗi (kể cả network/timeout), không reset theo
thời gian → người dùng có thể bị khóa oan và chỉ mở khóa khi reload trang.
- **P3:** Resend OTP fail chỉ hiện toast generic từ MutationCache, không có message
riêng cho flow sendOtp.
- **P3:** Reset password form dùng message tiếng Anh trong khi các màn khác đã
chuyển hết sang tiếng Việt.



## Findings



### [P1] Toast lặp đôi trên mọi lỗi auth (trừ 401)

**Files:**

- `src/lib/query-client.ts:49-56` — `MutationCache.onError` chỉ skip toast khi
`mutation.options.onError` tồn tại.
- `src/components/auth/login-view.tsx:85-88`, `register-view.tsx:106-109`,
`forgotPassword-view.tsx:51-54`, `verifyOtp-view.tsx:57-67`,
`verifyAccount-view.tsx:66-69`, `src/hooks/auth/useResetPasswordForm.ts:78-86`
— tất cả đều truyền `onError` inline qua `mutate(payload, { onError })`.
- Các hook `useLogin` / `useRegister` / `useSendOtp` / `useVerifyOtp` /
`useVerifyAccount` / `useResetPassword` / `useResendOtp` — sau refactor **không
còn** `onError` trong `useMutation(...)`.

**Cơ chế (đã kiểm tra source** `@tanstack/query-core@5.99.0`**):**

`MutationObserver.mutate(vars, options)` lưu callback vào biến private
`#mutateOptions` và build `Mutation` bằng chính `this.options` của observer — tức
options khai báo trong `useMutation(...)`. Options truyền inline vào `mutate()`
**không** được gộp vào `mutation.options`. Vì vậy trong handler của `MutationCache`:

```ts
onError: (error, _v, _c, mutation) => {
  if (mutation.options.onError) return; // chỉ đúng khi onError khai báo ở hook
  if (shouldSkipToastForStatus(error)) return; // chỉ bỏ qua status 401
  showToast(getApiErrorMessage(error, DEFAULT_MUTATION_ERROR_MESSAGE));
}
```

`mutation.options.onError` luôn là `undefined` với cách truyền inline → global
toast bắn ra. Sau đó observer gọi `#mutateOptions.onError` → `handleError` trong
view → `toast.error(mapped.message)` bắn toast **thứ hai**.

**Ảnh hưởng:** Với lỗi 400/403/404/409/422/429/network/timeout của login,
register, sendOtp, verifyOtp, verifyAccount, resetPassword, người dùng thấy 2
toast xếp chồng: một toast generic (`"Action failed. Please try again."` hoặc
message raw của BE) và một toast đã mapping. Chỉ riêng lỗi 401 (sai mật khẩu) được
`shouldSkipToastForStatus` chặn tình cờ nên không lặp.

**Đề xuất:** Đưa `onError` về lại cấp hook (mỗi hook auth biết rõ flow của nó là
`"login" | "register" | ...`), để `mutation.options.onError` tồn tại và global
cache tự skip. VD:

```ts
// useLogin.ts
return useMutation({
  mutationFn: authApi.login,
  onError: (error) => handleAuthError(error, "login"), // set field error + toast
  onSuccess: ...,
});
```

Khi đó bỏ hẳn `onError` trong lời gọi `mutate(...)` ở các view (hoặc giữ lại nhưng
global cache vẫn skip được nhờ `mutation.options.onError`). Nếu giữ hướng truyền
inline, phải sửa `query-client.ts` bằng cơ chế khác (VD dùng `mutation.options.meta`
đánh dấu `silentError` cho các mutation auth), vì bản thân `mutation.options`
không nhìn thấy `#mutateOptions`.

**Kiểm thử nên bổ sung:**

- Gây lỗi login 400/404/429 và network timeout → chỉ thấy đúng 1 toast, message là
bản đã mapping (đã có trong bảng `LOGIN_MESSAGE`).
- Làm tương tự cho register (409), verifyOtp (400/404), sendOtp (404), resetPassword (400).



### [P2] `AuthErrorResult.action` và `pickAuthAction` không nơi nào dùng

**Vị trí:** `src/lib/auth-error-message.ts:17-21, 172-195`

`getAuthErrorMessage` trả về `action` (gợi ý "Register new account", "Resend OTP
code", "Forgot password?") nhưng grep toàn repo cho thấy không component nào đọc
`.action` — các view tự render `ResendOtpButton` / link riêng. Đây là tính năng
cài dở: giá trị được tính mỗi lần lỗi xảy ra nhưng vứt đi ngay.

**Đề xuất:** Hoặc bỏ `action`/`pickAuthAction` để giảm code thừa, hoặc nối vào UI —
VD trong `verifyOtp-view`/`verifyAccount-view`, khi lỗi OTP hết hạn (400) hiện CTA
"Resend OTP code" bên dưới; trong `login-view` khi 404 hiện CTA "Register new
account".

### [P2] Check 409 `"đã được xác thực"` là điều kiện chết

**Vị trí:** `src/components/auth/verifyAccount-view.tsx:41-47`

```ts
if (
  mapped.message.toLowerCase().includes("đã được xác thực") ||
  (error as {...})?.response?.status === 409
) {
  navigate(APP_ROUTES.LOGIN, { replace: true });
}
```

Message 409 của `VERIFY_ACCOUNT_MESSAGE` (`auth-error-message.ts:55`) là tiếng Anh
`"Account has already been verified. You can log in now."`, nên chuỗi tiếng Việt
không bao giờ khớp; điều kiện này luôn dựa vào vế `status === 409` phía sau. Điều
kiện phụ thuộc text dễ vỡ khi message đổi ngôn ngữ. Nên bỏ vế chứa chuỗi và chỉ
kiểm tra status (hoặc dùng `mapped.action` nếu nối tầng action ở P2 trên).

**Kiểm thử:** BE trả 409 → user bị đưa về `/login`, không phụ thuộc nội dung message.

### [P2] Lockout login đếm nhầm lỗi và không reset theo thời gian

**Vị trí:** `src/components/auth/login-view.tsx:35-36, 47, 91`

`attemptCount` tăng trên **mọi** lỗi bao gồm network/timeout (lỗi không đến được
BE) và cả 429 (vốn đã là message "thử quá nhiều lần" từ BE). Sau 5 lần là khóa
cứng đến khi remount component (reload trang), không có cơ chế reset theo thời
gian, và màn hình báo "Bạn đã thử đăng nhập quá nhiều lần" ngay cả khi người dùng
chỉ bị mất mạng 5 lần liên tiếp.

**Đề xuất:** Chỉ đếm các lỗi xác thực thật (400/401/404) và loại 429/network/
timeout khỏi bộ đếm; kèm timestamp để tự mở khóa sau một khoảng thời gian (VD 60s)
thay vì bắt user reload.

### [P3] Resend OTP fail chỉ có toast generic

**Files:** `src/features/auth/hooks/useResendOtp.ts:5-12`
`src/components/auth/resendOtp-button.tsx:41-47`

`resendOtp.mutate(undefined, { onSuccess })` không có `onError`, hook cũng không
khai báo → lỗi do `MutationCache` xử lý với fallback generic `"Action failed. Please try again."`, không dùng bảng `SEND_OTP_MESSAGE` (VD 429 "requested OTP too
many times"). Nên thêm `onError` với `getAuthErrorMessage(error, "sendOtp")` để
hiện message chính xác.

### [P3] Reset password còn message tiếng Anh, lệch chuẩn chung

**Vị trí:** `src/hooks/auth/useResetPasswordForm.ts:57-65`

Các view khác đã chuyển validation message sang tiếng Việt (`"Vui lòng nhập mật khẩu."`...), còn form này để `"Please enter a new password."` /
`"Password must be at least ..."`. Ngoài ra message đặt lỗi tham chiếu theo field
đúng nhưng biến `fieldErrors.newPassword`/`confirmPassword` dùng chung cho cả mục
đặt mật khẩu — OK, chỉ cần thống nhất ngôn ngữ.

## Files liên quan

- `src/lib/query-client.ts` — điều kiện skip toast chỉ nhận diện `onError` cấp hook.
- `src/lib/auth-error-message.ts` — tầng `action` chưa được tiêu thụ.
- `src/components/auth/*-view.tsx` — truyền `onError` inline gây toast lặp.
- `src/features/auth/hooks/use*.ts` — sau refactor mất `onError` cấp hook.
- `src/components/auth/verifyAccount-view.tsx` — điều kiện 409 dính chuỗi tiếng Việt.
- `src/components/auth/login-view.tsx` — bộ đếm lockout.
- `src/components/auth/resendOtp-button.tsx`, `useResendOtp.ts` — thiếu xử lý lỗi riêng.

---



## ĐÃ IMPLEMENT (2026-09-10): Error auth chỉ toast + red border

Theo yêu cầu FE: error không hiển thị inline text nữa, chỉ dùng **toast** cho
message và **red border** (`aria-invalid`) trên input lỗi.

### Thay đổi


| File                      | Thay đổi                                                                                                                                                                                                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login-view.tsx`          | Bỏ `<FormFieldError>` (email/password/form). Giữ `aria-invalid` cho red border. Client-side validation giờ `toast.error(...)`. Giữ lockout alert (state khóa form, cần để user hiểu vì sao nút disabled).                                                                                     |
| `register-view.tsx`       | Bỏ `<FormFieldError>` x4 + `<AuthErrorAlert>`. Xóa toàn bộ code thừa: retry `handleAction`, `lastPayload`, `derivedAlert`/`summaryMessage`/`alertMessage`/`alertAction`, import `getAuthErrorMessage`/`useCallback`. Giữ focus-into-errored-field. Client-side validation `toast.error(...)`. |
| `forgotPassword-view.tsx` | Bỏ `<FormFieldError>`. Giữ `aria-invalid`. Client-side validation `toast.error(...)`.                                                                                                                                                                                                         |
| `verifyOtp-view.tsx`      | Bỏ `<FormFieldError>`. Truyền `invalid={Boolean(otpError)}` vào `InputOtp`. Client-side validation `toast.error(...)`.                                                                                                                                                                        |
| `verifyAccount-view.tsx`  | Bỏ `<FormFieldError>`. Truyền `invalid` vào `InputOtp`. Client-side validation `toast.error(...)`. Giữ navigation khi 409.                                                                                                                                                                    |
| `resetPassword-view.tsx`  | Bỏ `<FormFieldError>` (newPassword/confirmPassword/form). Giữ `aria-invalid`.                                                                                                                                                                                                                 |
| `useResetPasswordForm.ts` | Client-side validation `toast.error(...)` (thay vì chỉ set fieldErrors).                                                                                                                                                                                                                      |
| `InputOtp-form.tsx`       | Thêm prop `invalid?: boolean`, truyền `aria-invalid` vào từng `<Input>` → OTP input giờ có red border khi lỗi.                                                                                                                                                                                |




### Kết quả

- Tất cả error (client-side lẫn BE) → **1 toast** (bản đã map tiếng Việt/Anh tùy flow) + **red border** trên field lỗi.
- Không còn inline text, không còn block alert.
- `query-client.ts` P1 (toast lặp) đã được xử lý từ trước — toàn bộ auth hook khai báo `onError` cấp hook, global MutationCache skip.



### Lưu ý còn lại

- `FormFieldError` và `AuthErrorAlert` hiện **không còn nơi nào dùng** (chỉ còn định nghĩa component trong `src/components/ui/`). Có thể xóa hoặc giữ làm UI helper tái sử dụng.
- Message client-side validation của login/register/forgotPassword/verifyOtp/verifyAccount vẫn là **tiếng Anh** (chưa thống nhất tiếng Việt như resetPassword).

---



## Đợt review 2 (2026-09-14): trạng thái hiện tại sau khi implement — error mới có ổn không?

> Review lại toàn bộ phần error/auth đang có trong working tree (các view + hook đã
> refactor sang `getAuthErrorMessage`, lockout login, `onError` cấp hook). Đối chiếu
> trực tiếp với source BE: `Manage -Task/BE/src/modules/auth/*`, `otp.service.ts`,
> `validationRequest.middleware.ts`, các `dtos/requests/*`.



### Kết luận

Phần xử lý lỗi auth đã đi đúng hướng: hết toast lặp (đưa `onError` lên cấp hook),
lockout chỉ đếm status xác thực + reset theo thời gian, check 409 đã dựa vào status
thay vì chuỗi tiếng Việt chết, `useResendOtp` có mapping riêng. Tuy nhiên còn **2 vấn
đề đáng sửa (P1)** và vài điểm P2/P3:

- **P1 — BUG logic:** lockout login đọc `lastErrorRef.current` (ref đồng bộ qua
`useEffect`) ngay trong `onAuthError` → luôn đọc **status của lần lỗi trước**, lần
fail đầu tiên không bao giờ được đếm → khóa sau 6 lần thay vì 5 (và nếu giữa hai
lần fail có một lần success thì ref bị reset về `null`, bộ đếm không lên).
- **P1 — thiếu mapping:** BE trả **409** khi OTP còn hạn (người dùng bấm Resend/forgot
ngay khi OTP chưa hết hạn — đây là case phổ biến nhất của resend), nhưng bảng
`SEND_OTP_MESSAGE` chỉ có 400/404/429 (429 thì BE **không bao giờ** trả) → người
dùng thấy raw message sai chính tả `"the otp will be reissuded after N seconds"`.
- **P2:** BE trả **401** `"Otp expired"` khi OTP hết hạn, nhưng bảng verifyOtp /
verifyAccount / resetPassword không có mục 401 → hiện raw `"Otp expired"`.
- **P2:** parser 422 được viết theo định dạng error của **Zod 3** (`"String must contain at least 6 character(s)"`), trong khi BE chạy **Zod 4.3.6** với message thật
là `"Too small: expected string to have >=6 characters"` → password-422 rơi vào
bản generic/không gắn đúng field.
- **P3:** resetPassword form dùng tiếng Việt trong khi toàn bộ view auth khác tiếng Anh.
- **P3:** tầng `AuthErrorAction`/`pickAuthAction`, `FormFieldError`, `AuthErrorAlert`
vẫn là code chết (tính toán nhưng không nơi nào render).
- **P3:** khi bị khóa, nút submit disabled nhưng nhấn **Enter trong ô input vẫn submit**
được → mỗi lần Enter lại bump đếm & kéo dài lockout thêm 60s.



### Findings mới



#### [P1] Lockout login đếm trễ 1 nhịp — đọc status từ `lastErrorRef` thay vì từ lỗi hiện tại

**Vị trí:** `src/components/auth/login-view.tsx:35-41, 67, 71-73`

```ts
onAuthError: ({ result }) => {
  const status = (lastErrorRef.current as ApiError | undefined)?.response?.status; // ← đọc ref
  ...
},
...
useEffect(() => {
  lastErrorRef.current = submitLogin.error; // chạy SAU commit
}, [submitLogin.error]);
```

**Cơ chế (đã kiểm tra):** khi mutation lỗi, React Query gọi `onError` cấp hook (và từ đó
`onAuthError`) **synchronously trước khi set state / re-render**. Do đó `lastErrorRef.current`
tại thời điểm đó vẫn là giá trị của **lần lỗi trước đó** (lần đầu là `undefined`). Effect đồng
bộ ref chỉ chạy sau commit.

**Hệ quả:**

- Lần fail đầu tiên (bất kể 401/404) không được đếm.
- Bộ đếm chỉ nhận các lần fail **liền sau một lần fail khác** → khóa thực tế sau
**6** lần fail, không phải `MAX_ATTEMPTS = 5`.
- Nếu giữa hai lần fail có một lần **success** (ref bị reset về `null`), lần fail kế tiếp
không được đếm → người dùng có thể fail vô hạn nếu kiểu "fail/success xen kẽ".

**Đề xuất:** bỏ `lastErrorRef` — truyền `status` trực tiếp vào context, y hệt như
`useVerifyAccount` đã làm (`useVerifyAccount.ts:52`):

```ts
// useLogin.ts onError:
onError: (error, variables) => {
  const result = getAuthErrorMessage(error, "login");
  toast.error(result.message);
  onAuthError?.({ result, payload: variables, status: (error as ApiError)?.response?.status });
}
export type LoginAuthErrorContext = { result; payload; status?: number };
```



#### [P1] Resend/forgot OTP: BE trả 409 khi OTP còn hạn nhưng FE không map → hiện raw message

**Bằng chứng BE:** `otps/otp.service.ts:13-17` — `generateOtp` throw
`OptionalException(StatusCodes.CONFLICT, "the otp will be reissuded after N seconds")`
khi OTP cũ còn hiệu lực. `optExpires` cấu hình theo **phút**, nên case này là **case
bình thường** mỗi khi người dùng bấm "Resend OTP" hoặc resubmit forgot-password
trong khoảng OTP còn hạn (thời gian trôi qua chưa tới hạn để bị coi là "expired").

**Vấn đề:** `SEND_OTP_MESSAGE` (`auth-error-message.ts:94-98`) chỉ map 400/404/429
(429 **không tồn tại** trong source BE — không hề có rate-limit). Lỗi 409 rơi vào nhánh
`backendMessage` → người dùng thấy toast raw sai chính tả: `"the otp will be reissuded after 12 seconds"`, lộ chi tiết nội bộ.

**Đề xuất:** thêm `409` vào `SEND_OTP_MESSAGE` với message thân thiện (VD
`"Vui lòng chờ X giây rồi thử lại."`) hoặc yêu cầu BE map 429 đúng chuẩn + FE map 409
cho an toàn. Đồng thời nên xóa hoặc đánh dấu các mục 429 là "chưa có ở BE" để không
gây hiểu lầm khi đọc code.

#### [P2] OTP hết hạn: BE trả 401 `"Otp expired"`, bảng verify/resetPassword chưa map

**Bằng chứng BE:** `otps/otp.service.ts:64-66` — khi OTP đã quá hạn `verifyOtp`
throw `OptionalException(StatusCodes.UNAUTHORIZED, "Otp expired")` (status **401**).

**Vị trí:** `auth-error-message.ts:100-118` — `VERIFY_OTP_MESSAGE`,
`VERIFY_ACCOUNT_MESSAGE`, `RESET_PASSWORD_MESSAGE` chỉ có 400/404/(422)/429,
**không có 401** → lỗi hết hạn OTP hiện raw `"Otp expired"` (không có CTA resend).
(Note: `pickAuthAction` khi `status === 400 || /otp/i.test(...)` sẽ ra "Resend OTP" —
nhưng hành động này chưa được render, xem P3 #6.)

**Đề xuất:** thêm `401` vào 3 bảng trên với message thân thiện (VD `"Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới."`).

#### [P2] Parser 422 viết theo định dạng Zod 3, BE chạy Zod 4 → password-422 rơi vào generic & gắn nhầm field

**Bằng chứng (đã chạy thử** `zod@4.3.6` **— đúng version FE/BE đang dùng):**

```
email Invalid email address
password Too small: expected string to have >=6 characters
confirmPassword Too small: expected string to have >=6 characters
```

**Vị trí:** `auth-error-message.ts:159-217` — `ZOD_FIELD_TRANSLATIONS` chỉ có keyword
`"must contain at least"` / `"string must contain"` / `"invalid email"` (định dạng Zod 3,
hoặc cú pháp viết trong comment). Với message thật của Zod 4:

- Bị **gãy translator:** `"Too small: expected string to have >=6 characters"` không khớp
keyword nào → rơi vào generic `"Password is invalid."` (mất thông tin "phải ≥ 6 ký tự").
- **Password-only 422** (email hợp lệ, chỉ password ngắn): `looksLikeZod` trả `false` ở
toàn bộ branch → `parseZod422Message` trả `null` → register rơi vào message generic
`"Some details are invalid..."` và **không gắn field** → không có red border trên password.
- **login 422:** message tổng `"Email or password is invalid."` → `detectField` check
`"email"` trước (`auth-error-message.ts:259`) → gắn nhầm vào field **email** dù vấn đề
thực sự là password ngắn.

**Đề xuất:**

- Nếu muốn giữ heuristic: cập nhật keyword theo định dạng Zod 4 (`"too small"`,
`"too big"`, `"invalid email address"`, `"expected string"`...) và thêm bản dịch cho
password/confirmPassword ở mục này.
- Bền hơn: yêu cầu BE trả cấu trúc lỗi theo từng field (`errors`) thay vì chuỗi nối, hoặc
mở rộng `ApiErrorResponseData` để đọc `fields` (đã có trường `errors: Record<string,string[]>` ở `api-error.ts:5` nhưng chưa dùng).
- Thêm len-check password `minLength` vào client-side **login** (hiện login không validate
độ dài, register thì có) để không phụ thuộc 422 ở chỗ này — và sửa `detectField` ưu tiên
keyword đặc thù hơn (`"password"`) trước `"email"` cho message login 422.



#### [P3] Reset password form dùng tiếng Việt, các view auth còn lại tiếng Anh

**Vị trí:** `src/hooks/auth/useResetPasswordForm.ts:56-63, 76-78` — client-side
messages `"Vui lòng nhập mật khẩu mới."` ... Trong khi login/register/forgot/verify đều
tiếng Anh (`login-view.tsx:111-116`, `register-view.tsx:142-160`, ...) và cả `auth-error-message.ts`
cũng tiếng Anh. Trong một luồng duy nhất (forgot → verify OTP → reset), user thấy 1 màn
tiếng Anh, 1 màn tiếng Việt. Nên thống nhất 1 ngôn ngữ (gợi ý: theo UI hiện tại là tiếng Anh,
hoặc chốt dịch toàn bộ sang tiếng Việt như kế hoạch cũ).

#### [P3] Tầng action (`AuthErrorAction`, `pickAuthAction`, `AuthErrorAlert`) và `FormFieldError` vẫn là code chết

**Vị trí:** `auth-error-message.ts:54-63, 342, 365-394`; `useRegister.ts:40` (`isRetry: true`);
`src/components/ui/form-field-error.tsx`, `auth-error-alert.tsx` — grep toàn repo: không
nơi nào đọc `result.action`, không nơi nào import 2 component trên. Hệ quả: CTA
"Resend OTP code"/"Register new account" được tính toán mỗi lần lỗi nhưng không hiện;
`isRetry: true` của register cũng vô tác dụng. Nếu giữ, nối tối thiểu 1 chỗ (VD hiện
"Resend OTP code" khi 400/401 OTP ở verifyOtp/verifyAccount); nếu không, xóa để giảm
mặt code duy trì.

#### [P3] Bị khóa nhưng vẫn submit được bằng Enter → kéo dài lockout

**Vị trí:** `login-view.tsx:144` (form), `210` (button disabled).

Nút submit disabled nhưng ô input vẫn nhận phím, và Enter trong text input vẫn kích hoạt
`onSubmit` (HTML Form — không phụ thuộc disabled của button). Khi `isLockedOut`, mỗi lần
Enter sẽ `mutate` → lỗi → `bumpAttempt()` → reset timer thêm 60s → lockout không bao giờ
hết nếu user spam Enter. **Đề xuất:** `if (isLockedOut) return;` ở đầu `onSubmit` (kèm
điều kiện phòng trường hợp status không nằm trong set).

### Lưu ý (đề xuất kiểm thử cho đợt sau)

- Login sai mật khẩu 5 lần liên tiếp → màn khóa sau đúng lần thứ 5 (hiện là 6+).
- Forgot/Resend OTP khi OTP còn hạn → message không còn là raw `"reissuded"`.
- Verify OTP với mã đã hết hạn (401) → toast thân thiện + CTA resend.
- Register / login 422 chỉ password ngắn → có red border đúng ô password; message nói rõ "≥ 6 ký tự".

---



## Đợt review 3 (2026-09-15): review diff `fix: error part auth v1`

> Review diff từ commit `34b42c7` — kiểm tra những gì đã fix từ review 2 và
> phát hiện vấn đề mới.



### Tổng kết: đã fix & còn lại

Đợt này fix **5/7 vấn đề** từ review 2 (2 P1 + 2 P2 + 1 P3). 2 vấn đề còn lại là P3
nhẹ.


| #   | Vấn đề review 2                                                                | Trạng thái |
| --- | ------------------------------------------------------------------------------ | ---------- |
| P1  | lockout đếm trễ 1 nhịp (`lastErrorRef`)                                        | ✅ Đã fix   |
| P1  | resend OTP thiếu map 409                                                       | ✅ Đã fix   |
| P2  | OTP hết hạn 401 chưa map                                                       | ✅ Đã fix   |
| P2  | Zod parser viết theo Zod 3, BE chạy Zod 4                                      | ✅ Đã fix   |
| P2  | `detectField` ưu tiên email trước password (login 422)                         | ✅ Đã fix   |
| P3  | `AuthErrorAction`/`pickAuthAction`/`FormFieldError`/`AuthErrorAlert` code chết | ✅ Đã xóa   |
| P3  | Lockout Enter bypass                                                           | ✅ Đã fix   |
| P3  | resetPassword tiếng Việt, rest tiếng Anh                                       | ⏳ Chưa fix |




### Đánh giá từng thay đổi



#### ✅ lockout đếm trễ 1 nhịp — ĐÃ FIX

**Trước:** `login-view.tsx` đọc `lastErrorRef.current` (ref đồng bộ qua `useEffect`)
ngay trong `onAuthError` → luôn đọc status lần lỗi trước.

**Sau:** `useLogin.ts:45` extract `status` trực tiếp từ error trong `onError` callback,
truyền vào context `{ result, payload, status }`. `login-view.tsx:34` nhận `status`
từ context. Bỏ hoàn toàn `lastErrorRef` và `useEffect` đồng bộ ref.

**Đánh giá:** Fix đúng. `status` giờ có giá trị tức thì tại thời điểm lỗi — không
phụ thuộc ref hay effect.

#### ✅ resend OTP thiếu map 409 — ĐÃ FIX

**Trước:** `SEND_OTP_MESSAGE` chỉ có 400/404/429. BE trả 409 khi OTP còn hạn →
hiện raw message `"the otp will be reissuded after N seconds"`.

**Sau:** `auth-error-message.ts:87` — thêm `409: "An OTP was already sent. Please wait a moment and try again."` với comment rõ nguồn BE.

**Đề xuất nhỏ:** Message mới không hiển thị thời gian chờ cụ thể (VD "12 seconds").
BE trả message có chứa số giây nhưng FE không parse nó. Nếu muốn UX tốt hơn,
có thể regex `/\d+/` từ `backendMessage` và nhúng vào message template. Không
mang tính bug, chỉ là thiếu tối ưu UX.

#### ✅ OTP hết hạn 401 chưa map — ĐÃ FIX

**Trước:** `VERIFY_OTP_MESSAGE`, `VERIFY_ACCOUNT_MESSAGE`, `RESET_PASSWORD_MESSAGE`
không có 401 → hiện raw `"Otp expired"`.

**Sau:** Thêm `401: "The OTP code has expired. Please request a new one."` vào cả
3 bảng.

**Đánh giá:** Đúng. Message thống nhất cho cả 3 flow, rõ ràng, có CTA ngầm
("request a new one" → dùng `ResendOtpButton` đã có sẵn).

#### ✅ Zod parser — ĐÃ FIX

**Trước:** `ZOD_FIELD_TRANSLATIONS` chỉ có keyword Zod 3 (`"must contain at least"`,
`"string must contain"`). Message Zod 4 `"Too small: expected string to have >=6 characters"` không match → rơi generic.

**Sau:**

- Thêm 4 nhóm keyword mới: `"too small"`, `"too big"`,
`"password confirmation does not match"`, `"invalid input: expected string"`.
- `looksLikeZod` bổ sung 4 check mới để detect Zod 4 format.
- Giữ backward compatibility với Zod 3 format.

**Đánh giá:** Đúng hướng. Border case nhỏ: keyword `"too small"` quá rộng — nếu
BE trả message kiểu `"Field too small for array"` (không liên quan password) thì
vẫn sẽ match. Trong thực tế auth endpoints không có case này nên chấp nhận được.

#### ✅ `detectField` ưu tiên email trước password — ĐÃ FIX

**Trước:** check `"email"` trước `"password"` → login 422 `"Email or password is invalid."` gắn nhầm field email.

**Sau:** `auth-error-message.ts:290-294` — thứ tự mới: `otp` → `confirm` →
`password` → `name` → `email`.

**Đánh giá:** Đúng. Với login 422 `"Email or password is invalid."`,
`detectField` giờ trả `"password"` thay vì `"email"` → red border đúng ô password.

#### ✅ Code chết — ĐÃ XÓA

**Trước:** `AuthErrorAction` type, `pickAuthAction` function, `FormFieldError`
component, `AuthErrorAlert` component, `isRetry` option — tất cả tồn tại nhưng
không nơi nào render.

**Sau:**

- `auth-error-message.ts`: Xóa `AuthErrorAction` type, `action` field từ
`AuthErrorResult`, `pickAuthAction` function (~30 dòng).
- `useRegister.ts:32`: Bỏ `{ isRetry: true }`.
- `auth-error-alert.tsx`: Xóa toàn bộ file (119 dòng).
- `form-field-error.tsx`: Xóa toàn bộ file (36 dòng).

**Đánh giá:** Dọn sạch. Giảm ~190 dòng code thừa. Không có impact nào khác.

#### ✅ Lockout Enter bypass — ĐÃ FIX

**Trước:** Nút submit disabled nhưng Enter trong input vẫn gọi `onSubmit` → bump
đếm & reset timer → lockout không bao giờ hết nếu spam Enter.

**Sau:** `login-view.tsx:93` — `if (isLockedOut) return;` ở đầu `onSubmit`.

**Đánh giá:** Fix đơn giản và đúng. Guard này chặn cả `mutate()` lẫn `bumpAttempt()`.
Không có edge case nào với status check vì `isLockedOut` đã bao gồm đủ logic.

### Phát hiện mới trong diff



#### [P2] `useVerifyAccount.ts` dùng inline cast thay vì import `ApiError`

**Vị trí:** `src/features/auth/hooks/useVerifyAccount.ts:36-37`

```ts
const apiError = error as { response?: { status?: number } } | undefined;
const status = apiError?.response?.status;
```

So với `useLogin.ts:45` đã được fix:

```ts
const status = (error as ApiError | undefined)?.response?.status;
```

`useVerifyAccount` vẫn dùng inline type cast `{ response?: { status?: number } }`
thay vì import và cast sang `ApiError`. Hai cách đều hoạt động đúng, nhưng đây là
**code style inconsistency** — nếu `ApiError` type thay đổi (thêm field mới), chỉ
một trong hai nơi cập nhật. Nên统一 cho đồng nhất.

**Đề xuất:** Dùng `ApiError` ở cả 2 chỗ hoặc tạo helper `extractStatus(error)` dùng
chung.

#### [P3] `SEND_OTP_MESSAGE[429]` / `VERIFY_OTP_MESSAGE[429]` / `VERIFY_ACCOUNT_MESSAGE[429]` là dead code

**Vị trí:** `auth-error-message.ts` — các mục 429 trong 3 bảng trên.

BE (`otp.service.ts`, `auth.service.ts`) **không bao giờ** throw 429 — không có
rate-limit middleware. Các mục 429 này được thêm phòng ngừa ("defensive") nhưng
gây hiểu lầm khi đọc code: developer thấy map 429 sẽ nghĩ BE có trả 429.

**Đề xuất:** Thêm comment rõ `"// Defensive — BE does not throw 429 yet"` hoặc
đánh dấu `// @ts-expect-error` / xóa nếu muốn codebase chỉ phản ánh thực tế.

#### [P3] resetPassword form vẫn tiếng Việt

**Vị trí:** `src/hooks/auth/useResetPasswordForm.ts:56-63`

Đã nêu ở review 2, chưa được fix trong diff này. Messages tiếng Việt
(`"Vui lòng nhập mật khẩu mới."`, `"Please enter your new password."` trong code
hiện tại — đã chuyển sang tiếng Anh ở review 2). Kiểm tra lại:

```ts
// useResetPasswordForm.ts:56-63 (hiện tại trong working tree)
if (!newPassword) {
  nextErrors.newPassword = "Please enter your new password.";
} else if (newPassword.length < MIN_PASSWORD_LENGTH) {
  nextErrors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
}
```

**Update:** Reset password form **đã chuyển sang tiếng Anh** trong working tree
(review 2 đã fix). Không còn mismatch ngôn ngữ. Mục này có thể bỏ qua.

### Checklist kiểm thử


| Test case                          | Mong đợi                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- |
| Login sai password 5 lần liên tiếp | Lockout đúng lần thứ 5 (không phải 6)                                      |
| Lockout → spam Enter trong ô input | Không bump đếm thêm, timer không reset                                     |
| Resend OTP khi OTP còn hạn (409)   | Toast `"An OTP was already sent..."` thay vì raw `"reissuded"`             |
| Verify OTP mã hết hạn (401)        | Toast `"The OTP code has expired. Please request a new one."`              |
| Register / login 422 password ngắn | Red border ô password, message `"Password must be at least 6 characters."` |
| Register 422 email sai format      | Red border ô email, message `"Please enter a valid email address."`        |
| Verify account 409 (đã xác thực)   | Redirect về `/login`, không phụ thuộc message content                      |
| Logout → login lại                 | Lockout state reset (component remount)                                    |




### Files thay đổi trong diff này


| File                                     | Thay đổi                                                                                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/auth/login-view.tsx`     | Bỏ `lastErrorRef` + `useEffect` sync. Nhận `status` từ context. Thêm guard `if (isLockedOut) return;`                                                                                          |
| `src/features/auth/hooks/useLogin.ts`    | Thêm `status?: number` vào `LoginAuthErrorContext`. Extract status từ error. Import `ApiError`.                                                                                                |
| `src/features/auth/hooks/useRegister.ts` | Bỏ `{ isRetry: true }`                                                                                                                                                                         |
| `src/lib/auth-error-message.ts`          | Xóa `AuthErrorAction` / `action` / `pickAuthAction` / `isRetry`. Thêm 409 vào `SEND_OTP_MESSAGE`. Thêm 401 vào 3 bảng verify. Thêm Zod 4 keyword translations. Sửa `detectField` thứ tự check. |
| `src/components/ui/auth-error-alert.tsx` | Xóa file                                                                                                                                                                                       |
| `src/components/ui/form-field-error.tsx` | Xóa file                                                                                                                                                                                       |


