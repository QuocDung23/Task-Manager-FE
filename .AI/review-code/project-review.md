# Review code: Project realtime (`923d912` feat: add realtime for projects)

## Tổng quan

Cấu trúc tổng thể ổn — room registry mirror theo đúng pattern board-room có sẵn, reducers được dùng chung cho HTTP mutations và socket events, dedupe/guards của event nhất quán với phần trước. Typecheck pass.

Tuy nhiên phát hiện 1 bug regression nghiêm trọng ở hook thêm thành viên, 1 dead code, và 1 rủi ro đếm đôi `totalMembers`.

## [P1] Thêm member không bao giờ cập nhật members cache (regression)

**Vị trí:** `src/features/projects/hooks/useAddMemberProject.ts`

`projectApi.addMember` trả về `ApiResponse<AddProjectMemberResponse>` với shape:

```ts
{ id, userId, projectId, roleId } // types/index.ts:67
```

Hook cast kết quả này thành `ProjectMemberResponse` rồi gọi `applyProjectMemberAdded`, trong đó có guard:

```ts
if (member.status !== "ACTIVE") return;
```

Do `AddProjectMemberResponse` không có field `status`, guard này **luôn early-return**. Mặt khác, hook chỉ fallback sang `invalidateQueries` khi thiếu `member?.id && member.projectId` — mà cả hai đều có. Kết quả: **không patch cache, cũng không fallback invalidate**. Đây là regression so với hành vi cũ (invalidate members query vô điều kiện) — sau khi thêm member, danh sách bị stale cho đến khi có trigger refetch khác.

Ngay cả khi BE bổ sung `status`, cast này vẫn unsafe: response thiếu `name`/`email`/`avatar`, nên một record một phần có thể bị ghi vào typed members cache.

**Đề xuất:** Một trong hai hướng:

- BE trả về full member DTO cho endpoint add-member.
- FE fallback invalidate bất cứ khi nào payload không phải là `ProjectMemberResponse` hoàn chỉnh.

**Kiểm thử nên bổ sung:**

- Sau khi thêm member, xác nhận danh sách thành viên trên giao diện cập nhật ngay (qua patch hoặc invalidate).
- Xác nhận không ghi record một phần vào cache members.

## [P3] Điều kiện luôn false

**Vị trí:** `src/features/projects/utils/project-cache.ts` — hàm `applyMemberToMembersCache`

```ts
if (member.projectId !== member.projectId) return;
```

So sánh một giá trị với chính nó — luôn false, dead code. Có lẽ ý định là so `member.projectId` với projectId từ context hoặc một field khác.

**Đề xuất:** Xóa nếu không cần thiết, hoặc sửa lại so sánh đúng ý đồ.

## [P2] `totalMembers` có thể đếm đôi/giảm sai cho chính actor

**Vị trí:** các mutation hooks + socket handler cho `project:member_added` / `project:member_removed`

Dedupe bằng `rememberEvent` chỉ áp dụng giữa các socket events với nhau. Khi user A thêm/xóa member:

1. Mutation handler của A gọi `adjustMembersTotal(±1)`.
2. Nếu server broadcast event membership về lại room của A (thiết kế room-broadcast thông thường), socket handler sẽ adjust lần nữa → count trên project detail của A bị tăng/giảm 2 lần cho đến khi refetch.

Mức độ phụ thuộc vào việc BE có echo membership events về actor hay không — cần xác nhận. Nếu có echo, có thể nhớ lại eventId do mutations sinh ra để dedupe, hoặc làm `adjustMembersTotal` có điều kiện dựa trên thay đổi cache thực tế như `applyMemberToMembersCache` đang làm.

**Lưu ý liên quan:** `applyProjectMemberRemoved` vẫn giảm `detail.totalMembers` ngay cả khi `removeMemberFromMembersCache` không tìm thấy gì để xóa (ví dụ cache members tồn tại nhưng stale). `Math.max(0, …)` chỉ chặn giá trị âm chứ không chặn drift.

**Kiểm thử nên bổ sung:**

- Actor thực hiện add/remove member, mô phỏng server echo event về room của actor, xác nhận `totalMembers` không đổi 2 lần.
- Remove một member không có trong cache (cache stale), xác nhận `totalMembers` không drift.

## Notes (mức thấp)

- `useProjectRoom` invalidate `["board-members"]` toàn cục — mỗi lần join/reconcile project room sẽ refetch board-member queries của mọi board thuộc mọi project, không chỉ boards của project hiện tại. Không sai nhưng over-invalidation.
- Các literal keys `["boards", projectId]` / `["board-members"]` khớp với usage hiện tại, nhưng work đang tiến triển (chưa commit) đã giới thiệu `boardKeys` factory; các literal này sẽ silently drift nếu không cập nhật đồng bộ.
- `findProjectInAnyList` trong `project-cache.ts` được export nhưng không nơi nào trong commit này sử dụng.
- Một số file mới thiếu newline cuối file (`useProjectMembers.ts`, `project-cache.ts`, `project-query-keys.ts`, ...).

## Đã xem xét, không flag

- Cách insert vào mọi list page trong `upsertProjectInLists` khớp với convention sẵn có của task-cache. Lưu ý: project mới tạo sẽ xuất hiện ở đầu mọi cached page (kể cả trang 2+), tức duplicate across pages.
