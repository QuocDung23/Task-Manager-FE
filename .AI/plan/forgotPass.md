# Forgot Password / Reset Password Plan

## Goal

Implement luong quen mat khau tren FE voi 3 buoc UI:

1. Nhap email
2. Nhap OTP
3. Nhap mat khau moi

Flow nay se dung cac API BE da co trong `Manage -Task/BE/src/modules/auth`:

- `POST /auth/sendOtp`
- `POST /auth/verifyOtp`
- `POST /auth/resetPassword`

## BE Flow Da Co

### 1. Send OTP

Endpoint: `POST /auth/sendOtp`

Request:

```json
{
  "email": "user@example.com"
}
```

Behavior:

- Kiem tra email co ton tai khong
- Tao OTP
- Gui OTP qua email

### 2. Verify OTP

Endpoint: `POST /auth/verifyOtp`

Request:

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

Response data:

```json
{
  "email": "user@example.com",
  "isValid": true
}
```

Behavior:

- Kiem tra email ton tai
- Kiem tra OTP hop le

### 3. Reset Password

Endpoint: `POST /auth/resetPassword`

Request:

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "123456",
  "confirmPassword": "123456"
}
```

Response data:

```json
{
  "email": "user@example.com",
  "isReset": true
}
```

Behavior:

- Verify lai OTP
- Update password moi

## FE Implementation Plan

## 1. Route

Them route moi cho trang forgot password.

Files can update:

- `FE/src/router/constans.ts`
- `FE/src/router/index.tsx`

De xuat:

- Them `FORGOT_PASSWORD: "/forgot-password"` vao `APP_ROUTES`
- Dat route nay trong `AuthRedirectRoute` cung cap voi `login` va `register`

## 2. Auth Types

Mo rong `FE/src/features/auth/types/index.ts`

Can them cac type:

```ts
export type ForgotPasswordRequest = {
  email: string;
};

export type VerifyOtpRequest = {
  email: string;
  otp: string;
};

export type VerifyOtpResponse = {
  email: string;
  isValid: boolean;
};

export type ResetPasswordRequest = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

export type ResetPasswordResponse = {
  email: string;
  isReset: boolean;
};
```

## 3. Auth API

Mo rong `FE/src/features/auth/api/auth-api.ts`

Them 3 ham:

```ts
forgotPassword: async (data: ForgotPasswordRequest): Promise<void>
verifyOtp: async (data: VerifyOtpRequest): Promise<VerifyOtpResponse>
resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse>
```

Map endpoint:

- `forgotPassword` -> `POST /auth/sendOtp`
- `verifyOtp` -> `POST /auth/verifyOtp`
- `resetPassword` -> `POST /auth/resetPassword`

Luu y:

- Khong can them cac endpoint nay vao `NO_REFRESHTOKEN_ENDPOINTS` vi user chua login nhung request nay cung khong can bearer token
- Neu muon safe hon, co the bo sung:
  - `/auth/sendOtp`
  - `/auth/verifyOtp`
  - `/auth/resetPassword`

Muc dich la tranh retry refresh token khong can thiet neu server tra `401`

## 4. React Query Hooks

Them cac hooks trong `FE/src/features/auth/hooks`

De xuat files:

- `useForgotPassword.ts`
- `useVerifyOtp.ts`
- `useResetPassword.ts`

Behavior:

### `useForgotPassword`

- Goi `authApi.forgotPassword`
- Toast success: "OTP has been sent to your email"
- Khi success thi move step tu `email` sang `otp`

### `useVerifyOtp`

- Goi `authApi.verifyOtp`
- Khi success thi move step tu `otp` sang `new-password`

### `useResetPassword`

- Goi `authApi.resetPassword`
- Toast success: "Password reset successfully"
- Redirect ve `APP_ROUTES.LOGIN`

## 5. UI Page Structure

Tao page va view rieng de de maintain.

De xuat files:

- `FE/src/pages/auth/forgot-password-page.tsx`
- `FE/src/components/auth/forgot-password-view.tsx`

Co the dung layout/card giong `login-view.tsx` va `register-view.tsx` de dong bo giao dien.

## 6. State Management Trong View

Trong `forgot-password-view.tsx`, quan ly local state:

```ts
type ForgotPasswordStep = "email" | "otp" | "reset";
```

State de xuat:

```ts
const [step, setStep] = useState<ForgotPasswordStep>("email");
const [email, setEmail] = useState("");
const [otp, setOtp] = useState("");
```

Muc dich:

- `email` duoc giu lai de dung cho step 2 va step 3
- `otp` duoc giu lai de dung cho reset password

## 7. UI Chi Tiet Theo Tung Step

### Step 1: Nhap email

Fields:

- `email`

Actions:

- Nut `Send OTP`
- Link quay lai `Login`

Validation:

- Email khong duoc rong
- Email dung format

Success:

- Luu `email`
- Chuyen sang step `otp`

### Step 2: Nhap OTP

Fields:

- `otp` do dai 6 ky tu

Actions:

- Nut `Verify OTP`
- Nut `Resend OTP`
- Nut `Back`

Validation:

- OTP khong duoc rong
- OTP phai du 6 ky tu

Success:

- Luu `otp`
- Chuyen sang step `reset`

### Step 3: Nhap mat khau moi

Fields:

- `newPassword`
- `confirmPassword`

Actions:

- Nut `Reset Password`
- Nut `Back`

Validation:

- Password toi thieu 6 ky tu
- Password toi da 20 ky tu
- `confirmPassword` phai giong `newPassword`

Success:

- Toast success
- Redirect ve login

## 8. UX Notes

De xuat UX de flow de dung hon:

- Hien title progress theo step:
  - `Step 1/3 - Enter email`
  - `Step 2/3 - Verify OTP`
  - `Step 3/3 - Create new password`
- Disable button khi mutation dang pending
- Hien email da nhap o step OTP va step reset de user biet dang thao tac voi email nao
- Nut `Resend OTP` tai step 2 se goi lai `sendOtp` voi email da luu
- Khi user bam `Back`:
  - Tu `otp` quay ve `email`
  - Tu `reset` quay ve `otp`

## 9. Error Handling

Can thong nhat thong bao loi tu API:

- Email khong ton tai -> show toast loi
- OTP sai / het han -> show toast loi
- Confirm password khong khop -> chan ngay tren FE truoc khi call API

Neu backend tra message text, uu tien show message do.

## 10. Entry Point Tu Login Page

Update `FE/src/components/auth/login-view.tsx`

Hien tai "Forgot your password?" dang la the `a` voi `href="#"`.

Can doi thanh `Link` den:

```ts
APP_ROUTES.FORGOT_PASSWORD
```

## 11. Suggested Order

Thu tu implement de it bi loi:

1. Them route constant + router
2. Them types
3. Them auth API
4. Them 3 mutation hooks
5. Tao page + view forgot password
6. Noi link tu login page
7. Test full flow email -> otp -> reset

## 12. Acceptance Criteria

- User co the vao trang forgot password tu login page
- User nhap email hop le va nhan OTP
- User nhap OTP dung de qua step tiep theo
- User nhap password moi va reset thanh cong
- Sau khi reset thanh cong, user duoc redirect ve login
- Flow hoat dong khong can user dang nhap

## 13. Luu Y Ky Thuat

- BE dang verify OTP 2 lan:
  - 1 lan o `verifyOtp`
  - 1 lan nua o `resetPassword`

Dieu nay hop ly cho security, nen FE van can giu ca `email` va `otp` den step cuoi.

- Trong `axios.ts`, interceptor response hien dang viet theo kieu bat loi o `request.use`, nen khi implement xong ma gap hanh vi refresh token bat thuong, can review lai interceptor nay. Plan forgot password van co the lam doc lap, nhung day la diem can de y khi test.
