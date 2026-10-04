# Plan FE: Project invitation và tự rời project/board

Cập nhật: 2026-10-04  
Trạng thái: BE đã có API; FE chưa hoàn tất. Tài liệu này chỉ lập kế hoạch FE, không triển khai BE.

## 1. Mục tiêu và phạm vi

- Mời user vào project tạo `PENDING` invitation. Người được mời nhận trong hộp thư, bấm **Chấp nhận** mới thành project member ACTIVE; có thể **Từ chối**. Admin có thể **Hủy lời mời**.
- Thêm user vào board giữ luồng trực tiếp, nhưng chỉ chọn project member ACTIVE. Pending invite không được xuất hiện trong member count, avatar, board picker hoặc project list của invitee.
- Member tự **Rời project** hoặc **Rời board** ngay, không cần admin duyệt. Project/board owner không thể tự rời; người còn đứng tên board ACTIVE không thể rời project.
- Notification `readAt` chỉ là trạng thái đọc. Invitation `status` từ API là nguồn quyết định có thể accept/decline hay không.
- Giữ mọi thay đổi WIP hiện có ở FE, nhất là nhánh `ref/global-state` và cache/global state đang được chỉnh. Không thay hoặc reset các file dirty để thực hiện plan này.

## 2. BE contract đã có: FE dùng đúng endpoint mới

| API | Quyền gọi | FE cần dùng |
| --- | --- | --- |
| `POST /project/:projectId/invitations` body `{ userId }` | `ADD_MEMBER_PROJECT` | `201`, `ApiResponse<ProjectInvitationResponse>` trạng thái `PENDING`; không thêm member vào cache |
| `GET /project/invitations/me?status=PENDING` | user đã đăng nhập | Inbox của chính user; không cần project membership |
| `POST /project/invitations/:invitationId/accept` | đúng invitee | `200`, `ApiResponse<ProjectMemberResponse>` ACTIVE |
| `POST /project/invitations/:invitationId/decline` | đúng invitee | `200`, invitation `DECLINED` |
| `GET /project/:projectId/invitations?status=PENDING` | `ADD_MEMBER_PROJECT` | Danh sách admin quản lý; FE hiện đã gọi endpoint này |
| `DELETE /project/:projectId/invitations/:invitationId` | `REMOVE_MEMBER_PROJECT` | `200`, invitation `REVOKED` |
| `DELETE /project/:projectId/members/me` | project member ACTIVE | `200`, `ProjectMemberResponse` INACTIVE |
| `DELETE /board/:boardId/members/me` | board member ACTIVE | `200`, `BoardMemberUser` INACTIVE |

`ProjectInvitationResponse` thực tế gồm `id`, `projectId`, `projectName`, `inviteeId`, `inviteeName`, `inviteeEmail`, `invitedById`, `invitedByName`, `role`, `status`, `expiresAt`, `respondedAt`, `createdAt`. Ngày truyền qua HTTP/socket là chuỗi ISO. `status`: `PENDING | ACCEPTED | DECLINED | REVOKED | EXPIRED`.

Notification mời có `type = PROJECT_INVITATION_RECEIVED`, `data.invitationId`, `context.projectId`. Socket event `project:invitation_changed` có envelope `{ eventId, actorId, occurredAt, data: { invitation } }` và được gửi tới user room invitee. Accept còn phát `project:member_added`; leave phát `project:member_removed`/`board:member_removed`, và task bị gỡ assignee phát `task:assignments_updated`.

Route cũ `POST /project/:projectId/members` đã deprecated và **cũng trả invitation**, không còn trả member. FE phải chuyển sang `/invitations`; không giữ consumer nào hiểu kết quả route cũ là member. BE hiện **chưa có** `DELETE /board/:boardId/members/:userId` cho admin; không dùng endpoint này làm self-leave.

HTTP cần xử lý: `401` đăng nhập lại; `403` không đủ quyền/owner không thể rời; `404` scope hoặc membership/invitation không còn; `409` member hoặc invite đã tồn tại, lời mời đã xử lý, hoặc còn sở hữu board khi rời project; `410` invite hết hạn/không còn hiệu lực. Sau `409/410`, refetch invitation để hiển thị trạng thái từ server.

## 3. Hiện trạng FE cần nối tiếp

- `project-api.ts` vẫn có `addMember()` gọi `/members`. `useAddMemberProject.ts` vẫn toast “đã thêm” và có đường `applyProjectMemberAdded`, nên sai với BE mới.
- `ProjectInvitationResponse` trong `features/projects/types` mới có 4 trường. `getPendingInvitations`, `usePendingProjectInvitations` và `projectInvitationKeys.pending` đã có; `AddMemberDialog` đã lọc user có pending invite. **Giữ và mở rộng** những phần này.
- `NotificationCenter` và `getNotificationPath` hiện mở `/project/:projectId` khi bấm notification. Invitee PENDING chưa có quyền vào route đó. Chưa có UI accept/decline.
- `project-event-handlers`/`board-event-handlers` có member events và cache reducer. Chưa có `project:invitation_changed` trong FE contract/handler.
- `MemberListRow` gắn hành động remove với admin; `manage-members-project` có đường tự xóa qua admin API. Luồng leave phải là action riêng, không phụ thuộc `REMOVE_MEMBER_PROJECT`/`REMOVE_MEMBER_BOARD` hoặc luật “last admin” ở UI.
- `boardApi.removeMember`/`useRemoveMemberBoard` đang trỏ tới route admin board chưa tồn tại. Không tái sử dụng nó cho `members/me`.
- `settingProject-main`, `settingBoard-project`, project/board detail và query cache đang có WIP. Chọn điểm đặt action mà member thường vẫn nhìn thấy; không phụ thuộc menu chỉ mở cho owner/admin.

## 4. Thứ tự triển khai FE

### 4.1. Types, API, query keys, hooks

1. Mở rộng `ProjectInvitationResponse` theo DTO BE và tạo type `ProjectInvitationStatus`. Đổi `AddProjectMemberRequest/Response` ở luồng project thành tên invitation rõ nghĩa. Giữ type của board member riêng.
2. Trong `project-api.ts`, thêm `inviteMember`, `getMyInvitations`, `getProjectInvitations(status?)`, `acceptInvitation`, `declineInvitation`, `revokeInvitation`, `leaveProject`. Trong `board-api.ts`, thêm `leaveBoard`. Dùng `ApiResponse<T>` hiện có. Dừng gọi `projectApi.addMember` từ mọi project UI.
3. Mở rộng `projectInvitationKeys` thành `all`, `mine(status?)`, `project(projectId,status?)`. Cập nhật `usePendingProjectInvitations` hiện có để dùng key chung; tạo hooks query/mutation cho invite, accept, decline, revoke, self-leave. Phân biệt toast của invite và add board.
4. Chỉ cập nhật pending invitation cache sau invite/revoke. **Không** gọi `applyProjectMemberAdded`, không tăng `totalMembers`/member count hoặc thêm project cho invitee khi gửi invite. Accept mới invalidate/upsert project list/detail/member queries; tránh tăng count hai lần nếu HTTP và socket đều đến.

### 4.2. UI gửi lời mời và quản lý pending

1. `AddMemberDialog` scope project đổi title, CTA, mô tả và pending spinner thành “Gửi lời mời”; scope board vẫn “Thêm thành viên”. Giữ logic chặn user đã là member/pending; refetch pending sau `409` do tab khác vừa mời.
2. Cập nhật cả `DialogAddMemberProject` và `DialogManageMembersProject` sang hook invite mới. Toast thành công là “Đã gửi lời mời”, không phải “Đã thêm thành viên”.
3. Hiển thị danh sách pending riêng trong khu quản lý project member (tên/email invitee, người mời, hạn, trạng thái), cho người có quyền hủy invite với xác nhận và loading riêng từng row. Member ACTIVE vẫn lấy từ `/members`; pending không trộn vào `MemberListDialog` hay avatar/count.
4. Sau revoke hoặc socket status change, cập nhật/invalidate pending query. Nếu quyền admin không có, không gọi admin invitation list; lỗi `403` không làm hỏng phần member list còn xem được.

### 4.3. Inbox và accept/decline

1. Thêm mục “Lời mời” trong `NotificationCenter`, lấy từ `GET /project/invitations/me` độc lập với filter notification all/unread. Người chưa là project member vẫn xem được. Hỗ trợ loading, empty, retry, pending/accepted/declined/revoked/expired.
2. Notification `PROJECT_INVITATION_RECEIVED` dùng `data.invitationId` để mở đúng lời mời trong khu inbox; **không** điều hướng tới `/project/:projectId` trước accept. Nếu không còn trong danh sách (project bị xóa/đã xử lý), refetch và hiển thị lời mời không còn hiệu lực; không tạo nút thao tác từ notification payload cũ.
3. Chỉ `PENDING` còn trong hạn mới hiện **Chấp nhận/Từ chối**. Disable cả hai khi đang gửi request. `409/410/404` refetch và hiện thông báo phù hợp; không tự coi lỗi là accept thành công. Sau accept refetch project list/member detail rồi cho điều hướng tới project. Sau decline giữ trạng thái đã xử lý trong inbox.
4. Bấm notification/mark read/mark all read chỉ cập nhật notification cache, không đổi invitation status. Lời mời đã đọc vẫn accept được. Socket từ tab khác cập nhật invitation cache; reconnection/focus refetch để đồng bộ khi event bị lỡ.

### 4.4. Tự rời project/board

1. Thêm action “Rời project” và “Rời board” tách khỏi admin remove. Đặt ở project card/detail và board detail/menu sao cho member thường truy cập được. Ẩn/disable cho creator (`project.userId`/`board.userId`), nhưng cho admin không phải creator dùng. Không dựa vào `isLastAdmin` của `MemberListRow` để chặn self-leave.
2. Dialog xác nhận ghi rõ rời project kéo theo board memberships/assignee; rời board chỉ bỏ board membership, vẫn giữ project membership. Nếu có quyền kế thừa từ project (ví dụ `PROJECT_ADMIN`), board có thể còn xem được sau leave; refetch để quyết định điều hướng theo quyền thực tế.
3. `useLeaveProject`: gọi `/members/me`, dùng response `member.id` + `userId` cho reducer removal, xóa/invalidate project detail/list/members, các board/list/task caches thuộc project và điều hướng về `/projects` khi đã mất quyền. `409` nêu cần xóa/chuyển board đang sở hữu; `403` nêu owner không thể rời; `404` refetch và rời trang nếu quyền đã mất.
4. `useLeaveBoard`: gọi `/members/me`, dùng `boardMemberId` + `id` (user ID) cho board reducer. Invalidate board members/detail, project board membership và task assignment caches; nếu `GET /board/:id` còn `200` vì quyền kế thừa thì ở lại và hiển thị vai trò cập nhật, nếu `403/404` thì về project hoặc `/projects`.
5. Tự rời không gọi admin remove endpoint. Không xóa project/board/task trên server. Admin remove board là vấn đề riêng vì BE chưa có route tương ứng; không mở rộng scope plan này để giả vờ nó hoạt động.

### 4.5. Realtime và cache nhất quán

1. Thêm `ProjectInvitationChangedPayload` và `project:invitation_changed` vào `contracts/realtime-events.ts`; đăng ký/cleanup listener ở luồng socket hiện có (`useTaskSocket` + handler riêng hoặc project handler). Dùng `rememberEvent(eventId)` và upsert theo `invitation.id`, không tăng unread count từ invitation event. `notification:created` tiếp tục xử lý unread count riêng.
2. `project:member_added` chỉ phản ánh accept thật. Với current user, cập nhật project list; với admin/member khác, cập nhật member count idempotent. HTTP accept và event cùng đến phải cho cùng kết quả.
3. `project:member_removed` của current user: ngoài member cache còn gỡ project list/detail và board/task caches phụ thuộc; nếu đang mở route đã mất quyền thì điều hướng ra ngoài. `board:member_removed` của current user: xóa board membership cache và refetch quyền, không giả định mất quyền nếu có project role kế thừa.
4. Khi mất quyền, release room refcount và clear dữ liệu scope; không tự join lại room đã bị BE thu hồi. Dùng query invalidation/reconcile khi reconnect/focus. Giữ state WIP trong `src/store` và quy ước query key hiện tại; không dựng song song một global store khác.
5. `task:assignments_updated` đang có handler; kiểm việc assignee vừa rời được gỡ khỏi task UI. Không giảm member count nhiều lần do event trùng hoặc HTTP + socket.

### 4.6. Bản dịch và lỗi

- Thêm vi/en cho gửi lời mời, đã mời, chấp nhận, từ chối, hủy, hết hạn, đã xử lý, rời project/board, owner không thể rời, còn sở hữu board, các toast `409/410/403/404`. Dùng `useT`/`t`, không hardcode chuỗi mới trong UI.
- Giữ toast “Thêm thành viên” cho board direct add; project invite có copy riêng. Loading/disabled và aria label cho từng nút.

## 5. Các file dự kiến

- Contract/API: `src/features/projects/types/index.ts`, `api/project-api.ts`, `utils/project-invitation-query-keys.ts`, hooks invitation mới và `useLeaveProject.ts`; `src/features/boards/api/board-api.ts`, `hooks/useLeaveBoard.ts`.
- UI: `src/components/projects/addMember-dialog.tsx`, `addMember-project.tsx`, `src/components/members/manage-members-project.tsx`, `src/components/notifications/notification-center.tsx`, `src/features/notifications/utils/notification-navigation.ts`, các project/board card/detail/menu hiện có và dialog xác nhận leave.
- Realtime/cache: `src/features/realtime/contracts/realtime-events.ts`, handler/socket registration, `src/features/projects/utils/project-cache.ts`, `src/features/boards/utils/board-cache.ts`, query keys và task cache liên quan.
- Copy: `src/services/i18n/dictionaries/vi.ts`, `en.ts`.

## 6. Kiểm thử chấp nhận FE

1. Invite PENDING xuất hiện ở admin pending list và inbox invitee, nhưng **không** ở project list/member count/board picker của invitee. Route project/board vẫn bị chặn trước accept.
2. Accept một lần mới thấy project; hai tab accept đồng thời chỉ một lần thành công, tab còn lại refetch về ACCEPTED. Decline/revoke/expire không cấp quyền. Notification đã đọc vẫn thao tác được với invitation PENDING.
3. Admin revoke hoặc invite hết hạn khi invitee đang mở inbox: action khóa sau event/refetch; notification cũ không dẫn tới trang project bị chặn. Offline rồi reconnect cũng đồng bộ.
4. Member thường và admin không phải creator tự rời được; creator nhận `403`; người còn sở hữu board nhận `409`; gọi lại sau leave nhận `404`. Project leave mất mọi board membership/assignee; board leave vẫn giữ project membership.
5. Sau leave từ một tab, tab khác và người ở lại nhận event/cache đúng. Nếu còn quyền board kế thừa thì vẫn xem được; nếu mất quyền thì rời trang, không tiếp tục nhận socket scope. HTTP/socket trùng không trừ count hai lần.
6. Board add chỉ nhận project member ACTIVE; board admin remove cũ không được dùng để kiểm self-leave. Kiểm màn hình desktop/mobile, vi/en, loading/error/keyboard; chạy `npm run build` và `npm run lint` trong FE. Chỉ bổ sung test nơi có nguy cơ regression thật ở cache/event mapping.

## 7. Điều kiện hoàn thành

Tất cả project UI gọi `/invitations` để mời; inbox xử lý invitation theo trạng thái BE; self-leave dùng `/members/me`; cache/realtime phản ánh quyền thực tế; toàn bộ tình huống mục 6 đạt. Không yêu cầu sửa BE hoặc deploy trong phạm vi plan FE này.
