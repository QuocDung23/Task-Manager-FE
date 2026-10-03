# Bug: Upload avatar từ FE trả về 400

> Trạng thái: **Đã xác định nguyên nhân + FIX ÁP DỤNG**
> Ngày: 2026-09-16
> Reporter: keke (qua chat)

---

## Mô tả triệu chứng

Khi người dùng chọn một file ảnh hợp lệ (JPEG/PNG/GIF/WebP, < 5 MB) từ component `profile-header.tsx`, request `PATCH /user/me/avatar` trả về:

```
HTTP 400 — "Avatar file is required"
```

BE log (post-fix middleware) cho thấy `req.file` bị `undefined` khi tới controller.

---

## Điều kiện tái hiện

1. User mở trang profile, click vào avatar để upload file mới.
2. File đi qua FE validation (`profile-header.tsx:48-63`):
   - `file.type` thuộc `[jpeg, png, gif, webp]` → pass.
   - `file.size < 5MB` → pass.
3. `useUpdateMyAvatar` → `userApi.updateMyAvatar(file)` → `axiosLocal.patch("/user/me/avatar", formData)`.
4. BE trả 400.

Console Network tab cho thấy request có header:

```
Content-Type: application/json     ← SAI
Authorization: Bearer <token>
```

Thay vì:

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

---

## Điều tra đã thực hiện

### 1. Xác nhận payload FE gửi đi (`FE/src/features/users/api/user-api.ts:31-35`)

```ts
updateMyAvatar: async (file: File): Promise<ApiResponse<{ avatar: string }>> => {
  const formData = new FormData()
  formData.append("avatar", file)
  const response = await axiosLocal.patch<ApiResponse<{ avatar: string }>>('/user/me/avatar', formData)
  return response.data;
}
```

- ✅ Dùng `FormData`.
- ✅ Append đúng field name `avatar`.
- ❌ Không set `Content-Type` thủ công (đáng lẽ không cần — axios tự làm khi body là FormData).

### 2. Kiểm tra `axiosLocal` instance (`FE/src/services/axios.ts:7-14`)

```ts
export const axiosLocal = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",   // ← ROOT CAUSE
  },
  withCredentials: true,
});
```

**Phát hiện:** `Content-Type: application/json` được set làm **default header** cho mọi request.

### 3. Cơ chế axios xử lý `Content-Type`

Axios phân biệt hai trường hợp khi gặp body là `FormData` / `Blob` / `Stream`:

| Default headers có `Content-Type`? | Hành vi |
|---|---|
| Không | Axios tự generate `multipart/form-data; boundary=...` |
| **Có** | Axios **giữ nguyên** giá trị đã set, KHÔNG override |

Vì `axiosLocal` đã hard-code `Content-Type: application/json` ngay từ khâu khởi tạo, khi `userApi.updateMyAvatar` gửi `FormData` axios **không tự động** chuyển sang multipart → request đi với `Content-Type: application/json`.

---

## Nguyên nhân gốc

**`FE/src/services/axios.ts:10` — default header `Content-Type: application/json` ép buộc mọi request phải mang header này**, kể cả khi body là `FormData`.

Hệ quả theo chuỗi:

1. Request gửi đi với `Content-Type: application/json` + body là multipart binary.
2. BE `multerMiddleware.single("avatar")` thấy `Content-Type` không phải `multipart/form-data` → **không parse** → không ném lỗi, chỉ để `req.file = undefined`.
3. BE `validateRequestMiddleware(updateAvatarRequestValidationSchema)` (sau hotfix lần trước) skip validate vì `requestValue` undefined → gọi `next()`.
4. BE `userController.updateAvatar` check `!req.file` → throw `Exception(400, "Avatar file is required")`.

---

## Phạm vi ảnh hưởng

- **Trực tiếp:** `PATCH /user/me/avatar` — luôn 400.
- **Có thể ảnh hưởng:** bất kỳ endpoint nào khác trong tương lai nhận `multipart/form-data` (vd upload image cho task/comment). Hiện tại `uploadImage` chỉ được BE có, chưa thấy FE gọi.
- **Không ảnh hưởng:** các endpoint JSON (auth, user, project, task, ...) — default header đúng.

---

## Fix đã áp dụng (Cách 1 — khuyến nghị)

**File:** `FE/src/services/axios.ts:7-13`

```diff
export const axiosLocal = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
- headers: {
-   "Content-Type": "application/json",
- },
+ // Content-Type is intentionally omitted here so axios can auto-select:
+ //   - multipart/form-data   when body is FormData / Blob / Stream
+ //   - application/json     when body is a plain object
  withCredentials: true,
});
```

**Ngày áp dụng:** 2026-09-16

Hệ quả:
- `PATCH /user/me/avatar` → axios tự set `Content-Type: multipart/form-data; boundary=...` khi body là `FormData`.
- Tất cả endpoint JSON khác → axios tự set `Content-Type: application/json` khi body là plain object.
- Không cần thay đổi ở bất kỳ file nào khác.

## Đề xuất fix (BE đã sẵn sàng, FE cần sửa)

### Cách 1 (khuyến nghị): bỏ default `Content-Type` ở axios instance

File: `FE/src/services/axios.ts`

```ts
export const axiosLocal = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  // Không đặt Content-Type mặc định — axios tự chọn theo body:
  //  - FormData / Blob / Stream -> multipart/form-data; boundary=...
  //  - object                -> application/json
  withCredentials: true,
});
```

Tại sao cách này tốt nhất:
- Một dòng thay đổi, không phụ thuộc vào convention đặt tên biến.
- Áp dụng đúng hành vi mặc định của axios (smart content-type detection).
- Không tạo pattern "phải nhớ set header" cho dev sau.

### Cách 2: set header thủ công trong `userApi.updateMyAvatar`

```ts
const response = await axiosLocal.patch<ApiResponse<{ avatar: string }>>(
  '/user/me/avatar',
  formData,
  { headers: { 'Content-Type': 'multipart/form-data' } }  // axios vẫn tự thêm boundary
);
```

- Nhược điểm: dev sau phải nhớ làm điều này cho mọi endpoint upload. Dễ quên.

### Cách 3: dùng axios instance riêng cho multipart

Tạo `axiosMultipart` riêng. Phức tạp hơn không cần thiết.

---

## Bằng chứng bổ sung (sẽ cần test lại sau khi fix)

Sau khi sửa, mở DevTools → Network → quan sát request `PATCH /user/me/avatar`:

| Trước fix | Sau fix |
|---|---|
| `Content-Type: application/json` | `Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXXXX` |
| Request body hiển thị dạng raw text hoặc rỗng | Request body hiển thị `multipart/form-data` với part `avatar` chứa binary |

Response kỳ vọng sau fix: `200 OK` với `{ success: true, data: { avatar: "<cloudinary-url>" } }`.

---

## File tham chiếu

- **FE root cause:** `FE/src/services/axios.ts:10`
- **FE caller (đúng):** `FE/src/features/users/api/user-api.ts:31-36`
- **FE hook:** `FE/src/features/users/hooks/useUpdateMyAvatart.ts`
- **FE UI:** `FE/src/components/users/profile-header.tsx:40-75`
- **BE chain:** `src/common/middlewares/upload.middleware.ts` → `src/common/middlewares/validationRequest.middleware.ts` (đã fix skip-undefined) → `src/modules/user/user.controller.ts:73-79`
