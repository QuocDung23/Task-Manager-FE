# Bug: Search member trên board trả về user không thuộc project

Ngày: 2026-09-22

Trạng thái: đã sửa xong (2026-09-22).

## Triệu chứng

Ở dialog Add member của board, gõ email vẫn ra user không phải member của project chứa board đó. Search của project thì đúng hướng (mời người từ toàn hệ thống). Search của board phải chỉ nằm trong member của project.

Thêm người đó vào board thì bị chặn. Lỗi nằm ở bước search, không phải bước add.

## Nguyên nhân

Board và project dùng chung một dialog search, và dialog đó luôn gọi API danh sách user toàn hệ thống. `projectId` của board không được đưa vào query.

### FE — search không biết board thuộc project nào

`DialogAddMemberBoard` có `projectId`, nhưng chỉ đưa vào mutation thêm member. Search không nhận `projectId`.

- `src/components/projects/addMember-board.tsx:18-24` — render `AddMemberDialog` với `scope="board"` và `onAdd`. Không truyền `projectId` vào search.
- `src/components/projects/addMember-dialog.tsx:52-56, 81-86` — `scope` chỉ đổi câu chữ. Cả project lẫn board đều gọi `useUsers(email)`.
- `src/features/users/hooks/useUsers.ts:4-8` — query `userApi.getAll(email, "ACTIVE")`.
- `src/features/users/api/user-api.ts:10-15` — `GET /user?email=&status=ACTIVE`. Không có `projectId`.

### BE — `GET /user` tìm trên bảng users, không join project

- `src/modules/user/user.router.ts:50-55` — `GET /user`.
- `src/modules/user/dtos/request/getUsers.req.ts:17-21` — query chỉ có `name`, `email`, `status`.
- `src/modules/user/user.repository.ts:32-42` — `users.findMany` theo email contains, status, và loại `SUPER_ADMIN`. Không có điều kiện `projectMembers`.

Vì vậy mọi user ACTIVE (trừ super admin) khớp email đều hiện trên board.

## Phần add thì đã chặn

`POST /board/:boardId/members` không thêm được người ngoài project.

`Manage -Task/BE/src/modules/board/board.service.ts:250-257`:

```ts
const isProjectMember =
  await this.projectMemberRepository.checkMemberOfProject(
    existingBoard.projectId,
    userId,
  );
if (!isProjectMember) {
  throw new ForbiddenException();
}
```

`checkMemberOfProject` (`projectMember.repository.ts:167-180`) chỉ tính member `ACTIVE` và `deletedAt: null`. Không đủ điều kiện thì 403, message mặc định `"The user does not have permission to make changes to this resource"`.

FE `useAddMemberBoard` (`src/features/boards/hooks/useAddMemberBoard.ts:42-53`) không có nhánh 403. User thấy toast chung `"Add member to board fail"`.

## Nguồn dữ liệu đúng đã có sẵn

`GET /project/:projectId/members` trả member ACTIVE của project, kèm `user.email` (`projectMember.repository.ts:9-30, 82-93`). Board search nên lấy tập này rồi lọc theo email, thay vì `GET /user`.

## Hướng sửa đã thực hiện

1. `AddMemberDialog` nhận `projectId`; scope board search trên `GET /project/:projectId/members` rồi lọc email phía client (`addMember-dialog.tsx`).
2. Giữ `GET /user` cho dialog add member của project.
3. Giữ guard `checkMemberOfProject` ở `addMemberToBoard` làm lớp chặn cuối.
4. Thêm nhánh 403 trong `useAddMemberBoard` — toast nói rõ user chưa thuộc project.
