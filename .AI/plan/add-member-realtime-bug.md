# Plan: Fix add-member realtime UI update for inviter

> Ngày 2026-09-04. Phạm vi: `FE`. Bug source: `FE/.AI/debug/add-member-realtime-bug.md`.

## 1. Mục tiêu

Khi actor/inviter thêm member vào project, project card trên trang danh sách projects phải cập nhật ngay avatar stack và tổng số member, dù actor không có cache `projectKeys.members(projectId)`. Hành vi phải đúng cho cả:

- realtime event `project:member_added` từ client khác;
- mutation `useAddMemberProject` thành công;
- event/mutation bị xử lý trùng lặp (idempotent);
- trang project detail vẫn cập nhật như hiện tại.

Không thay đổi BE: BE đã emit đúng event tới `project:{id}` và `user:{actorId}`.

## 2. Root cause cần xử lý

`applyProjectMemberAdded` hiện chỉ gọi `upsertMemberInProjectLists` khi `applyMemberToMembersCache` trả `delta === 1`. Khi actor đang ở projects list page, query `projectKeys.members(projectId)` chưa tồn tại nên callback nhận `old === undefined`, trả `delta = 0`; vì vậy list cache không được patch và `ProjectCard` không re-render.

## 3. Phương án fix được chọn

Sửa `applyProjectMemberAdded` trong `src/features/projects/utils/project-cache.ts`:

1. Giữ nguyên validation member và filter status `ACTIVE`.
2. Gọi `applyMemberToMembersCache` như hiện tại.
3. Chỉ tăng `totalMembers` khi `delta === 1`.
4. **Luôn** gọi `upsertMemberInProjectLists(queryClient, member.projectId, toMemberUser(member))`, không phụ thuộc vào `delta`.

Lý do chọn phương án này:

- xử lý được cả trường hợp members cache chưa tồn tại;
- helper list đã có semantics upsert/dedupe nên an toàn khi mutation response và socket event cùng tới;
- thay đổi tập trung tại cache helper, tự áp dụng cho cả socket handler và mutation `onSuccess`;
- không cần sửa BE, socket routing, hay `ProjectCard`.

Có thể thêm `console.warn` trong `import.meta.env.DEV` cho member invalid nếu codebase đã dùng convention này; không log payload nhạy cảm ở production.

## 4. Các bước triển khai

### Milestone 0 — Xác nhận contract và hiện trạng

Đọc/kiểm tra trước khi sửa:

- `FE/src/features/projects/utils/project-cache.ts`:
  - `applyProjectMemberAdded`;
  - `applyMemberToMembersCache`;
  - `upsertMemberInProjectLists`;
  - `toMemberUser`;
  - query key `projectKeys.lists()`.
- `FE/src/features/realtime/handlers/project-event-handlers.ts` để xác nhận `handleMemberAdded` đã gọi `applyProjectMemberAdded`.
- `FE/src/features/projects/hooks/useAddMemberProject.ts` để xác nhận `onSuccess` dùng cùng helper.
- `FE/src/components/mainSpace/view-main.tsx` và `projectCard-main.tsx` để xác nhận card đọc `project.members` từ projects-list query, không có selector/clone phá reactivity.

Điều kiện pass: list cache member identity tương thích với `toMemberUser(member)`; không phát hiện flow khác cần patch ngoài scope.

### Milestone 1 — Sửa cache reducer

File: `FE/src/features/projects/utils/project-cache.ts`.

- Bỏ việc đặt `upsertMemberInProjectLists` bên trong `if (delta === 1)`.
- Giữ `adjustMembersTotal` trong nhánh `delta === 1` để không tăng count khi duplicate.
- Bảo đảm `upsertMemberInProjectLists` không tự tạo list entry khi cache list chưa tồn tại; chỉ patch các list cache hiện có.
- Bảo đảm member mới được dedupe theo identity hiện có của helper.

Pseudo-flow sau khi sửa:

```ts
const delta = applyMemberToMembersCache(queryClient, member);
if (delta === 1) {
  adjustMembersTotal(queryClient, member.projectId, 1);
}
upsertMemberInProjectLists(queryClient, member.projectId, toMemberUser(member));
```

### Milestone 2 — Kiểm tra các call site

Không đổi logic trong các file sau nếu xác nhận đúng:

- `FE/src/features/realtime/handlers/project-event-handlers.ts` — socket handler tiếp tục đi qua helper chung;
- `FE/src/features/projects/hooks/useAddMemberProject.ts` — mutation `onSuccess` tiếp tục đi qua helper chung.

Kiểm tra đặc biệt: cùng một add-member không làm tăng `totalMembers` hai lần khi HTTP response và realtime event cùng được áp dụng.

### Milestone 3 — Test hồi quy

Bổ sung hoặc cập nhật test cho `project-cache`/realtime handler theo test convention của repo. Tối thiểu cần các case:

1. **Không có members cache, có projects-list cache**: `applyProjectMemberAdded` thêm member vào `project.members` của card.
2. **Có cả hai cache**: members detail và project list cùng được cập nhật.
3. **Member đã tồn tại / duplicate event**: không duplicate member, không tăng total lần hai.
4. **Member không ACTIVE hoặc payload invalid**: không patch list và không tăng count.
5. **Không có projects-list cache**: không tạo dữ liệu list giả, không throw.
6. Mutation `onSuccess` và socket handler cùng dùng helper, nếu test integration hiện có hỗ trợ flow này.

Nếu chưa có test infrastructure cho helper, viết unit test nhỏ nhất có thể quanh `QueryClient` in-memory thay vì thêm framework mới.

### Milestone 4 — Kiểm chứng thủ công

- Mở projects list bằng account A.
- Từ account A add account B vào project.
- Xác nhận socket event tới account A và card cập nhật avatar/count ngay, không reload.
- Mở project detail/member tab để xác nhận members cache vẫn cập nhật.
- Dùng account B xác nhận special case invitee không bị ảnh hưởng.
- Thử event duplicate hoặc thao tác khiến response/event gần như đồng thời.

## 5. Files

### Dự kiến sửa

- `FE/src/features/projects/utils/project-cache.ts` — fix `applyProjectMemberAdded` để luôn patch projects-list cache; có thể thêm test file tương ứng nếu convention yêu cầu.
- Test liên quan tới project cache/realtime — chỉ thêm nếu đã có test suite phù hợp.

### Chỉ đọc/verify, không sửa dự kiến

- `FE/src/features/realtime/handlers/project-event-handlers.ts`
- `FE/src/features/projects/hooks/useAddMemberProject.ts`
- `FE/src/components/mainSpace/view-main.tsx`
- `FE/src/components/mainSpace/projectCard-main.tsx`
- BE emit/recipient logic trong `Manage -Task/BE/...`

## 6. Tiêu chí nghiệm thu

- Actor đang ở projects list page thấy avatar stack và member count cập nhật realtime.
- Actor nhận event thật sự được xử lý bởi UI, không cần invalidate/refetch toàn bộ list.
- Invitee và existing members vẫn giữ hành vi hiện tại.
- Detail members cache và project detail total không bị regression.
- Duplicate response/event không tạo member trùng hoặc count sai.
- Typecheck, lint và test liên quan pass.

## 7. Rủi ro và lưu ý

- Nếu `ProjectMemberUser.id` không cùng identity với `ProjectMemberResponse.id`, helper upsert có thể không dedupe đúng. Trước khi code phải xác minh contract/type; nếu mismatch, cần dùng identity ổn định (`userId`/email) hoặc điều chỉnh mapping, không âm thầm dùng heuristic.
- Không dùng invalidate làm cách sửa chính: nó không giải quyết deterministic cache patch và có thể gây refetch/blink.
- Không sửa role-update flow trong plan này vì project card hiện không hiển thị role.
- `upsertMemberInProjectLists` có thể tạo một re-render khi member đã tồn tại; đây là chi phí chấp nhận được để bảo đảm list cache được đồng bộ an toàn.

## 8. Lệnh kiểm tra dự kiến

Chạy từ `FE` theo scripts thực tế trong `package.json`:

- lint file đã sửa;
- typecheck;
- test unit project-cache/realtime;
- build hoặc test FE liên quan nếu repo yêu cầu.

Nếu Milestone 0 phát hiện `view-main.tsx` clone/selector làm mất reactivity hoặc identity contract không tương thích, dừng implementation hiện tại và tách thay đổi đó thành task riêng trước khi mở rộng scope.
