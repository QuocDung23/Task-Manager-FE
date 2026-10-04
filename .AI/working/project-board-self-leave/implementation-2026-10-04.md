# Tiến độ: Lời mời dự án và tự rời project/board

Ngày: 2026-10-04

## Đã hoàn thành

1. Đổi luồng thêm thành viên project thành gửi lời mời: DTO đầy đủ, API invitation, query keys, hooks mutation và thông báo thành công/lỗi. Không cập nhật member count khi gửi lời mời. Board add vẫn dùng luồng trực tiếp.
2. Bổ sung khu lời mời trong Notification Center, hỗ trợ các trạng thái invitation, accept/decline, lỗi lời mời bị xử lý ở tab khác, hạn dùng và điều hướng sau accept. Notification mời mở inbox theo `invitationId`.
3. Hiển thị lời mời đang chờ riêng trong dialog quản lý thành viên, có xác nhận và thao tác hủy; chỉ người có quyền admin/owner mới gọi danh sách admin. Ngăn thao tác admin remove chính bản thân trong member row.
4. Thêm hành động tự rời project/board, xác nhận tác động, gọi endpoint `/members/me`, dọn/invalidate cache liên quan và quyết định điều hướng board theo quyền thực tế.
5. Thêm socket contract và handler `project:invitation_changed`; đồng bộ cache invitation, project/board membership và quyền sau event. Reconnect refetch lời mời.
6. Bổ sung bản dịch vi/en cho toàn bộ UI và lỗi mới.
7. Chuyển hành động rời khỏi trang chi tiết vào menu của project/board card. Trang danh sách project join room của các card đang hiển thị để nhận `project:member_removed` tức thời; khi current user mất quyền, ngăn room tự join lại, dọn cache và chỉ điều hướng khỏi board thuộc project vừa rời.

## File đã sửa hoặc tạo

- API, types, hooks, cache: `src/features/projects/api/project-api.ts`, `src/features/projects/types/index.ts`, `src/features/projects/hooks/useInviteMemberProject.ts`, `usePendingProjectInvitations.ts`, `useProjectInvitations.ts`, `useLeaveProject.ts`, `src/features/projects/utils/project-invitation-query-keys.ts`, `project-invitation-cache.ts`, `clear-project-access-cache.ts`, `project-cache.ts`, `src/features/boards/api/board-api.ts`, `src/features/boards/hooks/useLeaveBoard.ts`. Xóa hook cũ `useAddMemberProject.ts`.
- UI: `src/components/projects/addMember-dialog.tsx`, `addMember-project.tsx`, `detail-project.tsx`, `settingBoard-project.tsx`, `src/components/members/manage-members-project.tsx`, `member-list-dialog.tsx`, `member-list-row.tsx`, `pending-project-invitations.tsx`, `leave-membership-button.tsx`, `src/components/notifications/notification-center.tsx`, `invitation-inbox.tsx`, `src/components/mainSpace/view-main.tsx`, `settingProject-main.tsx`.
- Realtime và i18n: `src/features/realtime/contracts/realtime-events.ts`, `handlers/project-event-handlers.ts`, `handlers/board-event-handlers.ts`, `hooks/useTaskSocket.ts`, `hooks/useProjectListRooms.ts`, `rooms/project-room-registry.ts`, `rooms/board-room-registry.ts`, `src/features/notifications/utils/notification-navigation.ts`, `src/services/i18n/dictionaries/en.ts`, `vi.ts`.

## Kiểm tra

- `npm run build`: thành công.
- ESLint trên toàn bộ file thay đổi: thành công.
- `git diff --check`: thành công.
- `npm run lint` toàn dự án còn 8 lỗi có sẵn ngoài phạm vi tính năng tại task detail/assignee picker, button, sidebar và session restore. Lỗi lint mới ở inbox đã được sửa.

Chưa kiểm thử tương tác với backend đang chạy hoặc hai tab trình duyệt trong môi trường này.

Yêu cầu bổ sung thông báo cho người mời khi invitee từ chối cần backend tạo inbox row tại `ProjectInvitationService.decline`. Bản vá backend đã chuẩn bị nhưng chưa áp dụng vì backend nằm ngoài workspace FE và yêu cầu quyền ghi chưa được chấp thuận.
