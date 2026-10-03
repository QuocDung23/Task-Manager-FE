# Debug: pagination không quay về trang hợp lệ sau khi xóa

## Kết luận

Bug nằm ở FE, tại state `page` của hai màn hình danh sách:

- Project: `src/components/mainSpace/view-main.tsx`
- Board: `src/components/projects/detail-project.tsx`

Khi xóa item cuối cùng của trang 2, cache và API đã cập nhật `totalPages` từ 2 về 1 nhưng local state `page` vẫn giữ giá trị 2. FE tiếp tục render dữ liệu của trang 2 (mảng rỗng), ẩn pagination vì chỉ còn một trang và hiển thị empty-state `No projects yet` hoặc `No boards yet`. Không còn control nào để người dùng quay lại trang 1.

Đây không phải lỗi delete và cũng không phải BE trả `404` cho page vượt range. Hai API list hiện trả `200`, `data: []`, `pagination.currentPage = 2` và `pagination.totalPages = 1` trong tình huống này.

## Cách tái hiện

Điều kiện: có 13 item, `PAGE_SIZE = 12`.

1. Mở trang 2, lúc này trang 2 có một item.
2. Xóa item cuối cùng.
3. Mutation cập nhật cache, giảm `totalItems` từ 13 xuống 12 và `totalPages` từ 2 xuống 1.
4. State `page` vẫn là 2 nên query/refetch tiếp tục dùng `page=2`.
5. API trả danh sách rỗng vì offset là 12 trong khi chỉ còn 12 item.
6. FE hiển thị empty-state và ẩn pagination do `totalPages > 1` không còn đúng.

Luồng lỗi:

```text
page state = 2
    -> delete item cuối trang 2
    -> cache reducer: totalPages 2 -> 1
    -> invalidate list query
    -> request lại page=2
    -> data=[]; currentPage=2; totalPages=1
    -> render "No projects/boards yet"
    -> pagination bị ẩn
```

## Bằng chứng trong code

### 1. Page state không được reconcile

`ViewMainPage` và `DetailProject` đều khởi tạo:

```ts
const [page, setPage] = useState(1);
```

`setPage(1)` chỉ chạy khi search debounce thay đổi. Không có effect nào kiểm tra `page > pagination.totalPages` sau delete, realtime delete hoặc bất kỳ thay đổi tổng số item nào.

### 2. Delete mutation không thể sửa page state

- `useDeleteProject` gọi `applyProjectDeleted(...)`, sau đó invalidate `projectKeys.all`.
- `useDeleteBoard` gọi `applyBoardDeleted(...)`, sau đó invalidate `boardKeys.all`.

Các hook mutation chỉ quản lý server/cache và không nhận `page`/`setPage`. Vì vậy invalidate chỉ refetch đúng query key hiện tại, tức vẫn là page 2.

### 3. Cache đã giảm total pages đúng nhưng không đổi query key

`project-cache.ts` và `board-cache.ts` đều:

1. Remove item khỏi `old.data`.
2. Giảm `pagination.totalItems`.
3. Tính lại `pagination.totalPages`.

Việc này làm metadata chuyển về một trang, nhưng query key vẫn chứa page 2 và local state của component không thay đổi.

### 4. Empty-state và pagination làm bug bị kẹt

Hai component render empty-state khi `data.length === 0`, không phân biệt:

- Toàn bộ collection thật sự rỗng.
- Search không có kết quả.
- Trang hiện tại đã vượt quá `totalPages`.

Pagination chỉ render khi `totalPage > 1`. Sau delete, nó biến mất ngay khi người dùng đang ở page 2.

### 5. Hành vi BE

`PaginationUtils` tính:

```ts
skip = (page - 1) * limit;
totalPages = Math.ceil(totalRecords / limit);
currentPage = Math.floor(skip / limit) + 1;
```

BE không clamp page request theo `totalPages`, nên request page 2 sau khi tổng số item chỉ còn đủ một trang sẽ hợp lệ về HTTP nhưng trả `data: []`. Khi collection rỗng hoàn toàn, BE có thể trả `totalPages = 0`, trong khi FE đang coi số trang hiển thị tối thiểu là 1. Fix cần normalize trường hợp này.

## Hướng fix đề xuất

Owner của `page` phải chịu trách nhiệm giữ page trong range hợp lệ. Thêm cùng một reconciliation effect vào cả `ViewMainPage` và `DetailProject`, sau khi có `pagination` và trước các early return:

```ts
const totalPage = Math.max(1, pagination?.totalPages ?? 1);

useEffect(() => {
  if (!pagination || page <= totalPage) return;
  setPage(totalPage);
}, [page, pagination, totalPage]);
```

Nên dùng điều kiện `!pagination` thay vì reset theo giá trị fallback trong lúc chưa có response. Điều này tránh tự động quay về page 1 chỉ vì loading hoặc lỗi mạng tạm thời.

Sau patch, luồng đúng là:

```text
page=2 -> delete cuối trang -> totalPages=1
       -> effect phát hiện page > totalPages
       -> setPage(1)
       -> React Query dùng query key page=1
       -> render danh sách còn lại
```

### Tránh nháy empty-state

Effect chạy sau một render, nên có thể xuất hiện một frame empty-state. Có thể chặn riêng trạng thái page out-of-range:

```ts
const isPageOutOfRange = Boolean(pagination && page > totalPage);
```

Sau đó chỉ render empty-state khi:

```tsx
{!isPageOutOfRange && projects.length === 0 && (...)}
```

và tương tự với `boards`. Trong lúc reconcile có thể giữ grid trống hoặc hiển thị loading indicator nhỏ. Không nên hiện thông báo “No projects/boards yet”, vì collection vẫn còn item ở trang trước.

### Đồng bộ trải nghiệm Project và Board

`useProjects` đang dùng `placeholderData: keepPreviousData`, còn `useBoards` chưa dùng. Có thể thêm `placeholderData: keepPreviousData` cho `useBoards` để chuyển trang/reconcile ít nháy hơn. Đây là cải thiện UX, không phải điều kiện bắt buộc để sửa root cause.

## Vì sao không sửa trong mutation hook

Không nên truyền `setPage` vào `useDeleteProject`/`useDeleteBoard` vì:

- Mutation hook không sở hữu state điều hướng của UI.
- Hook không biết filter/search hiện tại và tổng số trang authoritative.
- Delete có thể đến từ realtime, không chỉ thao tác local.
- Reconciliation tại page component xử lý được delete local, realtime delete và dữ liệu thay đổi từ tab khác bằng cùng một invariant: `1 <= page <= max(1, totalPages)`.

## Phạm vi patch dự kiến

1. `src/components/mainSpace/view-main.tsx`
   - Normalize `totalPage` tối thiểu là 1.
   - Thêm reconciliation effect.
   - Không render empty-state khi đang sửa page out-of-range.

2. `src/components/projects/detail-project.tsx`
   - Áp dụng cùng logic cho board pagination.

3. Tùy chọn: `src/features/boards/hooks/useBoards.ts`
   - Thêm `keepPreviousData` để đồng nhất UX với Project.

Không cần sửa `PaginationLayout`: component này chỉ render control và không sở hữu dữ liệu/query state.

## Test cases cần có

1. Có 13 projects, đứng page 2, xóa project duy nhất: tự về page 1 và thấy 12 projects.
2. Có 13 boards, đứng page 2, xóa board duy nhất: tự về page 1 và thấy 12 boards.
3. Có 14 item, xóa một item ở page 2: vẫn ở page 2 vì page 2 còn hợp lệ.
4. Đứng page 3, dữ liệu/realtime làm tổng trang giảm xuống 2: tự về page 2, không bắt buộc về page 1.
5. Xóa item cuối cùng của toàn collection: page được normalize về 1 và empty-state thật được hiển thị.
6. Search làm giảm số trang: logic debounce hiện tại vẫn reset về page 1, không phát sinh request loop.
7. Query lỗi mạng khi đang ở page 2 và chưa có pagination mới: không tự reset page.
8. Delete/realtime event liên tiếp: không có vòng lặp render hoặc refetch vô hạn.

## Tiêu chí hoàn thành

- Không bao giờ hiển thị `Page 2 of 1`.
- Khi `page > max(1, totalPages)`, FE tự chuyển về trang hợp lệ cao nhất.
- Empty-state chỉ xuất hiện khi collection/filter thật sự không có item, không phải do page vượt range.
- Fix hoạt động giống nhau cho Project và Board.
- Build, lint hai file thay đổi và kiểm tra delete ở ranh giới trang đều đạt.
