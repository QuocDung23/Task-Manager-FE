# Work Log: Pagination delete last item

## Tổng quan
- Feature: Sửa bug pagination không quay về trang hợp lệ sau khi xóa item cuối cùng của trang
- Feature: Sửa bug pagination không cập nhật sau khi tạo project mới (vượt PAGE_SIZE)
- File debug: `FE/.AI/debug/pagination-delete-last-item.md`
- Trạng thái: Hoàn thành

---

## Phần 1: Bug delete — pagination không quay về trang hợp lệ

### Vấn đề
Khi xóa item cuối cùng của trang 2, cache và API đã cập nhật `totalPages` từ 2 về 1 nhưng local state `page` vẫn giữ giá trị 2. FE tiếp tục render dữ liệu của trang 2 (mảng rỗng), ẩn pagination vì chỉ còn một trang và hiển thị empty-state `No projects yet` hoặc `No boards yet`. Không còn control nào để người dùng quay lại trang 1.

### Nguyên nhân
State `page` không được reconcile khi `totalPages` giảm xuống (do delete, realtime delete, hoặc bất kỳ thay đổi nào làm giảm tổng số item). Không có effect nào kiểm tra `page > pagination.totalPages` sau khi dữ liệu thay đổi.

### Hướng fix
Owner của `page` (page component) chịu trách nhiệm giữ page trong range hợp lệ. Thêm reconciliation effect vào cả `ViewMainPage` và `DetailProject`:

1. Normalize `totalPage` tối thiểu là 1: `Math.max(1, pagination?.totalPages ?? 1)`.
2. Thêm effect reconcile: nếu `page > totalPage` thì `setPage(totalPage)`.
3. Không render empty-state khi đang sửa page out-of-range (`isPageOutOfRange`).

### Files sửa (phần 1)
- `FE/src/components/mainSpace/view-main.tsx`
  - Thêm normalize `totalPage = Math.max(1, ...)`.
  - Thêm `isPageOutOfRange` và reconciliation effect.
  - Cập nhật điều kiện render empty-state thành `projects.length === 0 && !isPageOutOfRange`.
- `FE/src/components/projects/detail-project.tsx`
  - Áp dụng tương tự cho board pagination.

---

## Phần 2: Bug create — pagination không cập nhật sau khi tạo project mới

### Vấn đề
Sau khi tạo project mới (khi đã vượt PAGE_SIZE = 12), pagination không tự xuất hiện. Phải refresh trang thì mới thấy pagination.

### Nguyên nhân
`applyProjectCreated()` chỉ dùng `setQueryData` để update cache trực tiếp mà **không gọi `invalidateQueries`**. React Query không biết cache đã thay đổi → không trigger refetch → pagination không cập nhật.

So sánh:
- `useCreateBoard` → có `invalidateQueries` sau `applyBoardCreated` → pagination cập nhật OK
- `useCreateProject` → **không** có `invalidateQueries` sau `applyProjectCreated` → pagination không cập nhật

### Fix
Thêm `invalidateQueries` sau `applyProjectCreated` trong `useCreateProject`.

### Files sửa (phần 2)
- `FE/src/features/projects/hooks/useCreateProject.ts`
  - Thêm `queryClient.invalidateQueries({ queryKey: projectKeys.lists() })` sau khi gọi `applyProjectCreated`.

---

## Phần 3: Đồng bộ UX search/chuyển trang giữa Project và Board

### Vấn đề
Phần search/chuyển trang của Board bị nháy/mất animation so với Project. Khi user search hoặc chuyển trang, danh sách board bị reset trắng và hiển thị loading trong khi Project vẫn giữ danh sách cũ cho đến khi data mới về → animation bị giật.

### Nguyên nhân
- `useProjects` đã dùng `placeholderData: keepPreviousData` (xem `FE/src/features/projects/hooks/useProjects.ts`).
- `useBoards` chưa có `keepPreviousData` → khi queryKey đổi (do `page`/`debouncedSearch` đổi), React Query coi đó là cache miss, hiển thị loading và unmount danh sách cũ → mất animation.

Debug file đã đề cập: "useProjects đang dùng placeholderData: keepPreviousData, còn useBoards chưa dùng. Có thể thêm keepPreviousData: keepPreviousData cho useBoards để chuyển trang/reconcile ít nháy hơn. Đây là cải thiện UX, không phải điều kiện bắt buộc để sửa root cause."

### Fix
Thêm `keepPreviousData` vào `useBoards` để giữ danh sách cũ trong lúc fetch data mới → animation diễn ra mượt như Project.

### Files sửa (phần 3)
- `FE/src/features/boards/hooks/useBoards.ts`
  - Import `keepPreviousData` từ `@tanstack/react-query`.
  - Thêm `placeholderData: keepPreviousData` vào options của `useQuery`.

---

## Phần 4: BE search board không theo từng chữ cái

### Vấn đề
Search project: gõ 1 chữ "d" → match tất cả project có chữ "d" trong name/description.
Search board: phải gõ đúng tên board thì mới có kết quả.

### Nguyên nhân
So sánh 2 repository:

- `projects.repository.ts` (`getAccessibleProjectsWhere`) dùng:
  ```ts
  { name: { contains: name } }
  { description: { contains: name } }
  ```
  → Prisma `contains` = substring match.

- `board.repository.ts` (`getBoards`) dùng:
  ```ts
  name: name
  ```
  → Prisma `equals` = exact match → phải gõ đúng tên mới match.

### Fix
Sửa `getBoards` để substring match cả `name` và `description`, mirror theo project.

### Files sửa (phần 4)
- `Manage -Task/BE/src/modules/board/board.repository.ts`
  - Tách `baseWhere: Prisma.boardsWhereInput` để dùng chung cho `findMany` + `count`.
  - Khi có `name`: gán `baseWhere.OR = [{ name: { contains: name } }, { description: { contains: name } }]`.
  - Bỏ `name: name` (exact-match) khỏi cả 2 where.

---

## Verification
- Lint: Không có lỗi.
- Đã verify nội dung file sau khi sửa.