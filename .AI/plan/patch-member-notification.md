# Notify khi patch role member (project và board)

Ngày: 2026-09-23

Mục tiêu: người bị đổi role nhận một notification trong inbox (và realtime nếu đang online). Plan này chỉ mô tả việc cần làm. Chưa sửa code.

## Kết luận

| Nơi | Patch role | Notify cho member bị đổi |
|---|---|---|
| Project | Đã có `PATCH /project/:projectId/members/:memberId` | Đã có. Type `MEMBER_ROLE_CHANGED` |
| Board | Chưa có route | Chưa có, vì chưa có chỗ gọi |

FE bell không cần loại notification mới. Inbox đọc `title` / `body` từ server và đã nghe `notification:created`.

## Project — đã có

`Manage -Task/BE/src/modules/projects/projects.service.ts`, `updateProjectMember` (khoảng dòng 476–487):

- Recipient: đúng user của membership vừa patch.
- Actor không nhận thư của chính mình. `notification-inbox.service.ts` bỏ `recipientId === actorId`.
- Type `MEMBER_ROLE_CHANGED`, priority `DIRECT`.
- Title: `Your project role changed`.
- Body: `Your role in "<project>" was updated.`
- Context: `projectId`. Bấm chuông mở `/project/:projectId` (`notification-navigation.ts`).
- Dedupe: `project:{projectId}:role:{memberId}:{roleId}:{recipientId}`. Đổi lại đúng role cũ không tạo thư mới.
- Sau khi ghi DB, service emit `notification:created` vào room `user:{recipientId}`.

Không làm lại luồng project. Copy hiện không nói tên role mới (`PROJECT_ADMIN` / `PROJECT_MEMBER`). Có thể bổ sung sau, không chặn feature.

## Board — chưa có

Router board (`board.router.ts`) chỉ có:

- `POST /board/:boardId/members`
- `GET /board/:boardId/members`

Không có `PATCH /board/:boardId/members/:userId/role`. `emitBoardMemberRoleUpdated` có trong `realtime-event.service.ts` nhưng không có caller. `board.service.ts` chỉ notify `BOARD_MEMBER_ADDED` lúc thêm member.

FE đã gọi endpoint chưa tồn tại:

- `src/features/boards/api/board-api.ts` — `PATCH /board/:boardId/members/:userId/role` body `{ roleId }`
- `manage-members-board.tsx` `handleChangeRole` đang gửi tên `BOARD_ADMIN` / `BOARD_MEMBER`, không phải UUID. `GET` member board cũng chỉ trả `roleId`, không trả tên role.

Patch board hiện 404. Notify không bao giờ chạy.

## Phạm vi triển khai

Làm notify đổi role board, theo đúng kiểu project. Không làm remove member board trong plan này (route xoá cũng chưa có).

### 1. BE — route đổi role

Thêm `PATCH /board/:boardId/members/:userId/role`.

- Permission: `UPDATE_ROLE_MEMBER_BOARD`.
- Body: `{ roleId }` là UUID, cùng cách `findRoleById` của project. Role phải là `BOARD_ADMIN` hoặc `BOARD_MEMBER`.
- Không cho hạ owner của board (`board.userId`) khỏi `BOARD_ADMIN`.
- Member phải đang ACTIVE trên board.
- Sau update: `emitBoardMemberRoleUpdated` (hàm đã có).

### 2. BE — inbox cho người bị đổi

Ngay sau update, gọi `notificationInboxService.createForRecipients`:

- `recipientIds`: `[member.userId]`
- `actorId`: người gọi API
- `type`: `BOARD_MEMBER_ROLE_CHANGED` (tách khỏi `MEMBER_ROLE_CHANGED` của project để deep link và copy không lẫn)
- `priority`: `DIRECT`
- `title`: `Your board role changed`
- `body`: gồm tên board và tên role mới, ví dụ `Your role on "<board>" is now Board admin.`
- `projectId` và `boardId`: cả hai. `getNotificationPath` ưu tiên `boardId`, nên chuông mở `/board/:boardId`.
- `data`: `{ roleId, roleName, boardName }`
- `dedupeKey`: `board:{boardId}:role:{userId}:{roleId}:{recipientId}`

Actor tự đổi role của mình thì không có thư. Đúng quy ước inbox hiện tại.

### 3. FE — để request tới được BE

Không thêm UI chuông.

- Map member board lấy được tên role, hoặc resolve UUID từ catalog role, rồi `handleChangeRole` gửi UUID.
- Giữ `boardApi.updateMemberRole` như hiện tại nếu path và body khớp route mới.

Khi BE trả 200, inbox của member cập nhật qua socket sẵn có (`notification-event-handlers.ts`). Member offline vẫn thấy thư khi mở app vì bản ghi nằm trong bảng `notifications`.

## Kiểm tra

1. Admin project đổi role một member: member đó có một thư `MEMBER_ROLE_CHANGED`, chuông tăng, bấm vào ra đúng project. Admin không tự nhận thư.
2. Admin board đổi role một member (UUID hợp lệ): member đó có thư `BOARD_MEMBER_ROLE_CHANGED`, bấm vào ra đúng board.
3. Đổi lại cùng role: không tạo thư thứ hai (dedupe).
4. Gửi tên enum thay vì UUID: 404 role, không tạo thư.
5. User không phải board member, hoặc hạ owner: 403, không tạo thư.
