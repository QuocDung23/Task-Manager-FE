# Sidebar: điều hướng theo workspace và ngữ cảnh

> Trạng thái: đề xuất triển khai  
> Phạm vi: lập kế hoạch UX và kỹ thuật cho sidebar hiện tại; chưa thay đổi code.

## Tóm tắt

Sidebar hiện có logo, một mục `Overview` dẫn tới `/projects`, khu vực tài khoản và footer trống. Vì app đã có danh sách project, trang chi tiết project và trang board, sidebar nên giúp người dùng đi tới những nơi họ thực sự làm việc thay vì hiển thị các mục giả hoặc trùng route.

Đề xuất: dùng sidebar làm **bản đồ workspace**. Người dùng có thể mở danh sách project, đi vào project, rồi chuyển nhanh giữa các board thuộc project đang xem. Khu vực tài khoản tiếp tục nằm cuối sidebar.

## Kết quả mong muốn

- Người dùng luôn tìm được đường về danh sách project.
- Project đang mở và các board liên quan có thể truy cập từ sidebar.
- Có lối tắt tạo project từ khu vực Project.
- Sidebar dùng dữ liệu thật, chỉ hiển thị đích điều hướng đã tồn tại.
- Khi tải, lỗi, danh sách rỗng, thu gọn hoặc mở trên màn hình nhỏ, sidebar vẫn dễ hiểu và dùng được.

## Cấu trúc đề xuất

```text
┌──────────────────────────────┐
│ [M] Task Manager             │  Thương hiệu
│     Workspace                │
├──────────────────────────────┤
│ WORKSPACE          [+]       │  Nút tạo project
│  Projects                   │  /projects
│  ▾ Project đang xem          │  /project/:projectId
│      Board A                │  /board/:boardId
│      Board B                │  /board/:boardId
│  Project khác               │  /project/:projectId
│  Xem tất cả projects        │  /projects
├──────────────────────────────┤
│                              │  Phần nội dung có thể cuộn
├──────────────────────────────┤
│ [avatar] Tài khoản       [⌄] │  UserPage hiện tại
└──────────────────────────────┘
```

Danh sách project là khu vực điều hướng chính. Danh sách board chỉ xuất hiện dưới project đang mở, tránh trộn board từ nhiều project vào cùng một danh sách khó hiểu. `Projects` và `Xem tất cả projects` không cần xuất hiện đồng thời nếu thiết kế cuối cùng chỉ cần một link về `/projects`; chọn một nhãn thống nhất khi triển khai.

## Quy tắc tương tác

### Điều hướng và trạng thái hiện tại

- Mục danh sách project dẫn tới `APP_ROUTES.PROJECT + /:projectId`.
- Board dẫn tới `APP_ROUTES.BOARD + /:boardId`.
- `/projects` có trạng thái active riêng; project và board active theo URL hiện tại.
- Khi đang ở trang board, project cha được mở rộng và board hiện tại được đánh dấu.
- Chọn project khác sẽ mở trang project đó. Chọn board sẽ mở board tương ứng.
- Mỗi link là điều hướng thực (`NavLink`/`Link`), có trạng thái focus và tên truy cập được cho icon-only mode.

### Dữ liệu

- Dùng `useProjects` để lấy danh sách project. Hook hiện hỗ trợ phân trang và tìm theo tên; sidebar chỉ cần lấy một lượng nhỏ phù hợp với chiều cao và giữ link `Xem tất cả` để mở trang đầy đủ.
- Dùng `useProject(projectId)` để lấy thông tin project hiện tại nếu project đó không nằm trong phần danh sách đang hiển thị.
- Dùng `useBoards(projectId, ...)` để lấy board của project đang xem. Chỉ gọi query khi đã có `projectId`.
- Không giả định API sắp xếp theo “gần đây” nếu response chưa cung cấp thứ tự đó. Cho tới khi có tiêu chí sort rõ ràng, gọi nhóm là `Projects`, không gọi `Recent Projects`.
- Dùng lại query cache hiện có khi query key và tham số khớp; tránh tạo một luồng fetch riêng chỉ để dựng sidebar.

### Trạng thái cần thiết

- **Đang tải:** skeleton ngắn cho danh sách, không làm dịch chuyển header/footer.
- **Danh sách rỗng:** giải thích chưa có project và cung cấp nút tạo project.
- **Lỗi tải:** giữ các mục tĩnh dùng được và đưa ra thao tác thử lại cho danh sách bị lỗi.
- **Nhiều project/board:** giới hạn số dòng trong sidebar; phần danh sách cuộn độc lập với header và tài khoản.
- **Project bị xóa hoặc quyền truy cập mất:** cập nhật danh sách qua query invalidation hiện có; nếu URL hiện tại không còn hợp lệ, không giữ item stale như một đích điều hướng.
- **Thu gọn:** ẩn tên nhóm và chữ, giữ biểu tượng có tooltip; danh sách con có thể ẩn khi không còn đủ không gian để chọn chính xác.
- **Mobile:** giữ nhãn và cấu trúc đầy đủ trong drawer hiện có; đóng drawer sau khi người dùng chọn route.

## Phạm vi

### Bao gồm

- Sắp xếp lại sidebar thành header, điều hướng workspace/project, danh sách board theo project đang mở và khu vực tài khoản.
- Trạng thái active theo route hiện có: `/projects`, `/project/:projectId`, `/board/:boardId`.
- Tải project/board bằng hooks hiện có, với loading, empty, error và retry phù hợp.
- Lối tắt tạo project, tái sử dụng luồng tạo project sẵn có nếu component phù hợp.
- Responsive, keyboard navigation, tooltip khi collapsed, bản dịch tiếng Việt và tiếng Anh.

### Chưa bao gồm

- Mục `My Tasks`, `Members`, `Settings`, `Help`, `Documentation` nếu chưa có trang hoặc đích điều hướng tương ứng.
- Search box chỉ có giao diện nhưng không tìm kiếm được. Search toàn cục chỉ lên kế hoạch khi đã xác định phạm vi dữ liệu và hành vi kết quả.
- Badge notification/task với số liệu giả hoặc chưa có nguồn dữ liệu phù hợp.
- Danh sách “recent” nếu chưa có thông tin truy cập gần đây hoặc quy tắc sắp xếp được thống nhất.
- Tạo route mới hoặc thay đổi API chỉ để lấp đầy sidebar.

## Kế hoạch triển khai

### Phase 1 - Cấu trúc và điều hướng cơ bản

1. Rà lại `SidebarMain`, layout dùng sidebar, `UserPage` và các hook/query hiện có để xác định nơi đặt truy vấn và cách xử lý lỗi.
2. Thay nav một mục bằng cấu trúc Workspace/Projects; giữ `APP_ROUTES.MAIN` làm đường về danh sách project.
3. Thêm danh sách project dùng `useProjects`, link từng project tới route detail hiện có.
4. Đánh dấu active theo route; kiểm tra cả trang project và board.
5. Giữ nguyên user menu ở cuối sidebar; không thêm mục footer không có đích dùng được.

### Phase 2 - Điều hướng board theo project

1. Lấy `projectId` hiện tại từ route.
2. Hiển thị project hiện tại và tải boards bằng `useBoards`.
3. Mở rộng project cha khi vào trang project hoặc board; đánh dấu board hiện tại.
4. Thêm loading, empty, lỗi và retry cho board list.

### Phase 3 - Hoàn thiện thao tác và responsive

1. Thêm nút tạo project và nối vào luồng tạo project hiện có.
2. Hoàn thiện collapsed state, tooltip, focus/keyboard và trạng thái mobile drawer.
3. Bổ sung bản dịch cho mọi nhãn, empty state và lỗi trong cả hai locale.
4. Kiểm tra chiều cao danh sách, scroll, tên dài và hành vi khi project/board bị xóa.

## Hướng dẫn triển khai

- Bắt đầu trong `src/layouts/sidebar-main-view.tsx`; chỉ tách component/config riêng nếu phần render và trạng thái dữ liệu đã đủ lớn để cần tái sử dụng hoặc dễ đọc hơn.
- Tận dụng `SidebarGroup`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuSub` và các primitives có sẵn trong `src/components/ui/sidebar.tsx`.
- Không thay đổi animation, token màu hoặc variant/collapse behavior hiện tại nếu không có lỗi trải nghiệm cụ thể cần giải quyết.
- Theo design system: dùng token giao diện, giữ nhất quán một họ icon trong cùng component tree, hỗ trợ reduced motion và không thêm màu hardcode.
- Không đặt component gọi hook trực tiếp trong file config tĩnh; giữ truy vấn trong component/hook phù hợp.

## Tiêu chí chấp nhận

- Sidebar cung cấp điều hướng tới danh sách project, project và board bằng các route đang tồn tại.
- Khi ở board, người dùng nhìn thấy project cha và board active.
- Danh sách dùng dữ liệu API; loading, lỗi, empty và danh sách dài đều có cách xử lý rõ ràng.
- Tạo project có thể bắt đầu từ sidebar và cập nhật danh sách sau khi tạo thành công.
- Không có link trùng chức năng, route placeholder, số badge giả hoặc ô search không hoạt động.
- Sidebar dùng được bằng bàn phím và screen reader cơ bản, ở desktop collapsed và mobile drawer.
- Nhãn được dịch đủ cho tiếng Việt và tiếng Anh; giao diện tương thích light/dark theme.

## Kiểm tra thủ công khi triển khai

1. Mở `/projects`, project detail và board detail; xác nhận active state và quan hệ project/board.
2. Thử loading, project list rỗng, board list rỗng, lỗi tải và retry.
3. Tạo project từ sidebar; xác nhận project mới xuất hiện và mở được.
4. Thử danh sách dài, tên project/board dài, collapsed desktop, mobile drawer và bàn phím.
5. Đổi ngôn ngữ, theme; xác nhận nhãn và màu vẫn đúng.
