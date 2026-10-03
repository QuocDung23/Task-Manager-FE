# Review: Quản lý member của Project & Board (creator có phải là member?)

> Scope: `projects.service.ts`, `board.service.ts`, `projectMember/`, `boardMember/`,
> `permission/permission.repository.ts`, `prisma/schema.prisma`
> Ngày review: 2026-08-25

## 1. Creator có được tính là member không?

**Có — code đang làm đúng hướng.** Khi tạo project/board, creator được auto-insert
vào bảng members với role ADMIN:

- Project: `src/modules/projects/projects.service.ts:143–160` — insert creator với
  role `PROJECT_ADMIN` qua `ProjectMemberRepo.assignUserRoleProject()`.
- Board: `src/modules/board/board.service.ts:128–143` — insert creator với role
  `BOARD_ADMIN`; trước đó còn yêu cầu creator phải là member ACTIVE của project
  (lines 97–104).

→ Danh sách members hiển thị ở UI bao gồm creator bình thường, không cần merge
owner từ `projects.userId` vào kết quả query.

## 2. Kiến trúc quyền hiện tại

- Permission check **chỉ dựa vào bảng members**: `permission.repository.ts:45–88`
  (`checkScopedLevel`) join `projectMembers`/`boardMembers` → `rolePermissions`,
  kèm bypass super-admin và system-role (`checkAnyPermission`, lines 106–128).
  Không special-case theo cột owner `projects.userId`.
- Middleware áp dụng: `verifyProjectPermission(...)`, `verifyBoardPermission(...)`
  (`src/common/middlewares/auth.middleware.ts:201–271`), board resolve ngược về
  project nên project-admin có quyền trên board con.
- Bảo vệ owner: không cho remove owner (`projects.service.ts:486–488`), không cho
  hạ role owner (`:416–421`).
- Realtime room dùng cùng cơ chế: `src/modules/realtime/room-permission.service.ts:27–78`.

## 3. Vấn đề phát hiện

| # | Vấn đề | Vị trí | Mức độ |
|---|--------|--------|--------|
| 1 | Tạo project/board + insert member **không nằm trong `$transaction`**. Insert member fail → project mồ côi, owner mất toàn bộ quyền vì permission chỉ check bảng members | `projects.service.ts:113–180`, `board.service.ts:87–156` | 🔴 Cao |
| 2 | **Thiếu unique constraint** `(project_id, user_id)` / `(board_id, user_id)` ở DB — race condition khi add member song song tạo duplicate rows. Dedupe chỉ dựa vào check ứng dụng (`findProjectMember` guard) | `prisma/schema.prisma:279–294, 317–332` | 🟡 Trung bình |
| 3 | **Check quyền không nhất quán ở service-level**: `updateProject/deleteProject` filter cứng `{ id, userId }` (chỉ owner được sửa/xóa), trong khi `getAccessibleProjectsWhere()` dùng OR(owner, members). Hai triết lý trộn lẫn nhau | `projects.repository.ts:24–62, 175–205` | 🟡 Trung bình |
| 4 | Board update/delete chỉ yêu cầu **membership thường** (`checkMemberOfBoard`), mọi BOARD_MEMBER đều sửa/xóa được board nếu router không chặn — dễ sai khi router quên gắn `verifyBoardPermission(UPDATE_BOARD)` | `board.service.ts:168–174, 210–216` | 🟡 Trung bình |
| 5 | Nếu member row của owner bị soft-delete (xóa trực tiếp qua repo), owner mất hết quyền truy cập dù vẫn là owner — không có cơ chế tự phục hồi | `permission.repository.ts:45–88` | 🟢 Thấp |
| 6 | Chưa có **ownership transfer** — chỉ có guard chặn, chưa có endpoint chuyển owner khi creator rời project | Toàn repo | 🟢 Thấp (backlog) |

## 4. Khuyến nghị fix

### #1 — Bọc creation trong transaction (ưu tiên cao nhất)

```ts
return this.prismaService.$transaction(async (tx) => {
  const project = await tx.projects.create({ data: { ... }, include: { ... } });
  await tx.projectMembers.create({
    data: { userId, projectId: project.id, roleId: adminRole.id },
  });
  return project;
});
```

Áp dụng tương tự cho `createBoard()`.

### #2 — Thêm unique constraint

```prisma
model projectMembers {
  @@unique([projectId, userId])
}

model boardMembers {
  @@unique([boardId, userId])
}
```

Tạo migration mới sau khi thêm; lưu ý dọn duplicate rows cũ trước khi apply.

### #3 — Thống nhất nguồn sự thật của quyền

Quyết định: **quyền hạn chỉ dựa trên bảng members** (`PROJECT_ADMIN` = owner hiệu lực).
Bỏ các filter cứng `{ id, userId }` trong `updateProject/deleteProject`, thay bằng
`verifyProjectPermission(UPDATE_PROJECT / DELETE_PROJECT)` như các endpoint khác.
Giữ `projects.userId` chỉ cho mục đích audit.

## 5. Kết luận

Thiết kế "creator = member đầu tiên với role ADMIN, quyền quyết định qua bảng members"
là đúng chuẩn (Jira/Linear/Trello cũng làm vậy). Cần fix ngay #1 và #2 vì ảnh hưởng
trực tiếp đến tính đúng đắn của dữ liệu phân quyền.
