# DEBUG: Refresh Token Không Tự Động Refresh Ở UI

**Ngày:** 17/09/2026
**Tính năng:** Authentication / Token Refresh
**Severity:** High
**Trạng thái:** CHƯA FIX

---

## 1. Mô Tả Bug

UI **không tự refresh access token**. Mỗi khi access token hết hạn (BE config `EXPIRES_IN_ACCESS_TOKEN=15m`), user bị đá về trang `/login` (hoặc gặp lỗi 401) thay vì tự động lấy token mới qua `/auth/refresh-token`. Refresh token nằm trong httpOnly cookie gần như không bao giờ được dùng đến từ phía FE.

---

## 2. Root Cause Analysis

### Vấn đề cốt lõi: thiết kế refresh chỉ là "reactive" (401-triggered), trong khi guard lại chủ động xoá token hết hạn → interceptor không bao giờ có cơ hội chạy.

Toàn bộ chuỗi refresh duy nhất là **axios response interceptor** trong `FE/src/services/axios.ts:31`:

```typescript
// FE/src/services/axios.ts:31-74
axiosLocal.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status !== 401 ||      // chỉ chạy khi có request trả về 401
      !originalRequest ||
      originalRequest._retry ||
      NO_REFRESHTOKEN_ENDPOINTS.some((url) => originalRequest.url?.includes(url))
    ) { return Promise.reject(error); }
    ...
    refreshTokenPromise = axiosLocal.post("/auth/refresh-token")...
  },
);
```

Cơ chế này chỉ hoạt động nếu có một **API call trả về 401** trong khi app vẫn đang cho rằng phiên hợp lệ. Nhưng thực tế FE không bao giờ gửi được request đó khi token đã hết hạn, vì:

### Nguyên nhân 1 (CHÍNH - FE): Route guard xoá token hết hạn thay vì refresh

**File:** `FE/src/router/route-guards.tsx:6, 29, 43` (cả `ProtectedRoute`, `AuthRedirectRoute`, `RootRedirectRoute`)

```typescript
// ❌ Gọi getTokenPayload() → bên trong là getValidToken()
const tokenPayload = authStorage.getTokenPayload();
if (!tokenPayload) {
  return <Navigate to={APP_ROUTES.LOGIN} replace ... />;  // ❌ đá về login
}
```

**File:** `FE/src/features/auth/storage/auth-storage.ts:48-58`

```typescript
getValidToken() {
  const token = this.getToken();
  if (!token) return null;
  if (isExpiredJwtToken(token)) {
    this.clearToken();          // ❌ xoá token hết hạn
    return null;
  }
  return token;
}
```

**Hệ quả flow:**

```
[Token hết hạn sau 15 phút]
     │
     ▼
[User reload / vào trang guard]
     │
     ▼
[getValidToken() → exp <= now → clearToken()]  ← xoá token tại đây
     │
     ▼
[getTokenPayload() trả null]
     │
     ▼
[Navigate → /login]   ← bị đá ra login, KHÔNG refresh
```

Không có request nào được gửi đi (guard chặn trước), nên không có 401, nên interceptor không kích hoạt refresh. **Refresh token trong cookie vô tác dụng.**

### Nguyên nhân 2 (FE): `authApi.refreshToken` không bao giờ được gọi

**File:** `FE/src/features/auth/api/auth-api.ts:36`

```typescript
refreshToken: async (): Promise<LoginResponse> => { ... }  // CÓ định nghĩa
```

Nhưng search toàn bộ `FE/src` → `authApi.refreshToken` **zero lần được sử dụng**. Không có code "bootstrap/khôi phục phiên" nào gọi `/auth/refresh-token` khi app load với access token hết hạn (mà cookie refresh vẫn còn). Chỉ interceptor axios gọi nó, nhưng chỉ khi có 401.

### Nguyên nhân 3 (FE): `useCurrentUser` dùng `getValidToken()` → tự tắt query khi hết hạn

**File:** `FE/src/features/users/hooks/useCurrentUser.ts:6-11`

```typescript
const token = authStorage.getValidToken();   // ❌ null khi hết hạn
return useQuery({
  queryFn: () => userApi.getMe(),
  enabled: !!token,                          // ❌ không gọi API → không có 401 → không refresh
});
```

### Nguyên nhân 4 (FE): Realtime socket cũng dùng `getValidToken()`

**File:** `FE/src/features/realtime/socket.ts:19, 59, 70`, `FE/src/features/realtime/hooks/useTaskSocket.ts:281`

Tương tự: khi token hết hạn → `getValidToken()` null → **disconnect socket, clear cache** (`useTaskSocket.ts:286-292`) → moot, không refresh, không reconnect với token mới.

### Nguyên nhân 5 (BE): Middleware ném exception, không có error handler → 401 trả về body HTML

**File:** `Manage -Task/BE/src/common/middlewares/auth.middleware.ts:35-84`

```typescript
// verifyAccessToken: khi token hết hạn
throw new OptionalException(StatusCodes.UNAUTHORIZED, error.message);  // ném, không next(err)
```

**File:** `Manage -Task/BE/src/app.ts` — **không đăng ký error-handling middleware nào**.

Xác nhận: `express@^5.1.0` bắt được async rejection và chuyển default express error handler. Default handler trả **status 401 nhưng body HTML** chứ không phải JSON `{success:false, message:"..."}`. Status 401 đúng nên interceptor FE vẫn kích hoạt (may mắn), nhưng đây là điểm fragile cần fix.

### Nguyên nhân 6 (BE): Thiếu policy khớp token - nhưng có điểm yếu về refresh rotation

**File:** `Manage -Task/BE/src/common/middlewares/auth.middleware.ts:111-116`

```typescript
const savedToken = await this.authRepository.findTokenByUserId(payloadRefreshToken.userId);
if (!savedToken || savedToken.refreshToken !== refreshToken) {
  throw new UnauthorizedException("refresh token is invalid or expired");
}
```

DB chỉ lưu **1 refresh token/user** (upsert theo `userId`, `refresh_token` unique — `prisma/schema.prisma:185-193`). Nếu user login thiết bị 2 / logout thiết bị khác → refresh token cũ (cookie thiết bị 1) bị vô hiệu → refresh 401 → FE không có fallback ngoài reject → user mất phiên. Đây là hành vi "đúng" về bảo mật nhưng không có rotation/revocation hợp lý cho multi-device.

### Nguyên nhân 7 (BE/Deploy - tiềm ẩn): Cookie thiếu cấu hình cho production

**File:** `Manage -Task/BE/src/modules/auth/auth.controller.ts:38-47, 78-87`

```typescript
res.cookie("accessToken", ..., { httpOnly: true, maxAge: 30 * 60 * 1000 });
res.cookie("refreshToken", ..., { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, path: "/" });
```

Không set `secure: true`, `sameSite`. Trong dev localhost cùng-site thì OK, nhưng khi deploy HTTPS / cross-subdomain (FE=app.com, API=api.app.com) cookie sẽ bị browser chặn hoặc không gửi → refresh vỡ.

Quan sát thêm (đúng như thiết kế): `axios.ts:22` dùng `authStorage.getToken()` (KHÔNG phải getValidToken) → gửi cả token hết hạn → giúp BE trả 401 → interceptor chạy. Nhưng guard dùng `getValidToken()` lại mâu thuẫn ngay chỗ này: nó xoá token trước khi request được gửi.

### Data Flow hiện tại:

```
❌ TH1: Reload / navigate sau khi token hết hạn
[Route guards getValidToken()] → clearToken() → Navigate /login   (refresh không bao giờ xảy ra)

✅/⚠️ TH2: Vẫn ở trong phiên, có request trả 401
[API trả 401] → interceptor post /auth/refresh-token → setToken(mới) → retry (hoạt động tạm được)
   nhưng tick 30s của realtime (useTaskSocket.ts:300) gọi getValidToken() → null khi hết hạn →
   disconnectSocket(), removeQueries() → trạng thái phiên bị phá trước khi 401 kịp refresh
```

### Vị trí các file liên quan:

| File                                                                             | Vai trò                                            | Có bug?                                        |
| -------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| `FE/src/services/axios.ts:31-74`                                                 | Interceptor refresh duy nhất (reactive 401)        | ⚠️ Chỉ chạy khi có 401                        |
| `FE/src/router/route-guards.tsx:6,29,43`                                         | Guard route                                        | ❌ **Đá login thay vì refresh**                |
| `FE/src/features/auth/storage/auth-storage.ts:48-58`                             | getValidToken() → clearToken() khi hết hạn         | ❌ **Nguyên nhân chính**                      |
| `FE/src/features/auth/api/auth-api.ts:36`                                        | authApi.refreshToken (định nghĩa)                  | ❌ Không bao giờ được gọi (session restore)   |
| `FE/src/features/users/hooks/useCurrentUser.ts:6-11`                             | enabled: !!token                                   | ❌ Tắt query khi hết hạn                      |
| `FE/src/features/realtime/socket.ts` + `useTaskSocket.ts:280-296`               | Socket auth                                        | ❌ Disconnect khi hết hạn                     |
| `BE/src/common/middlewares/auth.middleware.ts:35-84`                             | verifyAccessToken throw exception                  | ⚠️ Không next(err); 401 body HTML             |
| `BE/src/app.ts`                                                                  | Không có error handler                             | ❌ 401 trả body HTML                          |
| `BE/src/common/middlewares/auth.middleware.ts:111-116`                           | So sánh savedToken.refreshToken với cookie          | ⚠️ Multi-device bug khi login nơi khác        |
| `BE/src/modules/auth/auth.controller.ts:38-47,78-87`                             | Set cookie (thiếu secure/sameSite)                 | ⚠️ Production sẽ vỡ                          |
| `BE/src/configs/jwt.config.ts:14-33` + `.env` (`EXPIRES_IN_ACCESS_TOKEN=15m`)    | Thời gian sống token                               | ℹ️ 15m rất ngắn, tăng tần suất bug lên        |

---

## 3. Giải Pháp Đề Xuất

### Fix chính (FE): Thêm "session restore" call `/auth/refresh-token` khi khởi tạo app

- Trước khi route guard quyết định, chạy 1 lần bootstrap:
  1. Nếu có refresh cookie (không xác định trực tiếp từ JS - là chỉ định của BE), thử gọi `/auth/refresh-token`.
  2. Nếu thành công → `setToken(accessToken mới)` → tiếp tục navigation.
  3. Nếu thất bại → mới cho vào `/login`.
- `authApi.refreshToken` đã có sẵn, chỉ cần dùng.

### Fix chính (FE): Đổi guard dùng `getToken()` thay vì `getValidToken()`

Không `clearToken()` tự động trong `getValidToken()` khi reload/guard. Để request tới BE trả 401 rồi để interceptor refresh, kèm **Promise chờ refresh** ở guard (thêm state `checkingSession`).

Options:
1. **Option A (Khuyến nghị):** Thêm provider `AuthProvider`/`useAuth` với Initializer: gọi `authApi.refreshToken()` 1 lần khi mount (nếu `getToken()` có tồn tại nhưng hết hạn), rồi mới render route.
2. **Option B:** Trong `getValidToken()`, khi token hết hạn → return token cũ (chưa clear), để axios gửi → BE trả 401 → interceptor refresh. Guard chỉ dựa vào `getToken() != null`.
3. **Option C (an toàn):** Réponse `404`/`401` khi refresh thất bại → redirect `/login` + clear.

### Fix FE (useCurrentUser):

```typescript
enabled: !!authStorage.getToken(),   // luôn gọi, để 401 chạy interceptor
```

### Fix BE (error handler):

Thêm middleware error-handler trong `app.ts` để trả JSON như `HttpResponseDto.exception` khi `Exception` bị throw từ middleware (thay vì HTML default). Hoặc sửa `verifyAccessToken` dùng `next(err)`.

### Fix BE (cookie production):

```typescript
res.cookie("refreshToken", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",   // hoặc 'none' nếu FE khác site
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

### Fix BE (multi-device):

Cân nhắc cho phép nhiều refresh token/user (thay vì unique theo userId) hoặc có logout/rotation policy rõ ràng khi login ở thiết bị khác.

---

## 4. Files Cần Sửa

| File                                                          | Thay đổi                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `FE/src/services/axios.ts`                                    | Giữ interceptor; có thể thêm dòng await session-restore ở đầu       |
| `FE/src/router/route-guards.tsx`                              | Guard chờ bootstrap refresh (loading state) thay vì clear + redirect |
| `FE/src/features/auth/storage/auth-storage.ts`                | `getValidToken()` không clear ngay lập tức / tách `isExpired`       |
| `FE/src/features/auth/api/auth-api.ts` + hook bootstrap mới   | Gọi `authApi.refreshToken()` khi app mount                          |
| `FE/src/features/users/hooks/useCurrentUser.ts:11`            | `enabled` dùng `getToken()` thay `getValidToken()`                  |
| `FE/src/features/realtime/socket.ts` + `useTaskSocket.ts`     | Tương tự - không disconnect khi chỉ hết hạn access token            |
| `BE/src/app.ts`                                               | Add error-handler middleware (trả JSON)                             |
| `BE/src/common/middlewares/auth.middleware.ts`                | `verifyAccessToken`/`verifyRefreshToken` dùng `next(err)` nếu muốn  |
| `BE/src/modules/auth/auth.controller.ts:38-47,78-87`          | Cookie: `secure`, `sameSite`, `path` đầy đủ                         |

---

## 5. Test Plan

1. **Test Case 1:** Reload trang khi access token đã hết hạn (15m) nhưng refresh cookie còn
   - Expected: UI mở `/projects`, gọi refresh, không quay về login ✅
2. **Test Case 2:** Ngồi 15m+ trong cùng phiên, thao tác sau khi hết hạn
   - Expected: request trả 401 → refresh → retry thành công, không bị logout ✅
3. **Test Case 3:** Reload trang khi refresh cookie cũng hết hạn (7 ngày)
   - Expected: chuyển về /login, hiển thị lỗi đăng nhập lại ✅
4. **Test Case 4:** Login thiết bị 2, quay lại thiết bị 1 sau 15m
   - Expected: (tuỳ policy) thiết bị 1 refresh thất bại → vào /login, không crash ✅
5. **Test Case 5:** Vừa login xong reload liền (token còn hạn)
   - Expected: không refresh thừa, vào thẳng /projects ✅
6. **Test Case 6:** Realtime socket vẫn kết nối sau khi token được refresh
   - Expected: socket auth refresh, không disconnect, ko mất data ✅

---

## 6. Checklist

- [ ] FE: Thêm bootstrap gọi `/auth/refresh-token` khi app mount
- [ ] FE: Sửa guard để chờ/đi qua refresh thay vì clear token + redirect login
- [ ] FE: `getValidToken()` không phá token; tách riêng `isExpired()` kiểm tra thuần
- [ ] FE: `useCurrentUser` dùng `getToken()` để luôn trigger 401
- [ ] FE: Realtime không disconnect khi chỉ access token hết hạn
- [ ] BE: Error handler trả JSON `{success:false,message}` cho 401
- [ ] BE: Cookie set `secure`/`sameSite` đúng môi trường
- [ ] Test: 6 test case ở mục 5 đều pass