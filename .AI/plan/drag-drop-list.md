# FE Plan - Drag Drop List Trong Board

## 1. Mục tiêu

Implement drag-drop list trong màn `board detail` của FE để user có thể kéo thả đổi thứ tự các list trong 1 board, sau đó FE gọi đúng API reorder của BE.

Plan này dựa trên BE hiện tại:

- `Manage -Task/BE/src/modules/lists/list.router.ts`
- `Manage -Task/BE/src/modules/lists/list.controller.ts`
- `Manage -Task/BE/src/modules/lists/list.service.ts`
- `Manage -Task/BE/src/modules/lists/list.repository.ts`
- `Manage -Task/BE/src/modules/lists/dtos/requests/reorderList.req.ts`

Và FE hiện tại:

- `FE/src/components/boards/detail-board.tsx`
- `FE/src/components/lists/list-column.tsx`
- `FE/src/features/lists/api/list-api.ts`
- `FE/src/features/lists/hooks/useReoderList.ts`
- `FE/src/features/lists/types/index.ts`

## 2. Contract BE cần bám sát

### 2.1 Endpoint reorder list

```http
PATCH /list/:boardId/reorderList
```

Request body:

```json
{
  "listIds": ["list-id-1", "list-id-2", "list-id-3"]
}
```

Response:

```ts
{
  success: true,
  data: ListResponse[]
}
```

### 2.2 Rule quan trọng từ BE

BE không nhận reorder partial. FE bắt buộc phải gửi **đầy đủ toàn bộ active list ids của board** theo thứ tự mới.

BE đang validate:

- `listIds` phải là array và không rỗng
- không được duplicate id
- tất cả list phải thuộc đúng `boardId`
- số lượng `listIds` phải bằng tổng active lists của board
- BE tự update `order` theo index với step `65536`
- BE trả về danh sách list đã sort lại theo `order asc`

### 2.3 Permission

Route reorder đang dùng permission:

- `MOVE_LIST`

FE chỉ cần handle lỗi từ BE nếu user không có quyền. Nếu FE có permission data sau này thì có thể disable drag-drop sớm.

## 3. Hiện trạng FE

FE đã có sẵn phần lớn nền tảng:

- `listApi.reorder(boardId, data)` đã gọi đúng `PATCH /list/:boardId/reorderList`
- type `ReorderListsRequest = { listIds: string[] }` đã đúng contract
- hook `useReoderList(boardId)` đã có mutation reorder
- `DetailBoard` đang load lists bằng `useLists(boardId, page, limit, debouncedSearch)`
- `DetailBoard` render list ngang bằng `lists.map(...)`
- `ListColumn` là card/list column độc lập, có edit/delete dialog

FE chưa có:

- thư viện drag-drop trong `package.json`
- local state để giữ thứ tự list sau khi kéo
- wrapper DnD quanh vùng list trong `detail-board.tsx`
- sortable item wrapper cho từng `ListColumn`
- optimistic UI/revert khi reorder fail

## 4. Hướng thư viện drag-drop

Khuyến nghị dùng `@dnd-kit` vì nhẹ, phổ biến, hợp React hiện tại và dễ làm sortable horizontal list.

Cần cài:

```bash
cd FE
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Lý do:

- hỗ trợ `DndContext`, `SortableContext`
- hỗ trợ horizontal sorting strategy
- có mouse/touch/keyboard sensors
- dễ khóa việc kéo theo list id
- dễ tạo drag handle để không ảnh hưởng dropdown/edit/delete

## 5. File cần sửa/tạo

## 5.1 Sửa hook reorder

File:

- `FE/src/features/lists/hooks/useReoderList.ts`

Việc cần làm:

- cân nhắc rename typo `useReoderList` thành `useReorderList`
- nếu rename, tạo file mới `useReorderList.ts`
- update import ở nơi dùng hook
- giữ lại file cũ export alias nếu muốn tránh breaking import:

```ts
export { useReorderList as useReoderList } from "./useReorderList";
```

Khuyến nghị mutation:

- không toast success mỗi lần kéo thả vì reorder có thể diễn ra nhiều lần, toast sẽ gây phiền
- vẫn toast error khi fail
- invalidate `["lists", boardId]` sau success để đồng bộ lại từ BE

## 5.2 Tạo sortable list item

File đề xuất:

- `FE/src/components/lists/sortable-list-column.tsx`

Trách nhiệm:

- nhận `list`, `boardId`, `disabled?`
- dùng `useSortable({ id: list.id, disabled })`
- wrap `ListColumn`
- apply `transform`, `transition`, `opacity`, `zIndex`
- truyền drag handle props xuống `ListColumn` nếu muốn chỉ kéo bằng icon/handle

Pseudo shape:

```tsx
type SortableListColumnProps = {
  list: ListResponse;
  boardId: string;
  disabled?: boolean;
};
```

## 5.3 Thêm drag handle vào ListColumn

File:

- `FE/src/components/lists/list-column.tsx`

Việc cần làm:

- thêm optional props:
  - `dragHandleAttributes`
  - `dragHandleListeners`
  - `isDragging`
- thêm icon handle, ví dụ `GripVertical`
- gắn handle ở header, cạnh icon list hoặc cạnh menu
- không gắn listener lên toàn card để tránh xung đột với:
  - dropdown menu
  - edit dialog
  - delete dialog

UX đề xuất:

- khi dragging: giảm opacity, tăng shadow, thêm cursor `grabbing`
- bình thường: handle có cursor `grab`

## 5.4 Sửa DetailBoard để quản lý DnD

File:

- `FE/src/components/boards/detail-board.tsx`

Việc cần làm:

- import từ `@dnd-kit/core`:
  - `DndContext`
  - `PointerSensor`
  - `KeyboardSensor`
  - `useSensor`
  - `useSensors`
  - `closestCenter`
  - type `DragEndEvent`
- import từ `@dnd-kit/sortable`:
  - `SortableContext`
  - `horizontalListSortingStrategy`
  - `arrayMove`
  - `sortableKeyboardCoordinates`
- dùng hook reorder:
  - `const { mutate: reorderLists, isPending } = useReorderList(boardId)`
- tạo local state:
  - `const [orderedLists, setOrderedLists] = useState<ListResponse[]>([])`
- sync local state khi API lists thay đổi:
  - sort theo `order asc`
  - set vào `orderedLists`
- render bằng `orderedLists` thay vì `lists`

Pseudo flow:

```ts
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = orderedLists.findIndex((list) => list.id === active.id);
  const newIndex = orderedLists.findIndex((list) => list.id === over.id);
  if (oldIndex < 0 || newIndex < 0) return;

  const previousLists = orderedLists;
  const nextLists = arrayMove(orderedLists, oldIndex, newIndex);
  setOrderedLists(nextLists);

  reorderLists(
    { listIds: nextLists.map((list) => list.id) },
    {
      onError: () => setOrderedLists(previousLists),
    },
  );
};
```

## 6. Case search/filter cần xử lý cẩn thận

BE reorder yêu cầu gửi toàn bộ active lists của board. Nhưng `DetailBoard` hiện có search `debouncedSearch`.

Nếu đang search, `useLists(..., debouncedSearch)` chỉ trả về một phần list matching search. Khi kéo thả trong trạng thái search, FE sẽ gửi thiếu list ids và BE sẽ reject:

```txt
listIds must contain all active lists of this board (to reorder correctly)
```

Khuyến nghị implement:

- disable drag-drop khi `debouncedSearch` có giá trị
- hiển thị hint nhỏ: `Clear search to reorder lists`
- chỉ cho reorder khi FE đang hiển thị đầy đủ list của board

Alternative nếu muốn reorder vẫn hoạt động khi search:

- cần fetch thêm full active lists riêng không filter
- merge thứ tự mới vào full list
- gửi full `listIds`
- cách này phức tạp hơn, không nên làm ở phase đầu

## 7. Pagination/limit cần lưu ý

`DetailBoard` đang dùng:

```ts
const limit = 50;
```

Vì BE yêu cầu gửi toàn bộ active lists, nếu board có hơn 50 lists thì FE chỉ có 50 list ids và reorder sẽ fail.

Phase đầu có thể giữ `limit = 50` nếu business chắc chắn board không vượt quá 50 lists.

Khuyến nghị tốt hơn:

- tăng limit đủ lớn, ví dụ `limit = 200`
- hoặc bổ sung API/FE mode lấy all lists không phân trang cho board detail
- hoặc đọc `pagination.totalItems`; nếu `totalItems > lists.length` thì disable reorder và báo cần load all lists trước

## 8. Optimistic UI và rollback

Behavior mong muốn:

- khi drop xong, UI đổi thứ tự ngay bằng `setOrderedLists(nextLists)`
- gọi API reorder với toàn bộ `nextLists.map(list => list.id)`
- nếu success:
  - giữ UI
  - invalidate query để lấy order thật từ BE
- nếu fail:
  - rollback về `previousLists`
  - toast error từ hook hoặc local handler

Không nên:

- gọi API liên tục khi drag move
- gọi endpoint update list từng list một
- gửi order number từ FE

## 9. Chi tiết implementation theo bước

## Step 1 - Cài dependency

Trong `FE`:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Verify:

- `FE/package.json` có 3 package mới
- `FE/package-lock.json` được update nếu repo dùng npm lock

## Step 2 - Chuẩn hóa hook reorder

Files:

- `FE/src/features/lists/hooks/useReorderList.ts`
- `FE/src/features/lists/hooks/useReoderList.ts`

Việc làm:

- tạo hook đúng tên `useReorderList`
- alias lại typo cũ nếu cần
- giữ query invalidate `["lists", boardId]`

## Step 3 - Tạo SortableListColumn

File:

- `FE/src/components/lists/sortable-list-column.tsx`

Việc làm:

- dùng `useSortable`
- truyền props drag handle vào `ListColumn`
- xử lý class khi dragging

## Step 4 - Update ListColumn có drag handle

File:

- `FE/src/components/lists/list-column.tsx`

Việc làm:

- thêm props optional cho sortable
- thêm `GripVertical`
- style handle rõ ràng
- đảm bảo dropdown vẫn click được

## Step 5 - Wrap DnD trong DetailBoard

File:

- `FE/src/components/boards/detail-board.tsx`

Việc làm:

- tạo `orderedLists`
- sync từ API lists
- setup sensors
- setup `handleDragEnd`
- wrap list area bằng:

```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={orderedLists.map((list) => list.id)} strategy={horizontalListSortingStrategy}>
    {orderedLists.map((list) => (
      <SortableListColumn key={list.id} list={list} boardId={boardId} disabled={isReorderDisabled} />
    ))}
  </SortableContext>
</DndContext>
```

## Step 6 - Disable reorder khi không đủ điều kiện

Trong `DetailBoard`:

- disable khi đang search:
  - `Boolean(debouncedSearch)`
- disable khi đang mutation:
  - `isPending`
- disable khi có pagination chưa load hết:
  - nếu response có `pagination` và `pagination.totalItems > orderedLists.length`

UI hint đề xuất:

- nếu search đang bật: `Clear search to reorder lists.`
- nếu đang save: `Saving new order...`

## Step 7 - Kiểm thử thủ công

Checklist:

- load board detail thấy lists theo `order asc`
- kéo list A sang vị trí khác, UI đổi ngay
- network gọi `PATCH /list/:boardId/reorderList`
- body gửi đầy đủ `listIds` theo thứ tự mới
- refresh page vẫn giữ đúng thứ tự mới
- kéo khi search đang bật bị disable
- dropdown edit/delete vẫn hoạt động
- BE trả lỗi thì UI rollback về thứ tự cũ

## 10. Acceptance Criteria

Hoàn thành khi:

- user kéo-thả được list ngang trong board detail
- FE gửi đúng endpoint `PATCH /list/:boardId/reorderList`
- request body luôn là `{ listIds: string[] }` đầy đủ theo thứ tự mới
- UI optimistic update và rollback khi lỗi
- không reorder khi đang search/filter partial list
- không làm hỏng create/update/delete list hiện có
- build/lint FE pass

## 11. Rủi ro và note

- BE hiện route reorder dùng `verifyBoardPermission(ListPermissions.MOVE_LIST)`. Tên middleware là board permission nhưng truyền `ListPermissions.MOVE_LIST`; nếu permission seed/role không map đúng, BE có thể reject. FE chỉ nên handle lỗi, không tự sửa contract.
- Nếu board có nhiều hơn `limit` lists, reorder sẽ fail vì FE gửi thiếu id. Cần đảm bảo load full lists hoặc disable reorder khi chưa full.
- `useReoderList` đang sai chính tả. Nên sửa dần bằng alias để tránh import lỗi.
- `List #${list.order + 1}` hiện không thân thiện vì order là step `65536`; sau reorder có thể hiển thị `List #65537`. Nên đổi thành hiển thị index từ FE hoặc bỏ dòng này trong phase polish.
