# FE Auto Refresh Token Plan

## 1. Mục tiêu

Cho FE tự động gọi `POST /auth/refresh-token` khi `accessToken` hết hạn, để user không bị đá về `/login` ngay lập tức trong lúc `refreshToken` cookie vẫn còn hiệu lực.

Kết quả mong muốn:

- request protected bình thường sẽ tự đính `Authorization`
- khi `accessToken` hết hạn và API trả `401`, FE tự gọi `refresh-token`
- refresh thành công thì cập nhật `accessToken` mới và retry lại request cũ
- refresh thất bại thì mới clear auth state và điều hướng về `/login`

## 2. Những gì đã xác nhận từ code hiện tại

### 2.1 Backend auth

BE đang có endpoint:

- `POST /auth/refresh-token`

Luồng BE hiện tại:

- `login` set cả `accessToken` và `refreshToken` bằng cookie `httpOnly`
- `refresh-token` dùng `authMiddleware.verifyRefreshToken`
- middleware đọc `refreshToken` từ `req.headers.cookie`
- middleware cũng đọc `accessToken` từ cookie nếu có
- nếu `accessToken` chưa hết hạn thì BE trả lỗi `409`
- nếu `refreshToken` hợp lệ và `accessToken` đã hết hạn thì BE cấp cặp token mới

Điểm quan trọng:

- FE không thể tự đọc `refreshToken` vì token này nằm trong cookie `httpOnly`
- FE muốn gọi refresh thành công thì request phải gửi cookie sang BE
- nghĩa là FE cần bật `withCredentials: true`

### 2.2 Frontend auth hiện tại

FE hiện đang:

- lưu `accessToken` vào `localStorage`
- lấy token qua `authStorage.getValidToken()`
- gắn `Authorization: Bearer <token>` trong `axios` request interceptor
- nếu response `401` thì clear token và redirect thẳng về `/login`

Hệ quả:

- hiện chưa có cơ chế refresh tự động
- `getValidToken()` tự xóa token hết hạn trước khi request chạy, nên interceptor request có thể không gửi `Authorization`
- nhưng BE vẫn có thể đọc `accessToken` từ cookie nếu cookie còn được gửi kèm

## 3. Ràng buộc kỹ thuật cần bám

### 3.1 Phải gửi cookie trên mọi request auth liên quan

Trong `FE/src/services/axios.ts` cần bật:

- `withCredentials: true` ở axios instance

Nếu không có dòng này:

- login có thể không lưu cookie đúng cho browser context
- refresh-token sẽ không mang theo `refreshToken` cookie
- logout cũng có thể không clear cookie đúng như kỳ vọng

### 3.2 Không refresh cho mọi lỗi 401 một cách mù quáng

Cần loại trừ ít nhất:

- `/auth/login`
- `/auth/register`
- `/auth/refresh-token`

Nếu không sẽ dễ bị vòng lặp vô hạn:

- request lỗi 401
- interceptor gọi refresh
- refresh cũng 401
- interceptor lại gọi refresh tiếp

### 3.3 Cần chặn nhiều request cùng refresh một lúc

Khi nhiều API cùng fail `401` trong cùng thời điểm, nếu mỗi request tự gọi refresh thì sẽ dễ gây:

- nhiều lần gọi `refresh-token`
- token mới token cũ chồng chéo
- request retry sai thứ tự

Vì vậy nên có một `refreshPromise` dùng chung ở cấp module.

## 4. Thiết kế giải pháp FE

### 4.1 Bổ sung API refresh token

Trong `FE/src/features/auth/api/auth-api.ts` thêm method:

- `refreshToken(): Promise<LoginResponse>`

Method này gọi:

- `POST /auth/refresh-token`

Lưu ý:

- không cần body
- phải dùng axios instance có `withCredentials`
- response hiện tại từ BE vẫn trả về `accessToken` và `refreshToken`

Trên FE phase này chỉ cần dùng chắc `accessToken` trả về để cập nhật local storage.

### 4.2 Điều chỉnh axios instance

Trong `FE/src/services/axios.ts`:

1. Bật `withCredentials: true`
2. Giữ request interceptor để đính `Authorization` khi có `accessToken` hợp lệ
3. Thay response interceptor hiện tại bằng flow:

- nếu không phải `401` thì reject như cũ
- nếu là endpoint không được refresh thì reject như cũ
- nếu request đã retry rồi thì reject như cũ
- nếu đủ điều kiện thì gọi `refreshToken`
- refresh thành công:
  cập nhật `authStorage.setToken(newAccessToken)`
- sau đó gắn lại `Authorization` cho request cũ
- retry request cũ đúng 1 lần
- nếu refresh fail:
  clear token
  redirect `/login`

### 4.3 Dùng cờ chống retry lặp

Nên mở rộng `AxiosRequestConfig` bằng custom flag, ví dụ:

- `_retry?: boolean`
- `_skipAuthRefresh?: boolean`

Ý nghĩa:

- `_retry` để biết request này đã được retry chưa
- `_skipAuthRefresh` để đánh dấu request refresh-token không đi qua logic refresh lần nữa

### 4.4 Đồng bộ refresh promise

Ở `axios.ts` nên có biến module-level:

- `let refreshPromise: Promise<string | null> | null = null`

Flow:

- request đầu tiên gặp `401` sẽ tạo `refreshPromise`
- các request `401` đến sau sẽ `await` cùng promise đó
- khi promise xong thì set lại `null`

Lợi ích:

- tránh spam endpoint refresh
- giảm race condition
- dễ kiểm soát retry đồng loạt

## 5. Các file cần chỉnh

- `FE/src/services/axios.ts`
- `FE/src/features/auth/api/auth-api.ts`
- `FE/src/features/auth/storage/auth-storage.ts`
- `FE/src/features/auth/types/index.ts`
- `FE/src/features/auth/hooks/useLogout.ts`

## 6. Điều chỉnh chi tiết theo file

### 6.1 `FE/src/features/auth/types/index.ts`

Hiện `LoginResponse` đang có:

- `accessToken`
- `refreshToken`

Có thể giữ nguyên để khớp BE hiện tại.

Nhưng ở FE cần thống nhất quan điểm:

- `refreshToken` không dùng để lưu/read ở client
- chỉ tồn tại trong response type vì BE đang trả field này

### 6.2 `FE/src/features/auth/storage/auth-storage.ts`

Giữ storage chỉ quản lý:

- `accessToken`

Không nên lưu `refreshToken` ở localStorage.

Nếu muốn rõ nghĩa hơn có thể bổ sung helper:

- `clearAuth()`

để các nơi như interceptor và logout dùng chung.

### 6.3 `FE/src/features/auth/api/auth-api.ts`

Thêm:

- `refreshToken`

và giữ:

- `login`
- `register`
- `logout`

Nên bảo đảm request refresh có cờ bỏ qua interceptor refresh lồng nhau nếu cần.

### 6.4 `FE/src/services/axios.ts`

Đây là nơi xử lý chính.

Plan triển khai:

1. thêm `withCredentials: true`
2. định nghĩa danh sách auth endpoint cần bỏ qua refresh
3. viết hàm nội bộ `performTokenRefresh`
4. nếu refresh thành công thì set token mới
5. retry request cũ một lần
6. nếu refresh fail thì clear token và redirect login

### 6.5 `FE/src/features/auth/hooks/useLogout.ts`

Hiện hook đang xóa cả `refreshToken` trong `localStorage`, nhưng FE thực tế không cần lưu refresh token ở đây.

Cần chỉnh cho đồng nhất:

- chỉ clear `accessToken` local storage
- để BE clear cookie bằng API `/auth/logout`
- nếu logout fail vẫn nên clear local state ở `onSettled` như hiện tại là hợp lý

## 7. Flow mong muốn sau khi làm xong

### 7.1 Login

1. User login
2. BE trả response có `accessToken`
3. BE set cookie `accessToken` + `refreshToken`
4. FE lưu `accessToken` vào localStorage

### 7.2 Gọi API khi access token còn hạn

1. Request interceptor đọc token từ storage
2. Gắn `Authorization`
3. API chạy bình thường

### 7.3 Gọi API khi access token đã hết hạn

1. FE request API protected
2. token cũ có thể không còn trong header do `getValidToken()` đã loại bỏ
3. nhưng cookie vẫn được gửi cùng request nếu `withCredentials` bật
4. BE trả `401`
5. response interceptor gọi `POST /auth/refresh-token`
6. BE đọc `refreshToken` cookie, xác thực, cấp token mới
7. FE lưu `accessToken` mới
8. FE retry lại request ban đầu
9. user không bị đá ra login

### 7.4 Khi refresh token cũng hết hạn hoặc invalid

1. refresh request fail `401`
2. FE clear auth state
3. redirect `/login`

## 8. Rủi ro và lưu ý

### 8.1 Phụ thuộc CORS/cookie config của BE

Nếu FE và BE khác origin, BE cần cho phép:

- `credentials: true`
- cookie policy phù hợp như `sameSite`, `secure`

Nếu BE chưa cấu hình phần này, FE có viết refresh flow vẫn không chạy được trên browser thật.

### 8.2 BE hiện check access token cookie khi refresh

Middleware refresh của BE đọc `accessToken` từ cookie, không đọc từ header.

Điều này có nghĩa:

- nếu cookie `accessToken` không được browser gửi cùng request, BE vẫn refresh được khi không có access token cookie
- nhưng nếu có access token cookie còn hạn, BE trả `409`

FE cần coi `409` từ `/auth/refresh-token` là trường hợp không nên logout ngay, mà nên xem đây là refresh không cần thiết hoặc request cũ có vấn đề đồng bộ token.

### 8.3 `getValidToken()` đang tự clear token sớm

Behavior này không sai, nhưng cần nhớ:

- request protected có thể đi lên BE mà không có header `Authorization`
- system đang dựa thêm vào cookie `accessToken` do BE set ở login/refresh

Nếu sau này muốn chuẩn hóa hơn, có thể cân nhắc:

- không xóa token ngay ở `getValidToken()`
- để BE là nơi kết luận token expired

Nhưng phase này chưa bắt buộc đổi nếu interceptor refresh đã xử lý tốt.

## 9. Thứ tự triển khai đề xuất

1. Thêm `refreshToken` API ở auth feature
2. Bật `withCredentials` cho axios instance
3. Refactor response interceptor để có refresh + retry
4. Thêm `refreshPromise` chống gọi refresh song song
5. Dọn lại `authStorage` và `useLogout` cho đồng nhất
6. Test tay các case login, expired access token, expired refresh token

## 10. Checklist verify sau khi implement

- login xong browser có nhận cookie `accessToken` và `refreshToken`
- request protected bình thường vẫn chạy
- sửa thời gian token ngắn hoặc chờ token hết hạn để kiểm tra auto refresh
- request đầu tiên sau khi hết hạn không bị đá về `/login`
- request cũ được retry thành công sau refresh
- nhiều request song song lúc token hết hạn không tạo nhiều refresh request
- khi refresh token hết hạn thì user mới bị chuyển về `/login`
