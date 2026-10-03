# Re-review: dialog quản lý member sau khi sửa

Ngày review: 2026-09-22

Phạm vi: thay đổi FE chưa commit trên nhánh `feature-web-2-project-board`, chỉ code trong `src/`. Đối chiếu với `member-management-ui-review-2026-09-22.md`. Không sửa source trong lần review này.

Files:

- `src/components/boards/detail-board.tsx`
- `src/components/mainSpace/settingProject-main.tsx`
- `src/components/projects/boardCard-project.tsx`
- `src/components/projects/settingBoard-project.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/features/projects/hooks/useProjectMembers.ts`
- `src/components/members/manage-members-board.tsx`
- `src/components/members/manage-members-project.tsx`
- `src/components/members/member-list-dialog.tsx`
- `src/components/members/member-list-row.tsx`
- `src/lib/member-roles.ts`

Chưa ổn. Dialog đã an toàn hơn: query member chỉ chạy khi mở, nút Add member đã nối, avatar chỉ hiện số dư khi quá 3 người, và người xem không còn bị coi là admin khi chưa xác định được user. Phần quản lý member của board gần như chưa được sửa. Đổi role project hết lỗi im lặng nhưng vẫn không đổi được khi UUID của role đích không nằm trong danh sách member hiện tại.

Kết quả lần này: 2 bugs. Năm finding trước đã hết, một finding còn một phần, một finding vẫn mở.

## Đối chiếu finding lần trước

1. Open — payload board vẫn chỉ có `roleId`, đổi role vẫn gửi `BOARD_ADMIN`/`BOARD_MEMBER`, backend không có PATCH/DELETE member, và chỉ `board.userId` được coi là người quản lý.
2. Fixed — `isAdminViewer` là false khi không tìm thấy viewer trong danh sách.
3. Partial — thiếu UUID giờ có toast, nhưng UUID vẫn chỉ suy từ member đang hiển thị nên hạ role thất bại khi không ai giữ `PROJECT_MEMBER`.
4. Fixed — nút Add member gọi `onAddMember` khi người xem là admin.
5. Fixed — `useProjectMembers` và `useBoardMembers` trong dialog chỉ `enabled` khi `open`.
6. Fixed — `AvatarGroupCount` chỉ hiện `+(length - 3)` khi `length > 3`.
7. Fixed — `isError` không còn thay danh sách đã có member, và dialog không còn comment kể lại luồng.

## Findings còn lại

### Bug — Quản lý member của board vẫn sai dữ liệu và quyền

File: `src/components/members/manage-members-board.tsx:38`

`GET /board/:boardId/members` (`BoardMemberResponseDto` trong `Manage -Task/BE/src/modules/board/dtos/responses/boardMember.res.ts:10` và `getActiveBoardMembersWithUser`) chỉ trả `roleId` UUID, không có tên role. Map ở dòng 38–46 cũng không gán `role`. Vì vậy `isAdminRole(member.role)` luôn false, mọi người không phải `board.userId` hiện nhãn Member, và `isAdminViewer` (`member-list-dialog.tsx:124`) chỉ đúng với owner. `BOARD_ADMIN` không quản lý được chính board của mình. `PROJECT_ADMIN` cũng không được nhận, dù `verifyBoardPermission` (`auth.middleware.ts:255`) cộng quyền project và seed cấp cho role đó toàn bộ `BoardPermissions`, gồm `ADD_MEMBER_BOARD`, `REMOVE_MEMBER_BOARD`, `UPDATE_ROLE_MEMBER_BOARD`. Đổi role (`manage-members-board.tsx:61`) vẫn nhét tên `BOARD_ADMIN`/`BOARD_MEMBER` vào field `roleId`. Xoá và đổi role gọi `DELETE /board/:boardId/members/:userId` và `PATCH /board/:boardId/members/:userId/role`, nhưng `board.router.ts` chỉ đăng ký POST và GET `/:boardId/members` (dòng 124–150). Hai hành động đó sẽ 404.

Khuyến nghị: backend trả thêm tên role trên member của board (giống project member) và thêm PATCH/DELETE, body `roleId` là UUID. FE map `role`, resolve tên sang UUID trước khi PATCH, và coi là người quản lý nếu là owner, `BOARD_ADMIN`, hoặc `PROJECT_ADMIN` của `projectId` (dialog đã có `projectId`).

### Bug — Hạ role project vẫn thất bại khi không ai đang giữ PROJECT_MEMBER

File: `src/components/members/manage-members-project.tsx:55`

`roleUuidByName` vẫn chỉ gom `role` → `roleId` từ member đang có trong response. `PATCH /project/:projectId/members/:memberId` bắt `roleId` là UUID (`updateProjectMember.req.ts`). Khi mọi member đều là `PROJECT_ADMIN` — trường hợp điển hình sau khi thăng người `PROJECT_MEMBER` cuối cùng — map không có `PROJECT_MEMBER`. `handleChangeRole` (dòng 78–82) toast rồi return, nên không hạ được ai về Member. Toast chỉ hết lỗi im lặng, không làm request thành công.

Khuyến nghị: lấy UUID role từ nguồn ổn định (endpoint danh sách role, hoặc cho PATCH nhận tên role rồi backend tự `findRolesName`). Không suy UUID từ tập member hiện tại. Giữ toast chỉ làm lỗi dự phòng khi role thật sự không tồn tại.
