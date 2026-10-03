# Plan: Chia rõ phần Error trong FE - người dùng biết mình lỗi gì

> Ngày: 2026-09-10
>
> Plan này được tạo sau khi phân tích tại `FE/.AI/debug/error-handling-khong-ro.md`.
> **Chưa code gì cho tới khi user duyệt.**

## 1. Mục tiêu
1. Mọi lỗi (đọc/ghi API, mạng, timeout, runtime) đều được hiển thị rõ ràng cho user: **đang lỗi gì**, tại sao, làm gì tiếp theo (retry/đăng nhập lại).
2. Gỡ duplicate code xử lý lỗi (helper bị copy 7 chỗ), thống nhất 1 nguồn duy nhất.
3. Thống nhất ngôn ngữ message lỗi (hiện đang trộn EN/VN, có cả "Dang nhap that bai" không dấu).
4. Không màn hình trắng khi lỗi runtime (thêm ErrorBoundary).

## 2. Hiện trạng (tóm tắt)
- `main.tsx:7` tạo `QueryClient` trần → không có lớp xử lý lỗi toàn cục.
- ~20 hook query không có bất kỳ cách surface lỗi nào.
- `getApiErrorMessage` dupe ở 7 file; `ApiError` type quá mỏng; 1 nơi tự khai báo type local (`useLogin.ts:9`).
- 4 chỗ UI lỗi query là text cứng tiếng Anh, không hiển thị lý do thật, không UI chung.
- Không có ErrorBoundary. `axios.ts:32` thiếu `return`.

## 3. Kiến trúc mới

```text
┌─ Request layer ──────────────────────────────────────────────┐
│ services/axios.ts   ← fix return;     axiosLocal            │
│ lib/api-error.ts    ← type ApiError đầy đủ (code/timer/... ) │
│ lib/error-message.ts← getApiErrorMessage + getHttpStatusMessage│
└──────────────────────────────────────────────────────────────┘
┌─ Query layer ────────────────────────────────────────────────┐
│ lib/query-client.ts  ← factory: QueryCache.onError +         │
│                         MutationCache.onError + defaultOptions│
│ main.tsx             ← const qc = createQueryClient()        │
└──────────────────────────────────────────────────────────────┘
┌─ UI layer ───────────────────────────────────────────────────┐
│ components/ui/error-boundary.tsx ← bắt crash render, ko trắng màn│
│ components/ui/error-state.tsx    ← ErrorState + nút Retry    │
└──────────────────────────────────────────────────────────────┘
```

### 3.1 `src/lib/api-error.ts` (nâng cấp type)

```ts
export type ApiError<T = unknown> = {
  message?: string;
  code?: string;            // ERR_NETWORK, ECONNABORTED, ...
  timeout?: boolean;
  response?: {
    status?: number;        // 400,401,403,404,409,422,500
    data?: {
      message?: string;
      error?: string;
      errors?: Record<string, string[]>;
      statusCode?: number;
    };
  };
};
```

### 3.2 `src/lib/error-message.ts` (mới) - helper tập trung

```ts
export function getApiErrorMessage(error: ApiError | unknown, fallback: string): string
// 1. timeout / code==="ECONNABORTED"  → "Kết nối quá chậm, vui lòng thử lại."
// 2. code==="ERR_NETWORK" hoặc !error.response → "Mất kết nối mạng, vui lòng kiểm tra internet."
// 3. response.data.message → dùng
// 4. response.data.error   → dùng
// 5. error.message (axios ẩn) → dùng
// 6. fallback

export function getHttpStatusMessage(status?: number): string | null
// 400→null (để lấy message từ BE), 401→"Phiên đăng nhập hết hạn...",
// 403→"Bạn không có quyền thực hiện.", 404→"Không tìm thấy dữ liệu.",
// 409/422→"Dữ liệu không hợp lệ.", 500→"Lỗi máy chủ, vui lòng thử lại sau."
```

### 3.3 `src/lib/query-client.ts` (mới)

```ts
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // toast lỗi query nếu chưa bị bắt; dedupe 1s; bỏ qua 401 (đã có refresh flow)
        if (query.meta?.silentError) return;
        toast.error(getApiErrorMessage(error, "Có lỗi tải dữ liệu."));
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _v, _c, mutation) => {
        // hook nào đã tự xử lý onError (message riêng) thì không toast lại
        if (mutation.options.onError) return;
        toast.error(getApiErrorMessage(error, "Thao tác thất bại, vui lòng thử lại."));
      },
    }),
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
      mutations: { retry: 0 },
    },
  });
}
```

Chống toast trùng (StrictMode/dev): dedupe bằng Map `message → lastTimestamp`, bỏ qua nếu < 1000ms. `401` do refresh-thành-công thì không toast (kiểm tra trong interceptor + QueryCache skip status 401).

### 3.4 ErrorBoundary + ErrorState (UI)

- `src/components/ui/error-boundary.tsx`: class component, `componentDidCatch`, render fallback (icon + message + nút "Tải lại trang"). Bọc `App` trong `main.tsx`.
- `src/components/ui/error-state.tsx`: `ErrorState({ title, message, onRetry })` tương thích style motion đang dùng, dùng cho các màn hình query có nút Retry.

## 4. Tin nhắn lỗi - quyết định
- **Ngôn ngữ**: thống nhất tiếng Việt có dấu cho message hiển thị user (đã có tiền lệ VN trong một số hook). Nếu user muốn giữ EN, chỉ cần đổi chuỗi trong `error-message.ts` + các hook, kiến trúc không đổi.
- Quy tắc: ưu tiên `message` từ BE (đã xuất tiếng Việt sẵn) → map status → fallback chung.

## 5. Các bước triển khai

1. **`src/lib/api-error.ts`** - mở rộng type `ApiError` (thêm `code`, `timeout`, `errors`).
2. **`src/lib/error-message.ts`** (mới) - `getApiErrorMessage` + `getHttpStatusMessage` như §3.2.
3. **`src/lib/query-client.ts`** (mới) - factory §3.3 + dedupe + skip 401.
4. **`src/main.tsx`** - thay `new QueryClient()` bằng `createQueryClient()`; bọc app bằng `ErrorBoundary`.
5. **`src/services/axios.ts`** - sửa `return Promise.reject(error)` (dòng 32).
6. **Refactor 7 file tasks hooks** (`useAssignTask`, `useUnassignTask`, `useCreateTaskComment`, `useCreateTaskCommentReply`, `useUpdateTaskComment`, `useDeleteTaskComment`, `useUpdateTaskStatusAction`):
   - xoá `getApiErrorMessage` local → import từ `lib/error-message`;
   - giữ logic override theo status riêng (403...); fallback về helper.
7. **Thống nhất kiểu `ApiError`**: mọi hook dùng `@/lib/api-error`; sửa `useLogin.ts:9` bỏ type local; `useLogin.ts:34` → `getApiErrorMessage(error, "Đăng nhập thất bại, vui lòng thử lại.")`.
8. **Hook còn thiếu onError**: `useLogout` thêm `onError` (toast "Đăng xuất thất bại") giữ `onSettled` clean-up.
9. **Cập nhật 4 UI lỗi query** dùng lý do thật:
   - `components/mainSpace/view-main.tsx` → ErrorState + hiện `error.message` + Retry (`refetch`).
   - `components/projects/detail-project.tsx`, `components/notifications/notification-center.tsx`, `components/tasks/comments/task-comments-section.tsx` tương tự; các query tương ứng set `meta: { silentError: true }` để không toast trùng với inline UI.
10. **`src/components/ui/error-state.tsx` / `error-boundary.tsx`** (mới) theo §3.4.

## 6. Verification
- `npm run build` (tsc -b && vite build) và `npm run lint` phải pass.
- Test tay:
  - Tắt mạng khi bấm hành động → thấy "Mất kết nối mạng...".
  - Bật DevTools block 1 API → thấy lỗi 500/404 rõ ràng.
  - Dùng expired token → không toast double lúc refresh, có message phiên hết hạn.
  - Tạo project trùng tên / xoá board fail role → message đúng trường hợp.
  - Scan mọi mutation: không còn hook nào "âm thầm" lỗi.

## 7. Rủi ro & giảm thiểu
- **Toast trùng** khi hook đã có `onError` → MutationCache chỉ toast khi `mutation.options.onError == null`.
- **StrictMode dev chạy 2 lần** → dedupe theo timestamp.
- **Đổi message gây sót kỳ vọng user** → giữ nguyên message BE khi có; plan chỉ đổi fallback.
- **Sóng refactor type `ApiError`** → thay đổi cơ học qua các hook, build lock.

## 8. Checklist duyệt
- [ ] Ngôn ngữ message: tiếng Việt (mặc định) hay giữ tiếng Anh?
- [ ] Query lỗi có toast toàn cục + inline UI (kiến nghị) hay chỉ inline UI?
- [ ] Duyệt thêm các bước 5.1 → 5.10 để bắt đầu fix.