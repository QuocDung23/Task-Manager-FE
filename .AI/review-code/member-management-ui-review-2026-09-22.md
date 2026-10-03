# Code review: dialog quản lý member (project và board)

Ngày review: 2026-09-22

Phạm vi: thay đổi FE chưa commit trên nhánh `feature-web-2-project-board`, chỉ code trong `src/`. Không review thư mục `.AI/`. Không sửa source trong lần review này.

Files:

- `src/components/boards/detail-board.tsx`
- `src/components/mainSpace/settingProject-main.tsx`
- `src/components/projects/settingBoard-project.tsx`
- `src/components/members/manage-members-board.tsx` (mới)
- `src/components/members/manage-members-project.tsx` (mới)
- `src/components/members/member-list-dialog.tsx` (mới)
- `src/components/members/member-list-row.tsx` (mới)
- `src/lib/member-roles.ts` (mới)

Nhánh này thêm dialog quản lý thành viên cho project và board, kèm cụm avatar trên header board. Luồng project (list, xoá theo membership id, đổi role bằng UUID lấy từ payload) đi đúng endpoint hiện có. Luồng board thì không: payload member không có tên role, request đổi role gửi tên enum thay vì UUID, và backend chưa có route xoá member hay đổi role. Ngoài ra cổng admin trên UI mặc định mở khi chưa xác định được người xem, nút thêm thành viên trong dialog không được gắn, và mỗi card project/board đều fetch member dù dialog đang đóng.

Kết quả: 5 bugs, 2 suggestions.

## Findings

### Bug — Quản lý member của board sai vai trò và gọi API không tồn tại

File: `src/components/members/manage-members-board.tsx:39`

`BoardMemberUser` chỉ có `roleId` (UUID). DTO backend `BoardMemberResponseDto` không trả field `role` như project. Mapping ở dòng 39–47 bỏ qua role, nên mọi người không phải `board.userId` đều bị coi là Member: `isAdminRole` luôn false, board admin không được tính vào `adminCount`, và chặn “admin cuối” không có tác dụng. `handleChangeRole` (dòng 61–63) gửi thẳng `BOARD_ADMIN` / `BOARD_MEMBER` vào `roleId`. `boardApi.updateMemberRole` và `boardApi.removeMember` gọi `PATCH/DELETE /board/:boardId/members/:userId/...`, nhưng `board.router.ts` chỉ đăng ký `GET` và `POST /:boardId/members`. Đổi role và xoá member vì thế luôn lỗi. Backend còn cho `PROJECT_ADMIN` mọi quyền board qua `verifyBoardPermission` (seed gắn toàn bộ `BoardPermissions`), trong khi dialog chỉ coi `board.userId` là người được quản lý — project admin không phải chủ board sẽ không thấy nút nếu họ có mặt trong list.

Khuyến nghị: chỉ bật xoá/đổi role sau khi backend có route và trả `role` (tên) cùng `roleId` (UUID), rồi map `role` giống `manage-members-project.tsx` và resolve tên thành UUID trước khi PATCH. Đến lúc đó hãy tính admin theo role thật, gồm cả project admin được kế thừa quyền board. Nếu user tự rời board, điều hướng ra khỏi trang board thay vì chỉ đóng dialog.

### Bug — Cổng admin mặc định mở khi chưa biết người xem

File: `src/components/members/member-list-dialog.tsx:122`

`isAdminViewer` fallback về `true` khi không tìm thấy current user trong danh sách. `currentUserId` là `""` cho đến khi `useCurrentUser` trả về, và giữ nguyên `""` nếu `getMe` lỗi, nên viewer là `undefined` và mọi hàng không phải owner đều hiện dropdown đổi role và nút xoá. Backend chỉ cấp `UPDATE_ROLE_*` / `REMOVE_MEMBER_*` cho `PROJECT_ADMIN` và `BOARD_ADMIN`. Member thường vì thế thấy hành động phá huỷ (request sẽ 403, nhưng cổng UI đã mở). Cùng fallback này, người không nằm trong list board — kể cả project admin không được add vào board — cũng bị coi là admin.

Khuyến nghị: mặc định `isAdminViewer` là `false` khi chưa có viewer hoặc chưa có `currentUserId`. Chỉ bật nút quản lý sau khi đã biết role của người xem (owner hoặc role kết thúc bằng `_ADMIN`). Có thể ẩn luôn mục “Manage members” / “Add member” trên menu với member thường.

### Bug — Đổi role project im lặng thất bại khi role đích chưa có ai giữ

File: `src/components/members/manage-members-project.tsx:79`

Đổi role project lấy UUID bằng cách duyệt member hiện tại (`roleUuidByName`). Backend lưu role là UUID và chỉ nhận `roleId` UUID (`findRoleById`). Nếu tên role đích chưa xuất hiện trên bất kỳ member nào, `roleUuidByName.get(roleName)` là `undefined` và hàm `return` im lặng, không toast. Trường hợp thực tế: project chỉ còn `PROJECT_ADMIN` (owner luôn được gán admin lúc tạo; member cuối vừa được promote) thì không còn UUID `PROJECT_MEMBER` trong cache, hạ quyền thất bại mà UI vẫn đóng dropdown như thể đã gọi API.

Khuyến nghị: lấy catalog role (hoặc ít nhất cả hai UUID `PROJECT_ADMIN` và `PROJECT_MEMBER`) từ một nguồn không phụ thuộc member đang hiển thị. Nếu map thiếu id, toast lỗi thay vì return trống.

### Bug — Nút thêm thành viên trong dialog không được gắn

File: `src/components/members/member-list-dialog.tsx:66`

`onAddMember` là prop bắt buộc và cả hai wrapper đều truyền callback rồi render `AddMemberDialog` với `open={open && openAddMember}`. Component không destructure `onAddMember` và không render nút nào gọi nó (khối search ở dòng 196–211 chỉ có ô tìm kiếm). Dialog thêm thành viên bên trong màn quản lý không bao giờ mở. Thêm member vẫn chỉ làm được từ mục menu “Add member” riêng.

Khuyến nghị: destructure `onAddMember` và gắn nút “Add member” cạnh ô search, hoặc bỏ prop và `AddMemberDialog` lồng nhau nếu cố ý chỉ thêm từ menu.

### Bug — Mỗi card fetch member dù dialog đang đóng

File: `src/components/members/manage-members-project.tsx:28`

`DialogManageMembersProject` và `DialogManageMembersBoard` luôn gọi `useProjectMembers`/`useProject` hoặc `useBoardMembers`/`useBoard` dù `open` đang false. Hai dialog được mount trong `MenuSettingProject` (mọi card ở `view-main.tsx`) và `MenuSettingBoard` (mọi card ở `detail-project.tsx`). Mở lưới project hoặc project detail sẽ bắn thêm một `GET /project/:id` cộng `GET /project/:id/members` cho từng project, và `GET /board/:id` cộng `GET /board/:id/members` cho từng board. `userId` chủ sở hữu đã có trên `ProjectResponse` / `BoardResponse` của list, nên các request detail này là thừa. Trên trang board đơn lẻ thì `useBoard` / `useBoardMembers` trùng query key với `DetailBoard`, không nhân request.

Khuyến nghị: truyền `ownerUserId` từ card/list xuống dialog và chỉ `enabled` các query member khi `open === true`. Không mount mutation/query nặng cho tới khi user mở dialog.

### Suggestion — Avatar count trên header board hiện tổng số, kể cả khi không tràn

File: `src/components/boards/detail-board.tsx:217`

`AvatarGroupCount` luôn render tổng `boardMembers.length`, kể cả khi danh sách rỗng (hiện `0`) hoặc khi số người ≤ 3. Chip nằm cạnh tối đa 3 avatar nên dễ bị đọc là phần dư (`+N`) chứ không phải tổng. `ProjectCard` và `AssigneeAvatarGroup` chỉ hiện `+overflow` khi `total - visible > 0`.

Khuyến nghị: chỉ hiện count khi `length > 3`, và hiển thị số người bị khuất (`length - 3`), có prefix `+` cho đúng nghĩa overflow.

### Suggestion — Lỗi refetch che danh sách còn trong cache

File: `src/components/members/member-list-dialog.tsx:214`

Nhánh render ưu tiên `isError` hơn data. Ở TanStack Query v5, refetch lỗi vẫn giữ data lần trước nhưng `isError` thành true, nên dialog đổi từ danh sách sang “Could not load members” dù member vẫn còn trong cache. Một số comment chỉ kể lại code: catch “Mutation hook already surfaces a toast” ở `manage-members-board.tsx:57`, `manage-members-project.tsx:75` và `member-list-row.tsx:91`, cùng chú thích “Leaving the board/project yourself” ngay trên nhánh `if` đã nói điều đó.

Khuyến nghị: hiện lỗi chỉ khi `isError && members.length === 0` (vẫn giữ nút Retry). Xoá comment tường thuật; giữ comment giải thích vì sao project phải map tên role sang UUID.

## Ngoài phạm vi

Hai file tracked đổi sau khi diff được gom, chưa nằm trong review này:

- `src/components/projects/boardCard-project.tsx`
- `src/components/ui/dropdown-menu.tsx`

---

## Bản ghi sửa chữa (2026-09-22)

Người duyệt đồng ý **bỏ qua Finding 1** (board member đổi role/xoá chưa thể hoạt động vì backend chưa có route PATCH/DELETE).

Các finding còn lại đã được fix:

### Bug — Cổng admin mặc định mở khi chưa biết người xem ✅

`src/components/members/member-list-dialog.tsx`

`isAdminViewer` giờ mặc định `false` khi chưa tìm thấy viewer: chỉ bật khi có viewer và `viewer.isOwner || isAdminRole(viewer.role)`.

### Bug — Đổi role project im lặng thất bại khi role đích chưa có ai giữ ✅

`src/components/members/manage-members-project.tsx`

Khi `roleUuidByName.get(roleName)` trả `undefined`, gọi `toast.error("Could not resolve role ...")` thay vì return im lặng.

### Bug — Nút thêm thành viên trong dialog không được gắn ✅

`src/components/members/member-list-dialog.tsx`

Destructure `onAddMember` và render nút **Add member** (primary, dạng pill) cạnh ô tìm kiếm — chỉ hiện khi `isAdminViewer`.

### Bug — Mỗi card fetch member dù dialog đang đóng ✅

- `src/components/members/manage-members-project.tsx`: bỏ `useProject`, thêm prop `ownerUserId`, chỉ `enabled` `useProjectMembers` khi `open`.
- `src/components/members/manage-members-board.tsx`: bỏ `useBoard`, thêm prop `ownerUserId`, chỉ `enabled` `useBoardMembers` khi `open`.
- `src/features/projects/hooks/useProjectMembers.ts`: nhận `options?.enabled` (mặc định `true`), mirror `useBoardMembers`.
- Caller truyền `ownerUserId` từ payload list sẵn có: `settingProject-main.tsx` (`project.userId`), `settingBoard-project.tsx` và `detail-board.tsx` (`board.userId`).

### Suggestion — Avatar count trên header board hiện tổng số ✅

`src/components/boards/detail-board.tsx`

`AvatarGroupCount` chỉ render khi `length > 3` và hiện `+{length - 3}` (overflow) thay vì tổng số.

### Suggestion — Lỗi refetch che danh sách còn trong cache ✅

`src/components/members/member-list-dialog.tsx`

Điều kiện hiện trạng thái lỗi đổi thành `isError && normalizedMembers.length === 0` (vẫn giữ nút Retry). Xoá comment tường thuật ở `member-list-row.tsx`, `manage-members-project.tsx`, `manage-members-board.tsx`; giữ comment giải thích vì sao project map tên role sang UUID.

Verify: `npx eslint` (các file liên quan) và `npx tsc -b` đều pass.
