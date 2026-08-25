# Refactor UI — round 3: Self-contained CreateBoard trigger

## Brief

- Anh yêu cầu "btn create giống như createProject" → parity với pattern `CreateProjectDialog` (self-contained, không cần controlled API từ parent).

## Files đã thay đổi

### Mới tạo

- `src/components/projects/createBoardButton-project.tsx` — wrapper mỏng parity với `createProjectButton-main.tsx`. Render `<CreateBoardDialog projectId={projectId} />` 1 lần.

### Refactor

- `src/components/projects/createBoard-project.tsx`
  - Đổi API: từ `{ projectId, open, onOpenChange }` (controlled) → `{ projectId }` (self-managed state nội bộ).
  - Bọc toàn bộ Dialog bằng `<DialogTrigger asChild>` chứa `<motion.button>` pill ngay bên trong (giống `CreateProjectDialog`):
    - `pressHoverStrong` + `pressTapStrong` + `SPRING_PRESS`
    - Icon slot `Plus` strokeWidth={2}
    - `aria-label="New board"`
  - Header, form, footer actions giữ nguyên pattern premium dialog ở round 1.
  - `onOpenChange` kiểm tra `isPending` để không đóng dialog khi đang submit.

- `src/components/projects/detail-project.tsx`
  - Bỏ state `openCreate`.
  - Bỏ import `CreateBoardDialog`, `pressHoverStrong`, `pressTapStrong`, `SPRING_PRESS`, `Plus`.
  - Toolbar trigger giờ là `<CreateBoardButton projectId={projectId} />`.
  - Bỏ mount `<CreateBoardDialog>` ở cuối component (giờ mount 1 lần trong toolbar qua DialogTrigger).

### Bonus — sửa `any` ở 3 hooks (góp ý #3 round 1)

- `src/features/boards/hooks/useCreateBoard.ts` — đổi `onError: (error: any)` → `error: ApiError` với `type ApiError = { response?: { data?: { message?: string } } }`.
- `src/features/boards/hooks/useDeleteBoard.ts` — tương tự.
- `src/features/boards/hooks/useUpdateBoard.ts` — đổi `data: any` trong mutationFn → `data: BoardRequest`. Caller `UpdateBoardDialog` đã pass `BoardRequest` đúng kiểu (kiểm tra round 1).

## Kết quả

- TS: 0 lỗi (toàn project)
- ESLint `--max-warnings 0`: 0 lỗi (toàn scope `src/components/projects` + `src/features/boards/hooks`)
- ReadLints: sạch

## Ghi nhận

- Pattern self-contained đã đồng nhất với `mainSpace` — không còn controlled `open/onOpenChange` rải rác.
- Có thể áp dụng tương tự cho `DialogAddMemberProject` ở `settingBoard-project.tsx` (round sau): hiện vẫn controlled, có thể self-contained nhưng phụ thuộc dropdown trigger nên cần giữ controlled.

---

# Refactor UI — round 4: Fix bug click setting board → nhảy thẳng vào list

## Brief
- Anh báo: "click vào setting của board thì nó kh hiện UI mà nó nhảy thẳng vào list luôn".

## Root cause
- `DropdownMenuTrigger` của Radix UI **không tự `stopPropagation`** sự kiện.
- Trong `detail-project.tsx`, `<Card>` (chứa `<MenuSettingBoard>`) có `onClick={() => navigate(...)}` + `onKeyDown` xử lý Enter/Space.
- Khi user click vào icon `MoreVertical`:
  1. Radix toggle dropdown qua `onPointerDown` (không stop).
  2. `onClick` bubble lên `<Card>` → trigger `navigate()` → nhảy vào board detail.
- Tương tự với keyboard: focus trigger rồi Enter/Space cũng bubble lên → navigate.

## Fix
- **Mới tạo** `src/lib/dropdown-trigger.ts`
  - Export `stopDropdownTriggerPropagation`: 3 handler `onClick` / `onPointerDown` / `onKeyDown` (Enter/Space) đều gọi `e.stopPropagation()`.
  - Có JSDoc giải thích root cause (Radix trigger không tự stop) + cách dùng.
- **`src/components/projects/settingBoard-project.tsx`**
  - Import `stopDropdownTriggerPropagation` từ `@/lib/dropdown-trigger`.
  - Spread `{...stopDropdownTriggerPropagation}` lên trigger button.
  - `settingBoard-project.tsx` đã có sẵn lớp `<div onClick={...} onKeyDown={...} stopPropagation>` bao toàn bộ dropdown → kết hợp 2 lớp phòng thủ (defense in depth).
- **`src/components/mainSpace/settingProject-main.tsx`**
  - Cùng pattern, cùng import — áp dụng phòng ngừa (hiện chưa có bug vì `<Card>` ở `view-main.tsx` không có `onClick`, navigate qua `<Link>` cùng cấp chứ không phải cha).
  - Nếu sau này thêm `onClick` vào Card → bug sẽ không xuất hiện.

## Kết quả
- TS: 0 lỗi (toàn project).
- ESLint: 0 lỗi.
- 2 chỗ dùng cùng helper → DRY, nếu sau này phát hiện thêm edge case (vd `onMouseDown`, `onTouchStart`) chỉ cần sửa 1 file.

## Ghi nhận
- Pattern này có thể áp dụng rộng hơn cho bất kỳ `<DropdownMenuTrigger>` nào nằm trong container có navigation handler (Card có onClick navigate, hoặc Link bao quanh). Hiện tại 2 chỗ đều đã cover.
- Round sau (nếu có): self-contained `DialogAddMemberProject` ở `settingBoard-project.tsx` — hiện vẫn controlled vì cần đóng dropdown trước khi mở dialog. Có thể xài sub-dialog pattern của Radix (`<DropdownMenuSub>` hoặc nested `Dialog` controlled bởi `DropdownMenuItem onSelect`) nhưng trade-off chưa rõ ràng → đợi thêm use case.

---

# Refactor UI — round 5: Shared AddMemberDialog + board-scoped hook

## Brief
- Anh yêu cầu: "board và project đều có phần add member, tôi muốn dùng chung 1 UI nhưng call 2 API riêng".

## Decision
- Tách UI (`AddMemberDialog`) khỏi data layer (mỗi scope 1 hook riêng) → 1 component, 2 API, 2 cache invalidation strategy, 2 error message set.
- Component chung nhận prop `scope: "project" | "board"` để chỉ text khác biệt ("invite to this project" vs "invite to this board").
- Mutation thực hiện qua prop `onAdd: (user) => Promise<unknown>` — caller truyền vào (cho phép mỗi scope tự quản lý cache + toast riêng).

## Files

### Mới tạo
- `src/features/boards/hooks/useAddMemberBoard.ts`
  - `useMutation` gọi `boardApi.addMember(boardId, userId)`.
  - Invalidate: `["board-members", boardId]`, `["boards-members", projectId]`, `["board", boardId]`.
  - Error handling parity `useAddMemberProject`: 409 → "Already in board", 404 → "No valid board or user found.", fallback → "Add member to board fail".
  - Type `ApiError` định nghĩa cục bộ (thay vì `any`) — round 1 suggestion.

- `src/components/projects/addMember-dialog.tsx`
  - UI chung, ~360 dòng. Tách hẳn khỏi data layer.
  - Props: `scope`, `open`, `onOpenChange`, `onAdd`.
  - Internal state: `searchEmail`, `selectedUser`, `isSubmitting` (track submit promise, đóng dialog chỉ khi `onAdd` resolve thành công; nếu reject → giữ dialog mở, reset `isSubmitting`).
  - `SCOPE_COPY` map `scope → { title, description, hint }`.
  - JSDoc kèm 2 ví dụ project/board caller.

- `src/components/projects/addMember-board.tsx`
  - Wrapper mỏng parity `DialogAddMemberProject`. Props: `boardId, projectId, open, onOpenChange`.
  - Render `<AddMemberDialog scope="board" onAdd={(user) => mutateAsync(user.id)} />`.

### Refactor
- `src/components/projects/addMember-project.tsx` (390 dòng → 30 dòng)
  - Trước: Toàn bộ UI + mutation inline.
  - Sau: Wrapper render `<AddMemberDialog scope="project" onAdd={(user) => mutateAsync({ projectId, data: { userId: user.id } })} />`.
  - API `DialogAddMemberProject` giữ nguyên → `settingProject-main.tsx` không cần đổi.

- `src/components/projects/settingBoard-project.tsx`
  - Đổi import `DialogAddMemberProject` → `DialogAddMemberBoard`.
  - Truyền thêm `boardId={board.id}`.

## Bug đồng thời được fix
- Trước: click "Add member" ở board dropdown → gọi `useAddMemberProject` → `POST /project/:id/members` (add vào **project**, không phải board).
- Sau: gọi `useAddMemberBoard` → `POST /board/:id/members` (đúng API board).

## Kết quả
- TS: 0 lỗi (toàn project).
- ESLint `--max-warnings 0`: 0 lỗi.
- Không cần sửa `settingProject-main.tsx` (wrapper giữ API cũ).

## Ghi nhận
- Pattern "UI thuần + mutation qua prop callback" rất phù hợp cho các dialog có cùng UX nhưng backend khác nhau. Có thể áp dụng cho:
  - Edit dialog (vd edit project / edit board nếu sau này muốn share UI).
  - Remove member (project vs board) — round sau nếu cần.
- `SCOPE_COPY` là pattern map enum → string copy, dễ mở rộng (thêm scope = thêm entry, không sửa component).
- Trade-off: `AddMemberDialog` không tự quản lý loading state của mutation — caller phải wrap với hook có `isPending`. Hiện tại dialog tự quản lý qua `isSubmitting` internal state + catch error → vẫn mượt nếu caller dùng `mutateAsync` (throw on error).
