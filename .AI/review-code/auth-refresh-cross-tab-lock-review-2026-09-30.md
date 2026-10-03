# Code review: khóa refresh token giữa các tab

Ngày review: 2026-09-30

Phạm vi: `src/services/auth-refresh-coordinator.ts:39-42`

## Finding

### P2 - Khóa refresh giữa các tab không độc quyền

`acquireLock()` đọc lock hiện tại rồi mới ghi candidate vào `localStorage`. Đây là
hai thao tác riêng biệt; `localStorage` không hỗ trợ check-and-set nguyên tử. Nếu
hai tab bắt đầu refresh gần như cùng lúc, cả hai có thể cùng đọc thấy lock đang
trống, ghi lock của mình và tiếp tục gọi refresh bằng cùng refresh token cũ.

Vì BE xoay refresh token sau mỗi lần refresh, request thứ hai có thể nhận 401 do
refresh token cũ không còn hợp lệ. Nếu tab đó xử lý 401 bằng cách xóa token đăng
nhập, người dùng có thể bị mất phiên ở tab đó dù tab kia đã refresh thành công.

**Khuyến nghị:** Dùng cơ chế khóa cross-tab thực sự độc quyền, hoặc xử lý an toàn
kịch bản refresh đồng thời để lỗi từ request dùng token cũ không xóa phiên hợp lệ.

## Kết luận

Cần loại bỏ race condition trong việc giành lock hoặc bảo vệ phiên khi hai tab gửi
refresh đồng thời; thao tác đọc rồi ghi `localStorage` hiện tại chưa đảm bảo chỉ có
một tab được quyền refresh.
