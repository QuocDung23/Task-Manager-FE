# Plan: Sửa lỗi 403 khi project member đọc board

**Ngày:** 2026-08-22

## Yêu cầu đã hiểu

Tài khoản có role `PROJECT_MEMBER` trong cùng project phải đọc được board thuộc project, bao gồm:

- `GET /board/:boardId/members`;
- `GET /list/:boardId/getAllList`.

Các quyền quản trị board như update, delete, add/remove member vẫn giữ nguyên theo role hiện tại.

## Nguyên nhân

- API danh sách board yêu cầu `VIEW_PROJECT` nên trả toàn bộ board trong project.
- Grid FE lập tức gọi API members và lists cho từng board.
- Hai API con yêu cầu `VIEW_BOARD`.
- `PROJECT_MEMBER` có `VIEW_PROJECT`, toàn bộ `ListPermissions` và các task permission dành cho member, nhưng thiếu `VIEW_BOARD`.
- Vì vậy cùng một board xuất hiện hợp lệ trên grid nhưng các request dữ liệu phụ lại bị `403`.

## Kế hoạch thực hiện

1. Cập nhật permission map để `PROJECT_MEMBER` có `BoardPermissions.VIEW_BOARD`.
2. Thêm Prisma migration SQL idempotent để gắn permission `VIEW_BOARD` cho role `PROJECT_MEMBER` trong database hiện hữu; không phụ thuộc vào việc chạy seed thủ công.
3. Giữ nguyên middleware của `getMembers` và `getAllList`, vì `verifyBoardPermission` đã hỗ trợ resolve permission từ project scope.
4. Không thêm các quyền `UPDATE_BOARD`, `DELETE_BOARD`, `ADD_MEMBER_BOARD` hoặc quyền quản trị board khác cho `PROJECT_MEMBER`.
5. Bổ sung kiểm thử tập trung cho permission repository/middleware nếu hạ tầng test hiện có hỗ trợ; nếu repository chưa có test runner, thực hiện typecheck và kiểm tra migration/seed tĩnh.
6. Ghi kết quả, file thay đổi và lệnh verify vào `.AI/working/board-member-access/work-log.md`.

## File dự kiến thay đổi

- `Manage -Task/BE/src/modules/data/seed.ts`
- `Manage -Task/BE/prisma/migrations/<timestamp>_grant_project_member_view_board/migration.sql`
- File test permission tương ứng nếu project có test infrastructure phù hợp.
- `FE/.AI/working/board-member-access/work-log.md`

## Tiêu chí hoàn thành

- `PROJECT_MEMBER` active của project nhận `200` từ `getMembers` và `getAllList` cho board thuộc project.
- User không thuộc project và không thuộc board vẫn nhận `403`.
- `PROJECT_MEMBER` vẫn không có quyền update/delete/quản trị member của board.
- TypeScript BE pass và migration hợp lệ.
