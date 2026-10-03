# Bug: Project admin vào board bị hiển thị như board member và mất thao tác quản trị

Ngày ghi nhận: 2026-10-03  
Trạng thái: Đã xác định nguyên nhân qua mã nguồn FE/BE; chưa sửa, chưa kiểm chứng trên tài khoản hoặc database cụ thể.

## Hiện tượng và cách tái hiện

1. Tài khoản A tạo project P (BE gán `PROJECT_ADMIN`) hoặc được nâng lên `PROJECT_ADMIN` trong P.
2. Tài khoản B tạo board X trong P. A không phải người tạo board X. Thêm A vào X bằng chức năng Add member (BE mặc định gán `BOARD_MEMBER`).
3. A mở X > Manage board members. Dòng của A hiện `Member`; A không có điều khiển đổi role hoặc xóa member, dù role ở project là `PROJECT_ADMIN`.
4. Biến thể: Nếu A chưa được thêm vào X, A vẫn có thể mở X nhờ quyền kế thừa từ project, nhưng A không có dòng nào trong danh sách board members. UI cũng không nhận diện A là admin của board.

**Kỳ vọng:** A có các quyền quản trị board mà `PROJECT_ADMIN` được cấp trong project P. UI hiển thị rõ quyền hiệu lực từ project và cho phép thao tác tương ứng. Vai trò membership riêng ở board (`BOARD_MEMBER` hoặc không có) vẫn cần được phân biệt với quyền hiệu lực.

## Nguyên nhân đã xác định

### 1. BE có quyền kế thừa nhưng dữ liệu board member không biểu diễn quyền hiệu lực

- `Manage -Task/BE/src/modules/data/seed.ts:35-46`: `PROJECT_ADMIN` được cấp toàn bộ `BoardPermissions`, `ListPermissions`, `TaskPermissions`.
- `Manage -Task/BE/src/common/middlewares/auth.middleware.ts:240-266` và `src/modules/permission/permission.repository.ts:106-127`: khi kiểm tra route board, BE lấy `projectId` của board và xét quyền project trước quyền board. Do đó `PROJECT_ADMIN` có thể vượt qua middleware cho những route quản trị board, nếu role/permission trong DB khớp seed.
- `Manage -Task/BE/src/modules/board/board.service.ts:286-297`: Add member vào board **luôn** tạo membership `BOARD_MEMBER`, không xét project role của người được thêm. Đây là role riêng của board, không có nghĩa quyền `PROJECT_ADMIN` bị thay đổi.
- `Manage -Task/BE/src/modules/board/board.service.ts:332-349` và `src/modules/board/dtos/responses/boardMember.res.ts:4-30`: `GET /board/:boardId/members` chỉ trả membership/role thuộc board. `src/modules/board/dtos/responses/board.res.ts:4-20` cũng không trả project role hoặc effective permissions cho current user.

### 2. FE dùng duy nhất board role để suy ra quyền quản lý

- `FE/src/components/members/manage-members-board.tsx:31-49`: dialog chỉ nạp `useBoardMembers`, map `member.role`, và đánh dấu owner bằng `board.userId`. Không nạp project membership/role.
- `FE/src/components/members/member-list-dialog.tsx:117-127`: `isAdminViewer` chỉ đúng nếu current user là board owner hoặc có `BOARD_ADMIN` trong danh sách board members. Project admin là `BOARD_MEMBER` hoặc không có membership đều bị coi là không phải admin.
- `FE/src/components/members/member-list-row.tsx:60-67,165-166,282`: UI chỉ cho đổi role/xóa member khi `isAdminViewer` đúng. Nhãn dòng lấy trực tiếp từ board role nên hiện `Member` là đúng theo bản ghi board, nhưng gây hiểu sai về quyền hiệu lực.
- `FE/src/features/boards/types/index.ts:9-18` và `src/components/boards/detail-board.tsx:325-330`: dữ liệu board FE dùng không có `projectRole`/effective permissions; dialog chỉ được truyền board owner.

**Kết luận:** quyền thực tế được BE hợp từ project + board, còn UI chỉ xét board membership. Hai nguồn dữ liệu không cùng ngữ nghĩa. Khi project admin được thêm vào board, `BOARD_MEMBER` là role được lưu; FE diễn giải role này như toàn bộ quyền của người dùng.

## Vấn đề BE liên quan cần sửa cùng luồng

- `Manage -Task/BE/src/modules/board/board.router.ts:94-114` dùng permission middleware cho update/delete board. Tuy nhiên `src/modules/board/board.service.ts:177-193,219-235` lại bắt buộc actor phải là active board member. Vì vậy project admin **chưa được thêm vào board** vượt qua middleware nhưng vẫn nhận 403 khi update/delete.
- `Manage -Task/BE/src/modules/board/board.repository.ts:109-115`: delete còn có điều kiện `userId` là board creator. Với project admin hoặc board admin khác creator, thao tác có thể lỗi khi cập nhật DB dù middleware cho phép. Cần chốt chính sách delete: chỉ creator hay mọi actor có `DELETE_BOARD`; đồng bộ route, service, repository và UI.
- `FE/src/components/projects/settingBoard-project.tsx:42-117` vẫn hiện Add/Edit/Delete cho mọi người trên board card, kể cả người không có quyền. Đây là biểu hiện ngược của cùng việc thiếu nguồn quyền hiệu lực; user có thể bấm rồi nhận 403.

## Hướng sửa đề xuất

1. Xác định contract quyền hiệu lực cho current user trên board: BE trả `boardRole`, `projectRole` và/hoặc danh sách `effectivePermissions` trong API list/detail board. Không đổi ngầm bản ghi `BOARD_MEMBER` thành `BOARD_ADMIN` vì đó là hai scope khác nhau.
2. FE dùng quyền hiệu lực để bật/tắt thao tác quản trị trong board dialog và menu card. Hiển thị board membership role riêng; nếu cần nhãn quyền, ghi rõ `Project admin`/`Quản trị qua project`.
3. BE bỏ hoặc thay điều kiện board membership trong update/delete bằng cùng chính sách permission đã kiểm ở middleware. Chốt và thực thi thống nhất chính sách delete.
4. Kiểm tra ma trận: project admin không là board member; project admin + `BOARD_MEMBER`; `BOARD_ADMIN` trong board; project member + `BOARD_MEMBER`; board creator. Đối chiếu UI, HTTP status và realtime sau đổi role.

## Giới hạn xác minh

Phân tích tĩnh trên mã hiện tại. Chưa có project/board/user ID hoặc phiên đăng nhập để xác minh response thực tế và dữ liệu `rolePermissions` trong DB. Nếu DB chưa seed đúng, lỗi quyền runtime còn có thể khác phần UI nêu trên.
