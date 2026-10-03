# Code review: refresh coordinator, route guard và project card

Ngày review: 2026-09-22

Phạm vi review: commit `3efe997` (`fix: auto refreshToken when accessToken expired`).
Không sửa source code trong lần review này.

## Findings

### P1 - Coordinator lấy lại lock mà chính nó đang giữ

File: `src/services/auth-refresh-coordinator.ts:68-76`

Khi lock đang trống, lần gọi `acquireLock()` đầu tiên thành công nhưng kết quả bị bỏ
qua. Lần gọi thứ hai ngay sau đó thấy lock đã được chính tab hiện tại giữ nên trả về
`false`. Vì vậy `coordinate()` trả về `null`, không chạy refresh task và cũng không
release lock. Trong trường hợp thông thường chỉ có một tab, refresh access token sẽ
thất bại và lock còn tồn tại đến khi hết TTL.

Khuyến nghị: lưu kết quả lần acquire đầu tiên và dùng lại. Chỉ acquire lần nữa sau
khi đã chờ tab khác refresh nhưng không nhận được token mới.

### P2 - Route guard redirect trước khi initial restore bắt đầu

File: `src/router/route-guards.tsx:78-82`

Ở render đầu với access token đã hết hạn, effect của `SessionRestoreProvider` chưa
chạy nên `isRestoring` vẫn là `false`. `useGuardSession()` vì thế trả về phase
`ready` với payload `null`; protected route hoặc root route có thể redirect sang
`/login` trước khi refresh bắt đầu. Deep link ban đầu bị mất ngay cả khi refresh sau
đó thành công.

Khuyến nghị: coi trạng thái token hết hạn là `checking` ngay ở render đầu, dựa trên
initial status hoặc `isLoading` của provider. Sau khi restore hoàn tất hoặc thất bại
mới quyết định render route hay redirect.

### P2 - Header của project card mất flex layout

File: `src/components/mainSpace/projectCard-main.tsx:61-67`

Class `flex-row` chỉ đặt hướng flex, không tạo flex container; class `pl-` cũng không
phải utility Tailwind hợp lệ. Title và membership badge vì vậy hiển thị thành hai
block row thay vì nằm cùng hàng như trước.

Khuyến nghị: khôi phục class `flex`, bỏ `pl-` và căn badge theo layout header hiện
có.

## Kết luận

Có 1 lỗi P1 làm hỏng luồng refresh token trong trường hợp single-tab và 2 lỗi P2
gây mất deep link khi restore session cùng regression giao diện project card. Nên
ưu tiên xử lý P1 trước, sau đó sửa đồng thời hai finding P2 và bổ sung kiểm thử hồi
quy cho coordinator cùng initial route restore.
