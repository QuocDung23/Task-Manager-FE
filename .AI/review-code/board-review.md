# Review code: Board

## Tổng quan

Phát hiện 2 vấn đề liên quan đến React Query cache của board. Vấn đề thứ nhất làm các thao tác tạo, cập nhật, xóa và reconnect realtime không thể cập nhật danh sách board đang hiển thị. Vấn đề thứ hai có thể tạo cache danh sách thành viên không đầy đủ từ socket event.

## [P1] Query key prefix của danh sách board không khớp

**Vị trí:** `src/features/boards/utils/board-query-keys.ts:18-20`

`boardKeys.lists()` đang trả về:

```ts
["boards", "list"]
```

Trong khi `boardKeys.list(...)` và `useBoards` lưu query theo dạng:

```ts
["boards", projectId, page, limit, name]
```

Vì `"list"` không xuất hiện trong key thực tế của các query danh sách, những lệnh như `findAll` hoặc `invalidateQueries` dùng `boardKeys.lists()` sẽ không tìm thấy query nào.

**Ảnh hưởng:**

- Tạo, cập nhật hoặc xóa board không refresh/patch được danh sách board đang hiển thị.
- Khi kết nối lại project room, cache danh sách board không được invalidate như mong đợi.
- Giao diện có thể tiếp tục hiển thị dữ liệu cũ cho đến khi có một lần refetch khác.

**Đề xuất:** Chuẩn hóa query key để key prefix và key danh sách có cùng cấu trúc. Ví dụ, thêm `"list"` vào `boardKeys.list(...)`, hoặc đổi `boardKeys.lists()` thành prefix thực sự dùng chung với toàn bộ list query. Sau khi sửa, cần kiểm tra tất cả nơi đang đọc/ghi cache để tránh ảnh hưởng tới query detail.

**Kiểm thử nên bổ sung:**

- Xác nhận `queryClient.getQueryCache().findAll({ queryKey: boardKeys.lists() })` tìm được các query tạo bởi `boardKeys.list(...)`.
- Xác nhận create/update/delete board cập nhật hoặc invalidate danh sách hiện tại.
- Xác nhận reconnect project room kích hoạt refetch danh sách board.

## [P2] Socket event có thể tạo cache thành viên không đầy đủ

**Vị trí:** `src/features/boards/utils/board-cache.ts:157-159`

Trong `mutateMembersCache`, đoạn code sau coi cache chưa tồn tại như một danh sách rỗng:

```ts
const current = old ?? [];
const next = mutate(current);
```

Nếu event `board:member_added` đến trước khi danh sách thành viên của board được fetch, code sẽ tạo một cache thành công chỉ chứa thành viên vừa được thêm. Do hook thành viên có `staleTime` 60 giây, khi người dùng mở board sau đó, React Query có thể xem cache này là còn mới và không gọi API. Kết quả là giao diện chỉ hiển thị một phần danh sách thành viên.

**Đề xuất:** Không tạo cache thành viên mới từ event khi cache chưa tồn tại. Callback nên giữ `undefined` nếu `old` chưa có; socket event chỉ patch dữ liệu khi đã có một danh sách đầy đủ từ API. Có thể invalidate query tương ứng để lần mở tiếp theo fetch dữ liệu hoàn chỉnh.

**Kiểm thử nên bổ sung:**

- Khi chưa có member cache, nhận `board:member_added` không được tạo danh sách chỉ chứa member mới.
- Khi member cache đã tồn tại, event add/update/remove vẫn patch đúng dữ liệu.
- Sau event đến trước lần fetch đầu tiên, mở board phải gọi API và hiển thị đầy đủ thành viên.

---

## Review bổ sung: stale cache khi cập nhật board và reconnect

Phát hiện thêm 2 vấn đề có thể khiến dữ liệu trên lưới board bị cũ. Cả hai đều có mức ưu tiên **P2** và nên được xử lý trước khi xem thay đổi hiện tại là hoàn chỉnh.

## [P2] Cập nhật các board đã cache ở trang lớn hơn 1

**Vị trí:** `src/features/boards/utils/board-cache.ts:108-110`

Khi một board ở trang 2 trở đi được chỉnh sửa hoặc nhận event `board:updated`, `applyBoardUpdated` gọi helper cập nhật danh sách cache. Tuy nhiên, điều kiện `return` sớm tại đây bỏ qua mọi list query có số trang khác 1.

Do update hook và socket handler không invalidate danh sách board sau đó, board ở các trang sau sẽ tiếp tục hiển thị dữ liệu cũ cho đến khi có một lần refetch không liên quan.

**Ảnh hưởng:**

- Board vừa chỉnh sửa ở trang 2 trở đi không được cập nhật ngay trên giao diện.
- Event realtime `board:updated` không đồng bộ được những board nằm ngoài trang đầu tiên.
- Người dùng có thể thấy dữ liệu cũ trong thời gian dài nếu không có hành động khác kích hoạt refetch.

**Đề xuất:** Khi xử lý cập nhật board, duyệt và patch tất cả list query đã cache có chứa `boardId`, không giới hạn ở trang 1. Nếu không thể xác định hoặc patch chính xác, cần invalidate các list query liên quan sau update/socket event.

**Kiểm thử nên bổ sung:**

- Cache sẵn trang 1 và trang 2, sau đó gọi `applyBoardUpdated` cho một board ở trang 2 và xác nhận row tương ứng được cập nhật.
- Xác nhận board không liên quan ở các trang khác không bị thay đổi.
- Xác nhận event `board:updated` cập nhật giao diện ở mọi trang đã cache mà không cần refetch ngoài ý muốn.

## [P2] Reconnect đang invalidate sai query key của thành viên board

**Vị trí:** `src/features/realtime/hooks/useProjectRoom.ts:35-37`

Khi reconcile project room sau reconnect, code hiện invalidate:

```ts
boardKeys.membersByProject(projectId)
// ["boards-members", projectId]
```

Tuy nhiên, dữ liệu thành viên được `useBoardsMembers` sử dụng để hiển thị avatar và số lượng thành viên trên lưới board lại được cache theo từng board:

```ts
boardKeys.members(board.id)
// ["board-members", boardId]
```

Hai query key này không khớp nhau. Vì vậy, nếu client bỏ lỡ các event `board:member_*` trong lúc mất kết nối, quá trình reconnect sẽ không refetch những member query thực tế đang được giao diện sử dụng.

**Ảnh hưởng:**

- Avatar và số lượng thành viên trên board có thể tiếp tục hiển thị dữ liệu cũ sau reconnect.
- Những thay đổi thành viên bị bỏ lỡ trong lúc offline không được reconcile.

**Đề xuất:** Invalidate các query có prefix `boardKeys.members(...)` thực tế, chẳng hạn bằng một prefix chung dành cho toàn bộ member query, hoặc lấy danh sách board thuộc project và invalidate từng `boardKeys.members(boardId)`. Query-key factory nên có cấu trúc nhất quán để có thể invalidate theo prefix mà không ảnh hưởng các cache không liên quan.

**Kiểm thử nên bổ sung:**

- Cache member query cho nhiều board trong một project, chạy reconcile và xác nhận các query đó đều được invalidate/refetch.
- Xác nhận member query của project khác không bị invalidate ngoài ý muốn.
- Mô phỏng bỏ lỡ event `board:member_added`, sau đó reconnect và xác nhận avatar/số lượng thành viên được đồng bộ lại từ API.

---

## Review bổ sung: migration query key + optimistic cache từ response của server

Typecheck (`tsc -b`) pass. Toàn bộ raw string query key đã migrate sang `boardKeys`, không còn literal `"board-members"` / `["boards", projectId]` sót lại trong `src`. Phát hiện thêm các vấn đề sau:

## [P2] `useUpdateBoard` mất fallback invalidate danh sách

**Vị trí:** `src/features/boards/hooks/useUpdateBoard.ts`

Code cũ luôn invalidate `["boards", projectId]`. Code mới chỉ cập nhật list cache qua `applyBoardUpdated`, hàm này chỉ chạy khi `response?.data` là `BoardResponse` đầy đủ. Nếu PATCH trả về body rỗng (điều chưa thể đảm bảo vì các endpoint sibling cho member-role vẫn đang chờ BE Phase 3), list cache sẽ giữ name/description cũ vô thời hạn — không có fallback invalidate nào.

`useCreateBoard` xử lý đúng bằng cách invalidate `boardKeys.lists()` vô điều kiện sau khi chạy reducer. Nên làm tương tự tại đây khi `board` là undefined:

```ts
if (board) {
  applyBoardUpdated(queryClient, projectId, board);
} else {
  void queryClient.invalidateQueries({ queryKey: boardKeys.lists() });
}
```

## [P3] Member DTO một phần khiến cache bị stale âm thầm trong hook add/role

**Vị trí:** `src/features/boards/hooks/useAddMemberBoard.ts`, `src/features/boards/hooks/useUpdateBoardMemberRole.ts`

Cả hai hook chỉ gate trên `if (member)`. Nhưng `applyBoardMemberAdded` / `applyBoardMemberRoleUpdated` yêu cầu `boardMemberId`, `id`, `roleId`; nếu thiếu bất kỳ trường nào thì dev-warn và return **mà không mutate**. Khi đó không nhánh nào invalidate, nên members cache bị stale cho đến khi hết `staleTime` 60 giây hoặc có trigger khác.

`useRemoveMemberBoard` xử lý đúng — check `member?.boardMemberId` trước khi đi vào patch path và fallback sang invalidation. Nên áp dụng pattern này cho cả hai hook trên.

Mức độ nghiêm trọng phụ thuộc vào việc BE có đảm bảo trả về đầy đủ `BoardMemberUser` trong các response này hay không; nếu có thì đây chỉ là sự thiếu nhất quán phòng thủ.

## [Info] Các thay đổi hành vi cần lưu ý

- Mutations giờ tin vào DTO trong response của server để patch cache optimistically thay vì refetch. Đây là chủ đích và các reducer trông idempotent, nhưng tính đúng đắn giờ phụ thuộc vào response shape khớp với `BoardResponse`/`BoardMemberUser` — cần xác nhận với BE trước khi FE ship trước các endpoint Phase 3 (`removeMember`, `updateMemberRole` sẽ 404 cho đến lúc đó, comment trong code đã ghi nhận).
- `applyBoardCreated` fabricate một entry detail-cache `{ success: true, data: board }` qua cast khi chưa tồn tại. Nếu `ApiResponse` bổ sung required fields sau này, cast này sẽ che giấu drift; cân nhắc dựng qua helper typecheck theo shape thật.

## [Minor] Thiếu xuống dòng cuối file

`src/features/boards/hooks/useCreateBoard.ts` đang thiếu newline ở cuối file (`\ No newline at end of file`).

## Đã xác nhận đúng

Fix reconcile trong `useProjectRoom` (thu thập `boardId` từ list cache của project rồi invalidate từng `boardKeys.members(boardId)`) là chính xác — filter `board.projectId === projectId` tránh nhiễm chéo project do dùng chung list cache.
