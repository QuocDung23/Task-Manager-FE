# Change Password Plan (User đang đăng nhập tự đổi mật khẩu)

## Goal

Cho user **đã đăng nhập** tự đổi mật khẩu của chính mình, thông qua **tab "Password" trong Profile dialog** đang có sẵn ở sidebar.

Phân biệt rõ với `forgotPass.md` (quên mật khẩu, chưa đăng nhập, dùng OTP qua email).

| Flow | Trạng thái user | Cơ chế | Endpoint |
| --- | --- | --- | --- |
| Forgot password | Chưa login | Email + OTP | `POST /auth/otp` → `POST /auth/otp/verification` → `POST /auth/password-reset` |
| **Change password (plan này)** | **Đã login** | **Xác thực mật khẩu cũ** | **`PATCH /user/me/password`** |

## Quyết định đã chốt

| Hạng mục | Quyết định |
| --- | --- |
| UI location | Tab "Password" trong `ViewProfileUser` dialog (không tạo route mới) |
| Sau khi đổi thành công | Toast success + reset form. **Giữ nguyên session**, không logout |
| BE | **Chưa đụng vào code BE.** Ghi nhận bug vào mục 2 để duyệt riêng |

---

## 1. Trạng thái hiện tại của BE

**BE đã có sẵn endpoint** — không cần viết mới logic đổi mật khẩu.

Chuỗi đầy đủ đang chạy:

```
PATCH /user/me/password
  → authMiddleware.verifyAccessToken          (bắt buộc Bearer token)
  → validateRequestMiddleware(changePasswordRequestValidationSchema)
  → userController.changePassword             (user.controller.ts:95)
      → authService.changPassword(userId, dto)  (auth.service.ts:272)
          → authRepository.findAccountByUserId(userId)   (auth.repository.ts:126)
          → bcrypt hash(currentPassword, account.salt) !== account.password → BadRequest
          → genSalt(10) + hash(newPassword, newSalt)
          → authRepository.updateAccountPassword({ userId, passwordHash, salt })  (auth.repository.ts:134)
```

**Request schema** — `BE/src/modules/user/dtos/request/changePassword.req.ts`:

```ts
{
  currentPassword: z.string().min(6).max(20),
  newPassword:     z.string().min(6).max(20),
  confirmPassword: z.string().min(6).max(20),
}
// .refine: newPassword === confirmPassword
// .refine: newPassword !== currentPassword
```

**Response runtime thật** — service trả `{ success: true, data: undefined }`, và `HttpResponseDto.success` gọi `res.status(200).json(data)`. Vì `data` là `undefined` nên `JSON.stringify` loại bỏ key:

```json
{ "success": true }
```

→ FE **không được** type là `ApiResponse<{ message: string }>` và **không được** đọc `response.data.data.message`. Phải type `ApiResponse<void>`.

**Các lỗi BE trả về:**

| Status | Message | Nguồn |
| --- | --- | --- |
| 400 | `"Current password is incorrect"` | `auth.service.ts` (`BadRequest`) |
| 404 | `"Not Found Account"` | `auth.service.ts` (`NotFoundException`) |
| 400 | `"<path> <message>; ..."` (Zod) | `validationRequest.middleware.ts` |
| 401 | Token hết hạn / không gửi | `authMiddleware.verifyAccessToken` |

Shape chung: `{ "success": false, "message": "..." }`.

---

## 2. Bug BE đã phát hiện (CHƯA SỬA — chờ duyệt)

Ghi nhận toàn bộ để review. **Plan này không sửa file BE nào.**

### Bug 1 — Sai shape response schema, khai báo lộ field `password`

`BE/src/modules/user/dtos/response/changePassword.res.ts`:

```ts
export const changPasswordResponseSchema = z.object({
    password: z.string()
})
```

Hai vấn đề trong một:

1. Schema khai báo field `password`, nhưng service **không bao giờ trả field này**. Swagger document sai so với runtime.
2. Tên field `password` trong contract là dấu hiệu xấu — dễ bị hiểu nhầm là API trả về mật khẩu (mật khẩu đã hash hay chưa?). Dù là `password: z.string()` generic, đặt tên như vậy trong response contract là không nên.

**Đề xuất:** đổi thành message DTO, khớp với pattern `LogoutResponseDto`:

```ts
export class ChangePasswordResponseDto {
  message: string;
  constructor(message: string) { this.message = message; }
}

export const changePasswordResponseSchema = z.object({
  message: z.string(),
});
```

Kèm sửa service trả `data: new ChangePasswordResponseDto("Password changed successfully")` để response thật khớp schema. **Lưu ý:** đổi response shape này sẽ ảnh hưởng FE — nếu chọn phương án này thì FE phải đọc `response.data.data.message`, hoặc giữ FE tự hiển thị toast độc lập (đề xuất: giữ FE tự hiển thị, không phụ thuộc message từ BE → an toàn hơn).

### Bug 2 — Typo `changPassword` (thiếu chữ `e`)

- `auth.service.ts:272` — method `changPassword`
- `user.controller.ts:100` — call site `this.authService.changPassword(...)`
- `changePassword.res.ts` — `changPasswordResponseSchema`

Thiếu `e` ở cả 3 chỗ. Sửa đồng bộ cả 3 cùng lúc (đổi tên method = breaking change với call site, phải đổi cả hai).

### Bug 3 — Thiếu `security` trong OpenAPI registration

`BE/src/modules/user/user.router.ts:107-114` đăng ký path `/user/me/password` **không có** `security: [{ bearerAuth: [] }]`, dù route có middleware `verifyAccessToken`. So sánh: `/auth/logout` trong `auth.router.ts` có khai báo này.

→ Swagger UI không hiện icon ổ khóa, người đọc tưởng endpoint không cần token.

**Đề xuất:** thêm `security: [{ bearerAuth: [] }]` vào `userRegistry.registerPath` của `/user/me/password` (và nên review lại các endpoint protected khác trong `user.router.ts` — `/user/me/avatar`, `/user/me` cũng thiếu).

### Bug 4 — Đổi mật khẩu không thu hồi session cũ

`changPassword` không gọi `authRepository.deleteTokenByUserId(userId)` (hàm này **đã có sẵn** tại `auth.repository.ts:150`, chỉ đang được `logout` dùng).

→ Sau khi đổi mật khẩu, **mọi refresh token cũ vẫn hợp lệ**. Nếu người dùng đổi mật khẩu vì nghi ngờ bị lộ, tài khoản vẫn bị truy cập từ các thiết bị đã đăng nhập.

**Đề xuất:** gọi `deleteTokenByUserId` sau khi update password.

**Xung đột với quyết định UX:** nếu revoke token thì phiên hiện tại cũng chết → user phải login lại, trái với quyết định "giữ phiên, chỉ toast + reset form". Nên **cần review chọn**:

- (a) Không revoke → giữ session, chấp nhận rủi ro bảo mật (đơn giản, khớp quyết định đã chốt)
- (b) Revoke token → buộc login lại (an toàn hơn, đổi quyết định UX)
- (c) Revoke token **trừ** token hiện tại → phức tạp hơn, cần BE trả access token mới luôn

FE hiện tại **không** chờ response có token mới, nên chọn (a) thì FE không cần đổi gì.

### Bug 5 — Không có rate limit chống đoán mật khẩu cũ

Project **chưa có rate limit ở bất cứ đâu** (`grep -ri "rate.?limit|express-rate-limit|throttle" src/` → 0 kết quả). `currentPassword` sai trả `400` vô hạn lần → có thể brute-force.

Cần thêm dependency + middleware mới (vi phạm convention "không thêm pattern lạ" của project). Đề xuất **defer**, ghi nhận làm ticket riêng. Nếu làm ngay thì đặt tên `BE/src/common/middlewares/rateLimit.middleware.ts`, export từ `common/middlewares/index.ts`.

### Bug 6 — Zod validation trả 400 nhưng FE chỉ parse lỗi Zod ở 422

`validationRequest.middleware.ts` throw `OptionalException(StatusCodes.BAD_REQUEST, ...)` → **400**, không phải 422. Nhưng `FE/src/lib/auth-error-message.ts` chỉ chạy `parseZod422Message()` khi `status === 422`.

→ Nếu FE dùng `getAuthErrorMessage`, lỗi validation sẽ hiện 1 chuỗi gộp kiểu `"newPassword Too small: ...; confirmPassword Password confirmation does not match"`, không map được về từng field.

**Cách xử lý trong plan này:** validate **đầy đủ ở FE** trước khi gọi API (theo đúng convention của `useResetPasswordForm`), nên BE gần như không bao giờ trả lỗi Zod. Không cần sửa FE error helper.

Lưu ý: còn tồn tại sự lệch này cho **tất cả** auth endpoint hiện tại (register, reset...) — là bug có sẵn của project, không do plan này gây ra.

### Bug 7 — `AuthFieldKey` union thiếu `currentPassword` / `newPassword`

`FE/src/lib/auth-error-message.ts` định nghĩa `AuthFieldKey` chỉ có `email | password | confirmPassword | name | otp`. Không có `currentPassword` / `newPassword`.

Không ảnh hưởng nếu FE validate client-side (đề xuất của plan này), nhưng nếu sau này muốn dùng cơ chế field mapping từ BE thì phải mở rộng union + `isAuthFieldKey` + `detectField` + thứ tự `firstField`.

### Bug 8 — FE chưa enforce `max(20)`

BE chặn `> 20` ký tự. FE hiện tại (`useResetPasswordForm.ts`) chỉ check `min 6`, **không** có `max`. Đây là bug có sẵn của form reset password.

→ Plan này sẽ enforce cả `min 6` **và** `max 20` cho form đổi mật khẩu mới (không sửa form cũ trong scope này).

### Bug 9 — `findAccountByUserId` không `include: { user: true }`

`auth.repository.ts:126` không có `include: { user: true }` (khác `findAccount`). Với use case đổi mật khẩu thì **không sao** — chỉ cần `password` + `salt` từ bảng `accounts`. Ghi nhận để không ai "sửa cho đẹp" rồi làm nặng query. Không cần hành động.

### Bug 10 — So sánh mật khẩu dùng `!==` thay vì `bcrypt.compare`

`hash(currentPassword, account.salt) !== account.password` — so sánh chuỗi bằng `!==`, không phải `bcrypt.compare()`.

Về mặt an toàn: `!==` trên JS string **không constant-time**, có thể lộ thông tin qua timing. `bcrypt.compare` dùng `timingSafeEqual` nên an toàn hơn.

Đây là convention **xuyên suốt project** (`login` cũng làm vậy, `auth.service.ts:96`), nên không nên sửa riêng một chỗ trong scope plan này. Ghi nhận làm ticket kỹ thuật riêng.

---

## 3. FE Implementation Plan

### 3.1. Kiến trúc tổng thể

```
sideBar-user.tsx (không đổi)
  └─ ViewProfileUser  (profile-user.tsx)  ← THÊM Tabs ở đây
       ├─ TabsList: [Profile] [Password]
       ├─ TabsContent value="profile"  → ProfileInfo / EditForm  (giữ nguyên logic cũ)
       └─ TabsContent value="password" → ChangePasswordForm      ← MỚI
              └─ useChangePasswordForm  (hooks/users/useChangePasswordForm.ts)  ← MỚI
                    └─ useChangePassword (features/users/hooks/useChangePassword.ts)  ← MỚI
                          └─ userApi.changePassword (features/users/api/user-api.ts)  ← MỚI
                                └─ PATCH /user/me/password
```

Không thêm route mới. Không thêm entry menu mới trong sidebar (dùng tab trong dialog hiện có).

### 3.2. Files cần tạo mới

| File | Vai trò |
| --- | --- |
| `src/components/ui/tabs.tsx` | Shadcn Tabs primitive, wrap `Tabs` từ `radix-ui` |
| `src/components/users/change-password-form.tsx` | UI form 3 field + nút Cancel/Update |
| `src/hooks/users/useChangePasswordForm.ts` | State + validation + submit (mirror `useResetPasswordForm.ts`) |
| `src/features/users/hooks/useChangePassword.ts` | React Query mutation (mirror `useUpdateUser.ts`) |

### 3.3. Files cần sửa

| File | Thay đổi |
| --- | --- |
| `src/features/users/types/index.ts` | Thêm `ChangePasswordPayload` |
| `src/features/users/api/user-api.ts` | Thêm `changePassword()` |
| `src/components/users/profile-header.tsx` | Thêm prop `showEditButton` (mặc định `true`) |
| `src/components/users/profile-user.tsx` | Bọc nội dung trong `Tabs`, thêm tab "Password" |

---

## 4. Chi tiết từng bước

### Bước 1 — Tạo `src/components/ui/tabs.tsx`

Project **chưa có** file Tabs, nhưng đã cài sẵn `@radix-ui/react-tabs` và `radix-ui` (`package.json`). Đã verify `radix-ui` export `Tabs` (`node_modules/radix-ui/dist/index.d.mts`: `export { reactTabs as Tabs }`).

Viết theo **đúng convention shadcn** mà các file `ui/` khác đang dùng (`dialog.tsx`, `separator.tsx`):

```tsx
import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List
    data-slot="tabs-list"
    className={cn(
      "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
      className
    )}
    {...props}
  />
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger
    data-slot="tabs-trigger"
    className={cn(
      "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium text-foreground transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:shadow-sm disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  />
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content
    data-slot="tabs-content"
    className={cn("flex-1 outline-none", className)}
    {...props}
  />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

Lưu ý style: file `ui/` dùng **double quotes**, **không có trailing comma** ở object cuối, indent 2 space — copy đúng từ `dialog.tsx`.

### Bước 2 — Thêm type vào `src/features/users/types/index.ts`

Feature `users` dùng hậu tố `Payload` cho payload (không phải `Request` như feature `auth`). Theo đó:

```ts
export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
```

Không thêm response type — xem giải thích ở mục 5.

### Bước 3 — Thêm API vào `src/features/users/api/user-api.ts`

```ts
changePassword: async (data: ChangePasswordPayload): Promise<ApiResponse<void>> => {
  const response = await axiosLocal.patch<ApiResponse<void>>("/user/me/password", data);
  return response.data;
}
```

Giữ đúng style file hiện tại (`Promise<ApiResponse<T>>`, trả `response.data` — khác feature `auth` vốn trả `response.data.data`).

**Không thêm `/user/me/password` vào `NO_REFRESHTOKEN_ENDPOINTS`** trong `src/services/axios.ts` (danh sách hiện chỉ có `/auth/login`, `/auth/register`, `/auth/refresh-token`). Endpoint này cần Bearer token và **cần** retry khi refresh token còn hiệu lực — nếu thêm vào danh sách đó thì 401 sẽ không được refresh.

### Bước 4 — Tạo `src/features/users/hooks/useChangePassword.ts`

Mirror **chính xác** `useUpdateUser.ts` (cùng feature `users`, cùng loại mutation, không phải auth flow nên **không** dùng `getAuthErrorMessage`):

```ts
import { useMutation } from "@tanstack/react-query";
import { userApi } from "../api/user-api";
import type { ChangePasswordPayload } from "../types";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: ChangePasswordPayload) => userApi.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Change password failed");
    },
  });
};
```

**Không** `invalidateQueries(["current-user"])` — mật khẩu không nằm trong response của `current-user`, không có gì cần refresh.

**Không** `clearToken()` / `navigate` — theo quyết định "giữ phiên".

### Bước 5 — Tạo `src/hooks/users/useChangePasswordForm.ts`

Mirror `src/hooks/auth/useResetPasswordForm.ts` — đây là tiền lệ gần nhất về form mật khẩu (validation tay, `FormData`, không react-hook-form).

```ts
import { useState, useRef, type FormEvent } from "react";
import { toast } from "sonner";
import { useChangePassword } from "@/features/users/hooks/useChangePassword";

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 20;

export type ChangePasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
};
```

State:

- `fieldErrors: ChangePasswordFieldErrors`
- `showCurrent`, `showNew`, `showConfirm` — 3 toggle show/hide riêng (an toàn hơn 1 toggle chung vì 3 field là 3 mật khẩu khác nhau)
- `formRef: RefObject<HTMLFormElement>` — để reset form sau khi submit thành công

`onSubmit(event)`:

1. `event.preventDefault()`
2. `new FormData(event.currentTarget)` → đọc `currentPassword`, `newPassword`, `confirmPassword`
3. Validate, theo đúng rule của BE:

| Field | Rule | Message |
| --- | --- | --- |
| `currentPassword` | required | `"Please enter your current password."` |
| `currentPassword` | 6 ≤ len ≤ 20 | `"Current password must be between 6 and 20 characters."` |
| `newPassword` | required | `"Please enter your new password."` |
| `newPassword` | 6 ≤ len ≤ 20 | `"Password must be between 6 and 20 characters."` |
| `newPassword` | ≠ `currentPassword` | `"New password must be different from your current password."` |
| `confirmPassword` | required | `"Please confirm your new password."` |
| `confirmPassword` | 6 ≤ len ≤ 20 | `"Please confirm your new password."` |
| `confirmPassword` | = `newPassword` | `"Passwords do not match."` |

4. Nếu có lỗi → `setFieldErrors(nextErrors)` + `toast.error(firstError)` + `return` (**không gọi API**)
5. Nếu OK → `setFieldErrors({})` + `changePassword.mutate({...}, { onSuccess: () => reset() })`

`reset()`: `formRef.current?.reset()` + tắt cả 3 toggle + `setFieldErrors({})`.

Cũng cần `clearFieldError(field)` để xóa lỗi khi user gõ lại (giống `useResetPasswordForm`), và mapping message BE về đúng field trong `onError` của mutate:

| BE message | Field hiển thị lỗi |
| --- | --- |
| chứa `"currentPassword"` hoặc `"Current password is incorrect"` | `currentPassword` |
| chứa `"confirmPassword"` | `confirmPassword` |
| chứa `"newPassword"` | `newPassword` |
| còn lại | `form` (hiển thị chung trên đầu form) |

Hook `useChangePassword` tự `toast.error`; form hook chỉ mirror lỗi vào field state — đúng split đã quy ước tại đầu `auth-error-message.ts`.

Return: `{ fieldErrors, isPending, formRef, onSubmit, showCurrent, setShowCurrent, showNew, setShowNew, showConfirm, setShowConfirm, clearFieldError, minPasswordLength, maxPasswordLength }`

### Bước 6 — Tạo `src/components/users/change-password-form.tsx`

Props (theo convention `interface XxxProps` đặt trên component, như `edit-form.tsx`):

```tsx
interface ChangePasswordFormProps {
  onCancel: () => void;
}
```

Bên trong dùng `useChangePasswordForm()`.

Layout — dùng shadcn primitive (`Input`, `Label`, `FieldError`, `Button`) thay vì raw `<input>` như `edit-form.tsx`:

- Lý do: `Input` đã xử lý `aria-invalid` styling sẵn, `FieldError` đã có sẵn cơ chế dedupe message và render `role="alert"`, đồng bộ với `resetPassword-view.tsx` và `update-list-dialog.tsx`.
- Đánh đổi: `edit-form.tsx` dùng raw input + hằng `fieldClass`/`labelClass`, nên 2 tab trong cùng dialog sẽ hơi khác style nhau.
- Nếu muốn **đồng bộ tuyệt đối** với tab Profile: copy nguyên `fieldClass`/`labelClass` từ `edit-form.tsx` sang dùng raw `<input>`. Đổi lại mất `aria-invalid` styling sẵn có.

→ Đề xuất dùng shadcn primitive.

Nội dung form:

- Tiêu đề nhỏ: "Change password" + mô tả ngắn "Your new password must be different from your current password."
- 3 field, mỗi field gồm `<Label>` + wrapper `relative` + `<Input type={show ? "text" : "password"}>` + nút toggle `Eye` / `EyeOff` bên trong wrapper + `<FieldError>` bên dưới
- `autoComplete`: `currentPassword` → `"current-password"`, 2 field kia → `"new-password"`
- Field đầu tiên `autoFocus`
- Footer: `<Button variant="outline" size="sm">Cancel</Button>` + `<Button size="sm" disabled={isPending}>{isPending ? "Updating…" : "Update password"}</Button>`, trong `flex justify-end gap-2 pt-1` — copy y hệt style footer của `edit-form.tsx`

Về icon toggle: repo **chưa** có component `<PasswordInput>` và chưa import `Eye`/`EyeOff` ở đâu. Đề xuất dùng `lucide-react` (`Eye`, `EyeOff`) đặt `absolute right-2 top-1/2 -translate-y-1/2`, click vào gọi toggle. Đây là pattern mới nhưng `lucide-react` đã dùng rộng rãi (vd. `profile-header.tsx` dùng `Camera`, `PencilIcon`).

### Bước 7 — Sửa `src/components/users/profile-header.tsx`

Thêm prop để ẩn nút Edit ở tab Password:

```tsx
interface ProfileHeaderProps {
  user: ProfileUser;
  edit: boolean;
  isLoading: boolean;
  onEdit: () => void;
  showEditButton?: boolean;   // default true
}
```

Render: `{!edit && showEditButton && ( <Button ... /> )}`.

Backward-compatible, không ảnh hưởng chỗ dùng khác (chỉ `profile-user.tsx` dùng `ProfileHeader`).

### Bước 8 — Sửa `src/components/users/profile-user.tsx`

Bọc phần thân dialog trong `Tabs`. Giữ nguyên `ProfileHeader` ở trên (avatar + tên + email), `Separator`, rồi `Tabs`.

Cấu trúc sau khi sửa:

```
<DialogContent className="overflow-hidden p-0 sm:max-w-[480px]">
  <ProfileHeader ... />                                  {/* giữ nguyên vị trí */}
  <Separator />
  <Tabs value={tab} onValueChange={...} className="gap-0">   {/* MỚI */}
    <div className="px-6 pt-4">
      <TabsList className="w-full">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
    </div>
    <TabsContent value="profile" className="px-6 py-4"> {/* nội dung cũ */}
      {edit ? <EditForm ... /> : <ProfileInfo user={displayUser} />}
    </TabsContent>
    <TabsContent value="password" className="px-6 pb-6"> {/* MỚI */}
      <ChangePasswordForm onCancel={...} />
    </TabsContent>
  </Tabs>
</DialogContent>
```

Cần chỉnh thêm:

1. **Dùng controlled Tabs** để theo dõi tab đang active:

```tsx
const [tab, setTab] = useState("profile");
// ...
<Tabs
  value={tab}
  onValueChange={(value) => {
    setTab(value);
    if (value !== "profile") setEdit(false);
  }}
>
```

`edit` state chỉ có ý nghĩa ở tab `profile`. Nếu không reset, user chuyển sang tab `password` rồi quay lại sẽ vào thẳng form edit dở dang.

2. **Truyền `showEditButton={tab === "profile"}`** xuống `ProfileHeader` — nếu không, nút Edit vẫn hiện ở tab Password (`edit=false` → `!edit` → hiện nút) rất vô lý.

3. **`onCancel` của `ChangePasswordForm`**: hành động hợp lý nhất là reset form về trạng thái rỗng, **không** đóng dialog (vì dialog là container chung, đóng cả dialog khi bấm Cancel trong 1 tab rất lạ). Nếu muốn đóng dialog thì truyền `handleClose`.

4. **Chiều cao dialog**: `sm:max-w-[480px]` không đổi. Nội dung tab `password` cao hơn nhưng `overflow-hidden` + `max-h` của `DialogContent` sẵn có scroll. Kiểm tra lại khi chạy thật.

5. **Reset `tab` về `"profile"` khi đóng dialog** — thêm vào `handleClose` cùng chỗ đang `setEdit(false)`, để mở lại dialog luôn vào tab Profile.

6. **Form state tự reset khi đóng/mở dialog**: Radix Dialog mặc định unmount content khi đóng → `ChangePasswordForm` unmount → state trong hook cũng mất → mở lại là sạch. Nếu sau này bật `forceMount`, cần reset thủ công. Ghi chú lại để sau này không quên.

---

## 5. Về response shape — quyết định quan trọng

BE runtime trả `{ "success": true }`, **không** có key `data` (vì service trả `data: undefined`).

Điều này có 2 hệ quả:

1. **FE không được** viết `response.data.data.message` — sẽ crash (`undefined.message`).
2. `ApiResponse<void>` là type đúng cho hiện tại.

Nếu sau này sửa **Bug 1** (đổi response thành `{ message: string }`), FE **không cần sửa** vì toast success đã tự hardcode trong `useChangePassword.onSuccess` và lỗi đã đọc qua `error.response?.data?.message`. Đây là lý do chọn hardcode message thay vì đọc từ response.

---

## 6. Thứ tự implement

1. Tạo `src/components/ui/tabs.tsx`
2. Thêm `ChangePasswordPayload` vào `src/features/users/types/index.ts`
3. Thêm `changePassword()` vào `src/features/users/api/user-api.ts`
4. Tạo `src/features/users/hooks/useChangePassword.ts`
5. Tạo `src/hooks/users/useChangePasswordForm.ts`
6. Tạo `src/components/users/change-password-form.tsx`
7. Sửa `src/components/users/profile-header.tsx` (thêm prop `showEditButton`)
8. Sửa `src/components/users/profile-user.tsx` (bọc Tabs)
9. Verify: `npm run lint` + `npm run build`

Thứ tự này đảm bảo mỗi bước đều compile được độc lập, dễ review từng diff.

---

## 7. Acceptance Criteria

- [ ] Mở dropdown user ở sidebar → click **Profile** → dialog hiện 2 tab: `Profile` | `Password`
- [ ] Click tab `Password` → hiện form 3 field: Current password, New password, Confirm password
- [ ] Nút Edit chỉ xuất hiện ở tab `Profile`, không xuất hiện ở tab `Password`
- [ ] Submit form rỗng → hiện lỗi inline dưới từng field + toast, **không** gọi API
- [ ] `newPassword` khác `currentPassword` → bị chặn ở FE, không gọi API
- [ ] `newPassword` > 20 ký tự → bị chặn ở FE, không gọi API
- [ ] `confirmPassword` ≠ `newPassword` → bị chặn ở FE, không gọi API
- [ ] Nhập `currentPassword` sai + 2 field mới hợp lệ → gọi API → BE trả 400 → toast `"Current password is incorrect"` + lỗi inline dưới field Current password
- [ ] Nhập đúng cả 3 field → toast success → **3 input được xóa trắng**, user vẫn đăng nhập, không bị logout, không chuyển trang
- [ ] Đóng rồi mở lại dialog → tab về `Profile`, form ở trạng thái sạch
- [ ] `npm run lint` pass
- [ ] `npm run build` pass

---

## 8. Lưu ý kỹ thuật

### Không đụng `src/services/axios.ts`

`/user/me/password` **không** thêm vào `NO_REFRESHTOKEN_ENDPOINTS`. Danh sách đó (`/auth/login`, `/auth/register`, `/auth/refresh-token`) dành cho endpoint không cần token. Endpoint này cần Bearer token và cần retry khi refresh token còn hiệu lực — thêm vào sẽ phá vỡ flow refresh.

### BE trả 400, không phải 422

Xem **Bug 6**. Plan này né tránh bằng cách validate đầy đủ ở FE, nên không cần sửa `auth-error-message.ts`. Không dùng `getAuthErrorMessage` cho endpoint này — hook dùng pattern `error.response?.data?.message` của `useUpdateUser`.

### Validate ở FE là bắt buộc, không phải tuỳ chọn

BE có validate, nhưng:
- BE trả 400 với message gộp nhiều field → FE không map được về từng input (Bug 6)
- Round-trip mạng lãng phí cho lỗi mà client đã biết trước

→ Validate tay ở FE theo đúng rule BE, rồi mới gọi API. Đây cũng là convention của `useResetPasswordForm` và `register-view`.

### Message string

Tiếng Anh, viết hoa chữ đầu câu. Dùng `toast` từ `sonner`, không dùng hệ thống notification in-app.

### Không có i18n ở FE

Toàn bộ repo hardcode string tiếng Anh (`"Update Successfully"`, `"Login successful"`, ...). Không cần lo translation.

### Không có test framework

`package.json` không có `test` script, không cài jest/vitest. Verify bằng `npm run lint` + `npm run build` + test tay theo Acceptance Criteria.

### Phạm vi

Plan này **chỉ sửa FE**. 10 bug BE ở mục 2 được ghi nhận để review riêng, chưa động vào. Nếu duyệt sửa Bug 1 hoặc Bug 2 thì cần xác nhận FE có cần đổi theo (với Bug 1 thì **không** — xem mục 5).
