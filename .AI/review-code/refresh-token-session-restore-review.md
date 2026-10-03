# Review: Refresh token khi access token hết hạn (FE + BE)

> Scope FE commit `f1df8f8` ("fix: refreshtoken when expired accesstoken"):
> `src/App.tsx`, `src/features/auth/hooks/useSessionRestore.tsx` (mới),
> `src/features/auth/storage/auth-storage.ts`, `src/features/realtime/*`,
> `src/features/users/hooks/useCurrentUser.ts`, `src/router/*`, `src/services/axios.ts`
>
> Scope BE commit `235485a` (cùng tên):
> `src/app.ts`, `src/common/middlewares/auth.middleware.ts`,
> `src/common/middlewares/error-handler.middleware.ts` (mới), `src/modules/auth/auth.controller.ts`
>
> Ngày review: 2026-09-18

## Tóm tắt

Fix nhằm 2 mục tiêu:

1. **FE**: khi mở app với access token đã hết hạn, thay vì tự clear token và đá về
   login ngay, sẽ gọi `/auth/refresh-token` một lần lúc mount
   (`SessionRestoreProvider` + `refreshAccessToken()` single-flight trong axios
   interceptor). Đồng thời bỏ hành vi "auto-clear token hết hạn" ở
   `getValidToken()` để interceptor/restore có token đem đi refresh.
2. **BE**: chuyển `throw` → `next(error)` trong auth middleware và thêm
   `errorHandler` cuối `app` để mọi `Exception` trả về JSON đúng status (trước đây
   rơi vào default error handler HTML của Express). Cookie auth được bọc lại chung
   options (`httpOnly`, `secure` khi production, `sameSite: lax`, `path: "/"`).

Luồng chính (expired access token khi app mở): provider mount → thấy token expired →
`refreshAccessToken()` → BE `verifyRefreshToken` (dựa refresh cookie httpOnly) → trả
access token mới → `setToken` → route guard qua được, các query/websocket dùng token
mới. Luồng mid-session: request bị 401 → interceptor refresh 1 lần (single-flight) →
retry. Nhìn tổng thể **fix đúng hướng và chạy được ở kịch bản chính**. Tuy nhiên còn
các lỗ hổng quan trọng dưới đây.

## Findings — FE

### 1. 🟡 Trung bình — Refresh thất bại tạm thời (network/5xx) sẽ clear token ngay, đá user ra login

`src/services/axios.ts:29-31` (bên trong `refreshAccessToken`):

```ts
.catch(() => {
  authStorage.clearToken();   // ← clear mọi trường hợp fail
  return null;
})
```

`catch` này bắt **tất cả** lỗi, kể cả network error / timeout (10s) / 5xx từ phía BE
— không phân biệt "refresh token hết hạn thật sự" (401/403) với "hạ tầng đang lỗi".
Hệ quả: BE down 30 giây lúc user đang mở app → `clearToken()` → mọi guard thấy mất
token → bị đá ra login kèm mất luôn session local dù refresh cookie vẫn còn hạn.

**Đây là regression so với trước**: interceptor cũ (xem `f1df8f8^`) khi refresh fail
chỉ `Promise.reject(refreshError)`, **không** clear token — user vẫn ở trạng thái đã
đăng nhập và lần 401 sau có cơ hội refresh lại thành công.

Đề xuất: chỉ `clearToken()` khi lỗi là 401/403 từ `/auth/refresh-token`; với network
error / timeout / 5xx thì trả `null` (hoặc reject) mà không xoá token.

### 2. 🟡 Trung bình — Session-restore chỉ chạy lúc mount; access token hết hạn *giữa phiên* + điều hướng → vẫn bị đá về login

`useSessionRestore.tsx:64-88` chỉ chạy 1 lần (`useEffect` deps `[]`). Các guard
`route-guards.tsx` đọc `authStorage.getTokenPayload()` (trả `null` khi hết hạn,
`auth-storage.ts:63-71`) và đá về login (`route-guards.tsx:65-69`) **mà không hề kích
hoạt refresh**. Interceptor chỉ refresh khi *có request API nào đó* bị 401.

Kịch bản thực tế: user mở app, ngồi im > 30 phút (access token hết hạn, chưa có API
call nào chạy), sau đó click một route/link/Back → guard render với token expired →
`<Navigate to={LOGIN}>` ngay, dù refresh cookie còn sống. Đúng kịch bản mà commit này
định sửa, nhưng giờ chỉ phủ được lúc mount, không phủ được mid-session.

Đáng chú ý: provider **đã có sẵn** `restoreSession()` (chính là API để xử lý case
này) nhưng hiện **không được gọi ở đâu** (xem finding #4). Đề xuất: trong
`ProtectedRoute`/`AuthRedirectRoute`/`RootRedirectRoute`, khi `!hasUsableToken()` mà
vẫn còn token (expired), `await restoreSession()` trước khi quyết định redirect.

### 3. 🟡 Trung bình (chỉ khi mở nhiều tab) — Refresh token rotation + single-flight trong từng tab → tab thứ 2 bị logout

- FE single-flight (`refreshTokenPromise`) chỉ dùng chung trong **1 tab**.
- BE rotate refresh token trên mỗi lần refresh (`auth.service.ts:244-253` + `verifyRefreshToken` so khớp `savedToken.refreshToken !== refreshToken`, `auth.middleware.ts:113-120`).

Hai tab cùng trình duyệt gần như hết hạn cùng lúc → cả 2 refresh đồng thời: tab 1 đổi
token trong DB, tab 2 gửi refresh token cũ → `savedToken.refreshToken !== refreshToken`
→ 401 → tab 2 bị `clearToken()` + logout (dù session thật ra vẫn hợp lệ).

Nếu sản phẩm được dùng multi-tab phổ biến, nên cân nhắc: lock cross-tab khi refresh
(ví dụ qua `localStorage` key + `storage` event — đã có sẵn cơ chế
`AUTH_TOKEN_CHANGED_EVENT`), hoặc BE cho phép overlap (giữ N refresh token gần nhất).

### 4. 🟢 Thấp — Dead code mới sinh ra

- `restoreSession`, `isSessionRestored`, `isSessionExpired` trong `useSessionRestore`
  **không được dùng ở bất kỳ đâu** (grep toàn repo). Đây chính là API lẽ ra phải được
  dùng trong finding #2 — nếu chưa dùng thì bỏ hoặc dùng ngay.
- `authApi.refreshToken` (`auth-api.ts:36-41`) giờ là dead code vì mọi nơi dùng
  `refreshAccessToken` từ `axios.ts`.
- `getValidToken()` / `hasValidToken()` (`auth-storage.ts:55-62, 72-74`) không còn
  call site bên ngoài, do hành vi "auto-clear khi hết hạn" đã bị gỡ.

### 5. 🟢 Thấp — Socket vẫn thử connect bằng token hết hạn; realtime có thể lag tới 30s

`socket.ts:18-20, 48-51` và `useTaskSocket.ts:280-298` giờ dùng `getToken()` (kể cả
khi expired) thay cho `getValidToken()`:
- Khi app mở với token đã hết hạn, socket connect ngay với token cũ → BE
  `socket-auth.middleware` reject (handshake middleware error). Socket.IO client
  **không tự reconnect** sau dạng connect_error này; chỉ hồi phục khi
  `AUTH_TOKEN_CHANGED_EVENT` (sau khi refresh thành công) hoặc tick 30s
  (`useTaskSocket.ts:301`) → trong vài edge realtime chậm tới 30s.
- Nếu token expired mà không có API nào đánh thức refresh (idle), mỗi 30s lại thử
  connect với token cũ (vô hại, chỉ lãng phí).

Không phải bug, hậu quả nhỏ; chỉ cần biết để đánh giá trong các trường hợp "moi" khi
fix #2 (guard gọi `restoreSession` sẽ giúp socket ngậm lại sớm hơn).

## Findings — BE

### 6. 🟡 Trung bình (phụ thuộc topology triển khai) — Cookie `sameSite: "lax"` + `secure` có thể làm hỏng toàn bộ auth khi FE/BE khác origin

`auth.controller.ts:17-26`:

```ts
secure: isProduction,        // chỉ khi NODE_ENV === "production"
sameSite: "lax",
path: "/",
```

- Dev (localhost:5173 ↔ localhost:3000) là **same-site** → cookie gửi bình thường, OK.
- Nếu production mà FE và BE nằm ở **khác domain/scheme** (ví dụ FE trên domain A,
  API `VITE_API_URL` domain B): cookie `SameSite=Lax` **không được gửi** trên request
  XHR/fetch cross-site dù FE có `withCredentials: true` → login/refresh đều chết âm thầm.
- Ngược lại nếu nghĩa là protection (chống CSRF cross-site) thì `Lax` đã đủ chặn POST
  cross-site, nên cũng không phải là lỗi an toàn — chỉ là **cần xác nhận topology**:
  nếu cross-site thì phải `sameSite: "none"` + `secure: true` (và đảm bảo luôn HTTPS).

Vì commit này chính là fix refresh, nếu production là cross-site thì fix sẽ không có
tác dụng — nên verify sớm nhất có thể.

### 7. 🟢 Thấp — `errorHandler` trả thẳng internal message khi lỗi không phải `Exception`

`error-handler.middleware.ts:19-23`:

```ts
console.error("[errorHandler] Unhandled error:", err);
res.status(500).json({
  success: false,
  message: err instanceof Error ? err.message : "Internal server error",
});
```

Khi gặp lỗi DB/Prisma/lỗi ngoài `Exception`, `err.message` (có thể chứa SQL, stack
detail, path nội bộ…) sẽ lọt ra client. Bình thường không kích hoạt (các endpoint đã
bọc `Exception`), nhưng nên chỉ log đầy đủ ở server và trả message generic
(`"Internal server error"`) để tránh lộ thông tin nội bộ.

## Đã verify — không phải issue

- **Single-flight + chống loop trên interceptor ok**: `_retry` chặn retry vô hạn;
  `NO_REFRESHTOKEN_ENDPOINTS` vẫn che `/auth/refresh-token`; guard `existingToken == null`
  reject sớm (`axios.ts:67-70`). Hai nguồn refresh (provider lúc mount + interceptor khi
  401) dùng chung `refreshTokenPromise` nên không gọi refresh song song trong 1 tab.
- **StrictMode dev không gây 2 request refresh**: `refreshTokenPromise` được gán đồng bộ
  khi `refreshAccessToken()` chạy, nên effect cleanup→setup lại của StrictMode tái sử
  dụng cùng promise.
- **BE `throw` → `next(error)` hợp lý**: Express 5 đã tự forward async-throw, nhưng nhờ
  `errorHandler` mới các lỗi JWT/permission giờ trả JSON đúng status thay vì HTML default
  → thay đổi hữu ích. `errorHandler` đặt sau tất cả routers là đúng chuẩn.
- **`logout` dùng `clearCookie(..., { path: "/" })`** khớp với path "/" của cookie mới —
  sửa đúng chỗ cũ thiếu path.
- **BE refresh trả 401 (không phải 200-with-error)** khi refresh token sai → FE bắt được
  đúng `status === 401`.
- **Typecheck**: `tsc --noEmit` FE sạch. **Lint**: repo đang fail từ trước commit này
  (nhiều `react-hooks/set-state-in-effect` ở các file cũ như `view-main.tsx`,
  `detail-project.tsx`…), nhưng commit này **thêm lỗi mới**: `set-state-in-effect`
  (`useSessionRestore.tsx:78`), `exhaustive-deps` (thiếu `doRestore`,
  `useSessionRestore.tsx:102`), `react-refresh/only-export-components` (`useSessionRestore.tsx`,
  `router/index.tsx`).

## Kết luận

Fix chạy đúng ở kịch bản chính "mở app khi access token đã hết hạn". Không có bug khối
logic nghiêm trọng nào làm hỏng luồng, nhưng còn 2 lỗi đáng sửa trước:

1. **FE #1** — chỉ clear token khi refresh trả về lỗi định nghĩa (401/403), đừng clear
   với network/5xx (regression so với trước).
2. **FE #2** — dùng ngay `restoreSession()` có sẵn trong các guard khi token expired
   để phủ kịch bản hết hạn **giữa phiên** (hiện tại giữa phiên vẫn bị đá về login).
3. **BE #6** — xác nhận topology production; nếu FE/BE khác origin thì cookie `Lax`
   sẽ làm chết cả login lẫn refresh.

Các mục #3 (multi-tab), #4/#5 (dead code + socket) làm sau với mức độ ưu tiên thấp.