# Verify Account Plan

## 1. Muc tieu

Implement luong xac thuc tai khoan sau khi dang ky, map dung voi BE `POST /auth/verify`.

Yeu cau nghiep vu cap nhat:

1. User register thanh cong.
2. User verify OTP thanh cong.
3. Neu verify thanh cong ngay sau register thi dang nhap thang vao he thong.
4. Neu register xong nhung thoat ra khi chua verify, user van co the login lai.
5. Sau khi login lai bang account chua verify, user bat buoc di qua man verify truoc khi duoc vao he thong.

Luot di mong muon:

1. User dang ky thanh cong.
2. FE dieu huong sang man hinh nhap OTP verify account.
3. User nhap `email + otp(6 so)`.
4. FE goi `POST /auth/verify`.
5. Neu thanh cong thi thong bao kich hoat tai khoan thanh cong va dieu huong ve `login`.

## 2. Doc BE verify

### Endpoint

- Route: `/auth/verify`
- Method: `POST`
- Body:

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Validation

- `email`: format email
- `otp`: string, length = 6

### Business logic

BE trong `Manage -Task/BE/src/modules/auth/auth.service.ts` dang lam:

1. Tim account theo `email` va `userStatus: PENDING`.
2. Neu khong tim thay account thi tra `NotFoundException("not account")`.
3. Neu `account.user.verify === true` thi tra `409 - Account is already verified`.
4. Verify OTP theo `userId + otp`.
5. Neu OTP sai/het han thi tra `400 - Invalid OTP`.
6. Neu dung thi update user:
   - `verify: true`
   - `status: ACTIVE`
7. Tra ve `AccountResDto`, trong do co `verify = true`.

### Ket luan quan trong cho FE

- Verify account la mot flow rieng, khong dung endpoint `/auth/verifyOtp`.
- Man verify hien tai cua FE dang phuc vu reset password, chua dung cho register.
- Sau register khong nen di thang ve login nhu hien tai.
- Can co kha nang resend OTP cho verify account, va resend nay phai goi `/auth/sendOtp`, khong phai "forgot password" ve mat nghia vu, du endpoint dang duoc tai su dung.

## 3. Hien trang FE

### Da co

- `register-view.tsx`: form dang ky.
- `useRegister.ts`: dang `toast success` roi `navigate('/login')`.
- `verifyOtp-view.tsx`: UI nhap 6 o OTP.
- `useVerifyOtp.ts`: dang goi `/auth/verifyOtp`.
- `resendOtp-button.tsx`: dang resend bang `authApi.forgotPassword({ email })`, thuc chat la `/auth/sendOtp`.

### Van de hien tai

1. Ten `forgotPassword` trong API dang gay nham vi no thuc chat goi `/auth/sendOtp`.
2. `verifyOtp-view.tsx` dang hard-code cho reset password:
   - submit thanh cong thi sang `/reset-password`
   - invalid state thi bat user quay ve `forgot-password`
   - copywriting dang trung tinh cho OTP, nhung flow la reset password
3. Register thanh cong nhung khong chuyen sang verify account.

## 4. Huong implement de xai lai toi da

### Phuong an de xuat

Tai su dung man OTP hien co, nhung cho no hoat dong theo `mode`.

Vi du query params:

- Verify account: `/verify-otp?email=a@b.com&flow=verify-account`
- Reset password: `/verify-otp?email=a@b.com&flow=reset-password`

### Loi ich

- Khong can tao 2 UI OTP gan nhu giong nhau.
- Dung chung input OTP, paste OTP, focus, countdown resend.
- Chi tach logic submit, text hien thi, redirect sau submit.

## 5. Ke hoach implement chi tiet

### Step 1. Tach API ro rang

Cap nhat `FE/src/features/auth/api/auth-api.ts`:

- Them `sendOtp(data)` goi `POST /auth/sendOtp`
- Them `verifyAccount(data)` goi `POST /auth/verify`
- Giu `verifyOtp(data)` cho reset password neu muon tach ro nghia vu
- Co the deprecate ten `forgotPassword(data)` vi no dang khong dung nghia

De xuat target type:

```ts
export type VerifyAccountRequest = {
  email: string;
  otp: string;
};

export type VerifyAccountResponse = {
  id: string;
  userId: string;
  email: string;
  name: string;
  bio: string;
  avatar: string;
  verify: boolean;
  status?: string;
};
```

### Step 2. Bo sung auth hooks

Tao:

- `useVerifyAccount.ts`
- Neu can, doi `useForgotPassword.ts` sang hook dung `sendOtp`

Yeu cau `useVerifyAccount`:

- mutate voi `email + otp`
- toast loi theo message tu server:
  - `Invalid OTP`
  - `Account is already verified`
  - `not account`
- onSuccess:
  - toast success
  - navigate ve `login`
  - co the prefill email cho login bang query param neu team muon

### Step 3. Dieu chinh flow register

Cap nhat `useRegister.ts`:

- Sau register thanh cong, khong navigate `/login`
- Navigate sang:

```ts
/verify-otp?email=${encodeURIComponent(email)}&flow=verify-account
```

- Toast nen doi thanh:
  - `Register successfully. Please verify your account.`

Ly do:

- Theo BE, account moi tao dang o `PENDING` va chua `verify`.
- Neu user ve login ngay co the gap chan luong dang nhap/phan quyen sau do.

### Step 4. Nang cap `verifyOtp-view.tsx` thanh man hinh da muc dich

Them `flow` tu search params:

- `verify-account`
- `reset-password`

Hanh vi theo flow:

#### `verify-account`

- Submit goi `useVerifyAccount`
- Success:
  - toast success
  - redirect `login`
- Copy:
  - title: `Verify your account`
  - description: `We sent a verification code to ...`
- Invalid state:
  - nut quay ve `register`

#### `reset-password`

- Giu logic hien tai:
  - submit goi `useVerifyOtp`
  - success redirect `/reset-password?email=...&otp=...`
- Invalid state:
  - nut quay ve `forgot-password`

#### Neu `flow` khong hop le

- Coi nhu request khong hop le
- Hien message bat user quay ve trang phu hop

### Step 5. Nang cap `ResendOtpButton`

Sua component de nhan them `flow`.

Props de xuat:

```ts
type ResendOtpButtonProps = {
  email: string;
  flow: "verify-account" | "reset-password";
  cooldownSeconds?: number;
};
```

Hanh vi:

- `verify-account` -> goi `authApi.sendOtp({ email })`
- `reset-password` -> van goi `authApi.sendOtp({ email })`

Ghi chu:

- Ve backend, ca 2 flow hien tai deu co the resend qua `/auth/sendOtp`.
- Ve frontend, truyen `flow` de de doi copy:
  - `A new verification code has been sent`
  - hoac `A new OTP has been sent`

### Step 6. Cap nhat route/copy neu can

Kiem tra cac hang so route trong:

- `FE/src/router/constans.ts`
- `FE/src/router/index.tsx`

Khong bat buoc them route moi neu tai su dung `/verify-otp`.

Neu muon ro nghia vu hon, co the them alias route:

- `/verify-account`

Nhung trong phase nay, dung query param `flow` la du va it thay doi hon.

## 6. File du kien can sua

- `FE/src/features/auth/types/index.ts`
- `FE/src/features/auth/api/auth-api.ts`
- `FE/src/features/auth/hooks/useRegister.ts`
- `FE/src/features/auth/hooks/useVerifyOtp.ts` hoac tach them `useVerifyAccount.ts`
- `FE/src/components/auth/verifyOtp-view.tsx`
- `FE/src/components/auth/resendOtp-button.tsx`
- Co the them:
  - `FE/src/features/auth/hooks/useVerifyAccount.ts`

## 7. Thu tu lam viec de implement

1. Bo sung types va API methods.
2. Tao `useVerifyAccount`.
3. Sua `useRegister` de redirect dung flow.
4. Refactor `verifyOtp-view.tsx` theo `flow`.
5. Refactor `ResendOtpButton` nhan `flow`.
6. Test manual 2 flow:
   - register -> verify account -> login
   - forgot password -> verify otp -> reset password

## 8. Tieu chi hoan thanh

- Register xong di den man verify account.
- Verify account goi dung `/auth/verify`.
- Verify thanh cong ngay sau register thi vao thang he thong.
- User chua verify neu thoat ra van login lai duoc.
- User chua verify sau khi login lai bi ep verify truoc khi vao cac protected route.
- OTP sai/het han hien dung loi server.
- Resend OTP van chay o ca 2 flow.
- Khong lam hong flow forgot password hien co.

## 9. Luu y implementation

- Nen tranh tiep tuc dung ten `forgotPassword` cho API `/auth/sendOtp` vi sau nay se gay roi.
- `verifyOtp-view.tsx` nen tach ro logic theo `flow`, tranh hard-code redirect.
- Neu server tra `409 Account is already verified`, FE co the cho phep user di thang ve login.
- Neu co thoi gian, nen dua `flow` ve constant/type union de tranh typo query param.

Friday 11:13 PM

## 10. BE auth verify plan theo yeu cau moi

### 10.1. Hien trang BE

Code hien tai trong `Manage -Task/BE/src/modules/auth/auth.service.ts`:

1. `register`
   - Tao user voi `status = PENDING`
   - `verify = false`
   - Gui OTP qua `sendOtp`
2. `verify`
   - Chi verify account `PENDING`
   - Neu OTP dung thi update:
     - `verify = true`
     - `status = ACTIVE`
   - Chi tra `AccountResDto`, chua tra token
3. `login`
   - Neu `status === PENDING` thi throw `401 your account is not verified`
   - Nghia la user chua verify hien tai khong the login lai

### 10.2. Gap voi yeu cau

Yeu cau cua ban va code hien tai dang lech nhau o 2 diem:

1. Verify xong dang nhap thang:
   - Hien tai `verify` khong cap token
2. Chua verify van login lai duoc:
   - Hien tai `login` dang chan ngay tu BE

### 10.3. De xuat business flow moi

#### Flow A. Register roi verify ngay

1. `POST /auth/register`
   - Tao account `PENDING`
   - Gui OTP
2. FE chuyen sang man verify
3. `POST /auth/verify`
4. Neu OTP hop le:
   - Update user `verify = true`
   - Update user `status = ACTIVE`
   - Sinh `accessToken + refreshToken`
   - Luu refresh token
   - Tra token ve cho FE
5. FE luu token va vao he thong

#### Flow B. Register xong thoat ra, login lai sau

1. Account van la `PENDING`, `verify = false`
2. User login bang email/password van duoc phep
3. BE tra ve token co danh dau account chua verify, hoac tra ve response de FE biet day la session chua verify
4. FE chi cho vao man verify account
5. Khi verify thanh cong:
   - Cap nhat user thanh `ACTIVE`
   - Neu session da co token thi cho vao he thong
   - Hoac cap token moi sau verify de dong bo state

### 10.4. Quyết định kien truc nen chot truoc khi code

Co 2 huong, nhung de xuat chon Huong 1 vi don gian hon cho FE route guard.

#### Huong 1. Cho phep login voi account `PENDING` va cap token co claim `verify`

De xuat:

1. Sua `signJWT` de payload co them:
   - `userId`
   - `email`
   - `verify`
   - `status`
2. `login`:
   - Neu password dung va account `PENDING` thi van cap token
   - Khong cho vao he thong o FE neu `verify = false`
3. `verify`:
   - Sau khi verify thanh cong, cap token moi voi `verify = true`, `status = ACTIVE`

Loi ich:

- FE route guard doc token la biet co duoc vao he thong hay khong
- User chua verify van duy tri duoc session de di verify
- Verify xong co the vao thang he thong ma khong can login lai

Rui ro can xu ly:

- Tat ca protected API quan trong o BE neu can cung nen check `verify/status`, khong chi tin FE

#### Huong 2. Khong cap token cho account `PENDING`, login tra mot response dac biet

Vi du login tra:

```json
{
  "accessToken": null,
  "refreshToken": null,
  "requiresVerification": true,
  "email": "user@example.com"
}
```

Nhuoc diem:

- FE phai xu ly them 1 kieu session nua
- Sau verify van can login lai hoac BE phai cap token tai endpoint verify
- Route guard phuc tap hon

### 10.5. De xuat thay doi cu the o BE

#### A. Sua `LoginResponseDto`

Them cac field metadata:

```ts
export class LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  email: string;
  verify: boolean;
  status: string;
}
```

Neu muon giu response gon, it nhat token payload phai co `email` va `verify`.

#### B. Sua `signJWT`

Tai `Manage -Task/BE/src/common/utils/jwt.utils.ts`, khi ky token nen truyen payload day du:

```ts
await signJWT({
  userId: account.userId,
  email: account.user?.email,
  verify: account.user?.verify,
  status: account.user?.status,
});
```

#### C. Sua `login`

Logic de xuat:

1. Tim account theo email
2. Check password
3. Neu `LOCKED` thi chan
4. Neu `PENDING`:
   - Van cho login
   - Cap token voi `verify = false`
5. Neu `ACTIVE`:
   - Cap token binh thuong

Can bo doan:

```ts
if (account.user?.status === UserStatus.PENDING) {
  throw new OptionalException(
    StatusCodes.UNAUTHORIZED,
    "your account is not verified",
  );
}
```

#### D. Sua `verify`

Sau khi update user thanh `ACTIVE`, lam them:

1. Sinh token moi
2. Luu refresh token
3. Tra response gom:
   - thong tin account
   - `accessToken`
   - `refreshToken`

De xuat response:

```ts
{
  success: true,
  data: {
    id,
    userId,
    email,
    name,
    avatar,
    verify: true,
    status: "ACTIVE",
    accessToken,
    refreshToken
  }
}
```

#### E. Can them guard/check o BE cho API nghiep vu

Neu hien tai middleware `verifyAccessToken` chi check token hop le, thi nen bo sung them 1 lop check cho cac API can account da verify:

- `user.verify === true`
- `user.status === ACTIVE`

Vi neu khong, user `PENDING` co token van co the goi API truc tiep.

Co the lam 1 middleware rieng, vi du:

- `requireActiveVerifiedUser`

Middleware nay dung cho cac route nghiep vu chinh thay vi route verify/sendOtp.

### 10.6. File BE du kien can sua

- `Manage -Task/BE/src/modules/auth/auth.service.ts`
- `Manage -Task/BE/src/modules/auth/dtos/responses/login.res.ts`
- `Manage -Task/BE/src/modules/auth/dtos/responses/account.res.ts` hoac tao response dto moi cho verify
- `Manage -Task/BE/src/common/utils/jwt.utils.ts`
- `Manage -Task/BE/src/common/middlewares/auth.middleware.ts`
- Cac route/protected module dang can ep account `ACTIVE + verify = true`

### 10.7. Thu tu implement de xuat

1. Chot response contract cho `login` va `verify`
2. Sua JWT payload de co `email`, `verify`, `status`
3. Sua `login` cho phep `PENDING` login
4. Sua `verify` de tra token ngay sau khi kich hoat
5. Them middleware check `ACTIVE + verify = true` cho protected APIs
6. Cap nhat FE route guard va verify flow theo contract moi
7. Test manual 4 case:
   - register -> verify -> vao he thong
   - register -> thoat -> login -> bi dua den verify
   - login account da verify -> vao he thong
   - account `LOCKED` -> van bi chan

### 10.8. Tieu chi hoan thanh cho yeu cau cua ban

1. Register xong, verify dung OTP thi vao thang he thong khong can login lai.
2. Account chua verify neu thoat ra van login lai duoc.
3. Account chua verify sau login khong vao duoc protected pages/API.
4. Verify xong tu session dang login se duoc nang cap thanh session hop le de su dung he thong.
5. Account `LOCKED` van khong login duoc.
