# Plan: Global state cho Project / Board

> **Ngày:** 2026-10-03
> **Nhánh:** `ref/global-state`
> **Trạng thái:** Đã triển khai theo yêu cầu ngày 2026-10-03.
> **Phạm vi:** State UI cho search project/board/list, phân trang project/board
> và dialog create project/board.

## 1. Hiện trạng

- Dữ liệu project/board từ API được quản lý bằng TanStack Query qua
  `useProjects` / `useBoards`; mutation và cache update đã có trong các hook
  `useCreateProject` / `useCreateBoard` cùng cache utilities.
- Search, debounce và pagination của danh sách project đang là state cục bộ
  trong `src/components/mainSpace/view-main.tsx`.
- Search, debounce và pagination của danh sách board đang là state cục bộ
  trong `src/components/projects/detail-project.tsx`.
- Trạng thái mở dialog create project/board đang nằm cục bộ trong
  `src/components/mainSpace/createProject-main.tsx` và
  `src/components/projects/createBoard-project.tsx`.
- Zustand đã có trong dependencies nhưng hiện chưa được dùng cho feature này.
- Logout hiện gọi `queryClient.clear()` trong `src/features/auth/hooks/useLogout.ts`;
  global UI state mới cần có reset riêng.

## 2. Mục tiêu

1. Có một nơi quản lý state giao diện project/board, thay vì giữ các phần state
   này rải rác trong page component.
2. Giữ state danh sách board riêng theo `projectId`, tránh lẫn search/page giữa
   các project.
3. Cho phép quản lý tập trung trạng thái mở create dialog.
4. Giữ TanStack Query làm nguồn chuẩn duy nhất cho dữ liệu server, cache,
   mutation và đồng bộ realtime.
5. Reset state UI liên quan khi đăng xuất.

## 3. Ranh giới state

### Đưa vào Zustand

- Project list: search text, debounced search text, page hiện tại.
- Board list theo `projectId`: search text, debounced search text, page hiện tại.
- List search theo `boardId`: search text và debounced search text.
- Trạng thái mở create project dialog.
- `projectId` đang mở create board dialog (null nếu không có dialog mở).

### Giữ cục bộ trong component/dialog

- Giá trị form create, validation, dirty/touched state của React Hook Form.
- State menu/dialog cài đặt riêng của từng card.
- Search thành viên trong dialog add member.
- Filter task, drag-and-drop và state tương tác riêng của board detail.

### Tiếp tục thuộc TanStack Query

- Danh sách, detail, member data của project/board từ server.
- Mutation pending/error/success và cập nhật cache sau create/update/delete.
- Cache reconciliation từ realtime events.

Không sao chép project/board response vào Zustand để tránh hai nguồn dữ liệu
cùng có thể lệch nhau.

## 4. Thiết kế dự kiến

### 4.1. Store

Tạo global store tại `src/store/workspace-ui-store.ts`, dùng Zustand. Store
này quản lý UI state dùng chung cho project/board; dữ liệu server vẫn thuộc
TanStack Query.

- State project list giữ độc lập.
- State board list là map theo `projectId`.
- State search list là map theo `boardId`.
- Actions cập nhật search sẽ reset page về 1.
- Debounced search được commit sau 500 ms bằng effect/hook ở UI layer; không
  đặt timer trong store.
- Actions dialog mở/đóng được điều khiển từ Zustand; create board dialog phải
  gắn với đúng `projectId`.
- Có action reset toàn bộ UI state để dùng ở logout.

### 4.2. Tích hợp màn danh sách

- Chuyển `view-main.tsx` sang đọc/ghi project search và page từ store.
- Chuyển `detail-project.tsx` sang đọc/ghi board search/page theo `projectId`.
- Chuyển `detail-board.tsx` sang đọc/ghi list search theo `boardId`.
- Giữ debounce 500 ms, reset page khi search đổi, giữ xử lý page vượt tổng số
  trang và scroll về đầu danh sách khi đổi page.
- `useProjects` / `useBoards` tiếp tục nhận các tham số query như hiện tại.

### 4.3. Tích hợp create dialog

- Chuyển open state của `createProject-main.tsx` vào store.
- Chuyển open state của `createBoard-project.tsx` vào store, định danh theo
  project hiện tại.
- Giữ form state trong React Hook Form.
- Sau create thành công: reset form, đóng dialog và tiếp tục dùng cache update /
  invalidation đang có.
- Khi mutation đang pending, giữ nguyên quy tắc hiện tại: không cho đóng dialog.

### 4.4. Logout lifecycle

- Reset store trong luồng logout hiện có, cùng lúc clear TanStack Query cache.
- Không persist store vào localStorage; state chỉ tồn tại trong phiên ứng dụng.

## 5. File dự kiến

| File | Thay đổi |
|---|---|
| `src/store/workspace-ui-store.ts` | Mới: Zustand store cho list UI state và create dialogs |
| `src/hooks/useDebouncedSearch.ts` | Mới: debounce dùng chung, hỗ trợ scope theo project |
| `src/components/mainSpace/view-main.tsx` | Đọc/ghi project search/page từ store |
| `src/components/projects/detail-project.tsx` | Đọc/ghi board search/page theo project từ store |
| `src/components/boards/detail-board.tsx` | Đọc/ghi list search theo board từ store |
| `src/components/mainSpace/createProject-main.tsx` | Điều khiển dialog create project từ store |
| `src/components/projects/createBoard-project.tsx` | Điều khiển dialog create board từ store |
| `src/features/boards/hooks/useBoards.ts` | Chỉ dùng placeholder data khi query vẫn thuộc cùng project |
| `src/features/auth/hooks/useLogout.ts` | Reset workspace UI store khi logout |

## 6. Rà soát sau khi triển khai

- Project search vẫn debounce đúng 500 ms và đổi search luôn đưa page về 1.
- Board search/page của project A không ảnh hưởng project B.
- List search của board A không ảnh hưởng board B.
- Điều hướng rời rồi quay lại danh sách giữ state trong phiên hiện tại.
- Page out-of-range sau cache/server update được đưa về page hợp lệ.
- Create dialog đóng/reset đúng sau thành công; không tự đóng khi request đang
  pending; board dialog luôn thuộc đúng project.
- Logout xóa search/page/dialog state cùng với Query cache.
- Realtime và các mutation hiện tại tiếp tục cập nhật Query cache, không ghi dữ
  liệu server vào Zustand.

## 7. Ngoài phạm vi

- Chuyển search member, filter task, menu cài đặt, form state hoặc drag-and-drop
  state thành global state.
- Thay API, thay cache strategy hoặc viết lại realtime handlers.
- Persist search/page/dialog state qua lần tải lại trang.

Plan được user duyệt bằng yêu cầu triển khai ngày 2026-10-03.
