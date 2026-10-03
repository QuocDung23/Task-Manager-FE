# Nhật ký sửa realtime cho task schedule

## Thời gian

- Ngày thực hiện: 10/08/2026.
- Phạm vi: Frontend, luồng realtime của task schedule trên board và task detail.

## Mục tiêu

Kiểm tra nguyên nhân task đã được schedule qua REST API nhưng giao diện ở tab khác hoặc board đang không mở task detail không cập nhật realtime. Sau khi xác định nguyên nhân, sửa luồng listener, cache, room reconnect và auth lifecycle của Socket.IO.

## Phạm vi đã kiểm tra

- Singleton Socket.IO client và cách resolve socket URL.
- Hook kết nối global, join/leave task room và listener event.
- Cách board tự join room của các task đang hiển thị.
- Cách task detail mount realtime hook.
- Mutation set schedule, reschedule và clear schedule.
- React Query key và helper cập nhật task qua các cache list/detail.
- Contract event giữa FE và BE.
- Socket auth middleware, task room permission và nơi BE emit schedule event.
- Trạng thái FE/BE local, health endpoint và Socket.IO handshake.

## Nguyên nhân gốc

### 1. Board join room nhưng không có listener global

- `useAutoJoinVisibleTaskRooms()` đã join `task:{taskId}` cho các task trên board.
- Các listener `task:schedule_updated`, `task:rescheduled`, `task:unlocked`, `task:due_soon`, `task:overdue_locked` và `notification:new` lại nằm trong `useTaskSocket()`.
- `useTaskSocket()` chỉ được mount khi task detail đang mở.
- Vì vậy tab chỉ mở board vẫn nhận event từ Socket.IO ở transport level nhưng không có handler ghi payload vào React Query cache. UI không thay đổi dù BE đã emit đúng event.

### 2. Room không được khôi phục đúng sau reconnect

- Room của Socket.IO bị mất khi transport tạo connection mới.
- `roomRefcounts` ở FE vẫn giữ giá trị cũ sau disconnect.
- Logic cũ gọi lại `joinTaskRoom()` trong `connect` handler. Hàm này tiếp tục tăng refcount thay vì chỉ emit lại `task:join`.
- Sau một lần reconnect, cleanup không thể giảm refcount về 0, gây leak subscription và có thể không gửi `task:leave` đúng lúc.

### 3. Socket auth có thể dùng token rỗng hoặc cập nhật chậm

- Singleton socket có thể được tạo khi app còn ở màn hình login, lúc chưa có access token.
- Trước đây `ensureSocketConnected()` không cập nhật lại `socket.auth` ngay trước connect.
- `storage` event không chạy trong chính tab vừa gọi `localStorage.setItem()` hoặc `removeItem()`.
- Vì vậy login/logout cùng tab có thể phải chờ interval 30 giây; connection đầu tiên sau login cũng có nguy cơ handshake không có token.

### 4. Socket URL không xử lý biến môi trường chuỗi rỗng

- `VITE_API_URL ?? fallback` không dùng fallback khi biến tồn tại nhưng có giá trị `""`.
- Socket có thể resolve về origin FE thay vì BE trong môi trường dùng file env mẫu để trống.

## Thay đổi đã thực hiện

### Global event listener và cache synchronization

- Tạo `registerTaskEventHandlers()` và đăng ký một lần trong `useGlobalRealtime()`.
- Chuyển toàn bộ schedule/notification listener ra khỏi hook task detail.
- Full task payload từ `task:schedule_updated`, `task:rescheduled` và `task:unlocked` được ghi qua `replaceTaskAcrossCaches()`.
- Partial payload từ `task:due_soon` và `task:overdue_locked` cập nhật cả list cache và detail cache hiện có.
- `notification:new` chỉ có một listener global, tránh phụ thuộc task detail đang mở hay đóng.
- `useTaskSocket(taskId)` chỉ còn trách nhiệm acquire/release task room.

### Room refcount và reconnect

- Tách `emitTaskJoin()` khỏi thao tác tăng refcount.
- Chỉ tăng refcount khi component/hook acquire room thật sự.
- Khi socket connect hoặc reconnect, `rejoinTaskRooms()` emit lại `task:join` cho mọi room có refcount dương mà không tăng refcount.
- Chỉ emit `task:leave` khi socket đang connected; nếu đang disconnected thì xóa desired ref là đủ vì server đã mất room của connection cũ.
- Không buffer join/leave thừa trong lúc transport chưa connected.

### Auth lifecycle

- `ensureSocketConnected()` luôn đọc access token mới nhất và cập nhật `socket.auth` trước khi gọi `connect()`.
- `disconnectSocket()` ngắt cả socket đang connected hoặc đang trong quá trình connect.
- Thêm `AUTH_TOKEN_CHANGED_EVENT`.
- `authStorage.setToken()` và `authStorage.clearToken()` phát event nội bộ trong cùng tab.
- `useGlobalRealtime()` nghe cả `storage` event cho tab khác và `AUTH_TOKEN_CHANGED_EVENT` cho tab hiện tại.
- Khi token bị xóa, socket được disconnect; khi token xuất hiện, auth được refresh và socket connect ngay.

### Socket URL

- Trim `VITE_API_URL`.
- Nếu biến không tồn tại hoặc là chuỗi rỗng, fallback về `http://localhost:3000`.
- Tiếp tục bỏ suffix `/api` và dấu `/` cuối trước khi tạo Socket.IO client.

## File đã chỉnh sửa

- `src/features/realtime/hooks/useTaskSocket.ts`
  - Listener global.
  - Đồng bộ React Query cache.
  - Refcount join/leave.
  - Rejoin room sau reconnect.
  - Điều phối auth lifecycle và notification listener.
- `src/features/realtime/socket.ts`
  - Resolve URL an toàn khi env rỗng.
  - Refresh handshake auth trước connect.
  - Disconnect socket không phụ thuộc trạng thái connected.
- `src/features/auth/storage/auth-storage.ts`
  - Thêm event báo token thay đổi trong cùng tab.
- `.AI/working/task-schedule/realtime-fix.md`
  - Nhật ký công việc theo Step 3.

## Kết quả kiểm tra

### Build và static checks

- `npm run build`: đạt.
- TypeScript project build: đạt.
- Vite production build: đạt.
- `npx eslint src/features/realtime/hooks/useTaskSocket.ts src/features/realtime/socket.ts src/features/auth/storage/auth-storage.ts`: đạt.
- `git diff --check`: đạt tại thời điểm hoàn tất thay đổi source.
- Vite có cảnh báo bundle JavaScript lớn hơn 500 kB. Đây là cảnh báo hiệu năng đã có ở project, không làm build thất bại.

### Full lint của project

`npm run lint` chưa đạt vì 4 lỗi tồn tại sẵn ngoài phạm vi realtime:

- `src/components/tasks/task-detail/task-detail-description.tsx`: `react-hooks/set-state-in-effect`.
- `src/components/tasks/task-detail/task-detail-header.tsx`: `react-hooks/set-state-in-effect`.
- `src/components/ui/button.tsx`: `react-refresh/only-export-components`.
- `src/components/ui/sidebar.tsx`: `react-refresh/only-export-components`.

Các file được sửa trong lượt realtime không phát sinh lỗi ESLint.

### Kiểm tra service local

- Phát hiện BE đang listen ở cổng `3000`.
- Phát hiện FE hiện có đang listen ở cổng `5173`.
- `GET http://localhost:3000/health-check`: `200 OK`, service healthy.
- Socket.IO polling handshake tại `http://localhost:3000/socket.io/?EIO=4&transport=polling`: `200 OK`, trả về `sid`, websocket upgrade và ping config.
- FE hiện có tại `http://localhost:5173/`: `200 OK`.
- Khởi động dev server riêng cho bản sửa tại `http://127.0.0.1:5174/` để không ảnh hưởng server `5173`.
- `HEAD http://127.0.0.1:5174/`: `200 OK`.

## QA chưa thực hiện được

Không có browser runtime khả dụng trong phiên làm việc, vì vậy chưa thể thao tác trực quan bằng hai tab đã đăng nhập. Không tự sử dụng hoặc đoán tài khoản để thay đổi dữ liệu task trong DB.

## Checklist QA thủ công tiếp theo

1. Mở hai tab cùng một board bằng hai session có quyền xem task.
2. Giữ tab B ở board, không mở task detail.
3. Ở tab A, set schedule cho một task chưa có deadline.
4. Xác nhận badge schedule ở tab B cập nhật ngay mà không reload.
5. Reschedule task ở tab A và xác nhận tab B nhận deadline mới.
6. Mở detail của task ở tab B và xác nhận form/chip dùng dữ liệu mới nhất.
7. Tắt mạng rồi bật lại, chờ socket reconnect và lặp lại set/reschedule để xác nhận room đã được rejoin.
8. Logout user A rồi login user B trong cùng tab, xác nhận socket cũ disconnect và user B không nhận notification của user A.
9. Kích hoạt hoặc chờ cron phát `task:due_soon` và `task:overdue_locked`, xác nhận board và detail cùng cập nhật.

## Kết luận

BE đã emit đúng schedule event vào task room. Lỗi chính nằm ở FE ownership của listener: board join room nhưng listener chỉ tồn tại trong task detail. Sau thay đổi, listener được đăng ký global một lần, React Query cache được đồng bộ cho cả board/detail, room được rejoin đúng sau reconnect và auth socket phản ứng ngay khi token thay đổi.
