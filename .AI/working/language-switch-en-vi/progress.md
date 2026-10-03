# Tiến độ chuyển ngôn ngữ English / Tiếng Việt

Ngày 2026-09-30.

## Đã làm

- Tạo store `mt-locale`, hàm `t()`, hook `useT()` / `useLocale()`, hai dictionary có kiểm tra key bằng TypeScript. Script trong `index.html` đặt `lang` trước khi app render.
- Thêm bộ chọn ngôn ngữ ở layout auth và menu người dùng. Chuyển đổi tức thì và lưu sau reload. Đã giảm tracking cho nhãn tiếng Việt ở sidebar/header.
- Dịch form, validation và toast của login, register, quên/đặt lại mật khẩu, OTP và xác minh tài khoản. Thêm catalog lỗi auth theo HTTP status và xử lý lỗi backend chưa biết bằng thông báo chung khi ở tiếng Việt.
- Định dạng ngày theo locale, lịch `react-day-picker` dùng `date-fns` locale tương ứng.
- Dịch sidebar, khung danh sách dự án, 6 dialog tạo/sửa project/board/list, dialog tạo/xóa task, nhãn status cơ bản, khung notification và các toast literal trong hooks/components.
- Dịch câu activity theo type trong presenter; giữ nguyên tên người, tên nhãn và giá trị người dùng tạo. Timeline subscribe locale để đổi câu/ngày ngay.
- Giữ nguyên dữ liệu người dùng và `title`/`body` notification do backend cung cấp.

## File mới

- `src/services/i18n/types.ts`, `locale-store.ts`, `translate.ts`, `use-locale.ts`, `index.ts`, `dictionaries/en.ts`, `dictionaries/vi.ts`
- `src/components/users/language-switcher.tsx`
- `src/layouts/auth-layout.tsx`
- `.AI/working/language-switch-en-vi/progress.md`

## File đã sửa

- `index.html`, `src/router/index.tsx`, `src/pages/auth/*.tsx`, `src/components/auth/*.tsx`
- `src/components/users/sideBar-user.tsx`, `theme-switcher.tsx`, `profile-header.tsx`
- `src/layouts/sidebar-main-view.tsx`, `header-layout.tsx`, `src/utils/formatDateTime.ts`, `src/components/ui/calendar.tsx`
- `src/lib/error-message.ts`, `auth-error-message.ts`, `member-roles.ts`
- `src/components/mainSpace/view-main.tsx`, `createProject-main.tsx`, `updateProject-main.tsx`
- `src/components/projects/createBoard-project.tsx`, `updateBoard-project.tsx`, `detail-project.tsx`
- `src/components/lists/create-list-dialog.tsx`, `update-list-dialog.tsx`
- `src/components/tasks/create-task-dialog.tsx`, `delete-task-dialog.tsx`, `status-action-badge.tsx`, `task-status-action-picker.tsx`, `task-detail-provider.tsx`
- `src/features/tasks/utils/status-action.ts`, `src/components/notifications/notification-bell.tsx`, `notification-center.tsx`
- `src/features/task-activities/utils/task-activity-presenter.ts`, `src/components/tasks/activity/task-activity-item.tsx`
- Các hook auth, project, board, list, task, tag, user và realtime có toast literal.

## Kiểm tra

- `npm run build`: đạt.
- ESLint trên các file i18n, auth, notification, status, hook và dialog đã sửa: đạt. Lint toàn repo còn 10 lỗi có sẵn ở các file khác.
- `rg` không còn lời gọi `toast.success/error/warning/info("...")` dạng literal trong `src/features`, `src/components`, `src/hooks`.

## Còn lại theo plan

- Kiểm tra trực tiếp trong trình duyệt cả desktop/mobile, dark mode và các flow CRUD khi có phiên đăng nhập và backend khả dụng.

## Rà soát bổ sung 2026-09-30

- Rà JSX bằng TypeScript AST và chuyển các đoạn chữ tĩnh còn sót ở bảng, danh sách, bộ lọc nhãn, thành viên, task detail và sidebar sang dictionary. Rà lại: chỉ còn ký tự `M` của logo trong JSX text; các thuộc tính `placeholder` tĩnh còn lại là dữ liệu ví dụ như email, số điện thoại và mã màu.
- Thêm `src/services/i18n/text.tsx` với `TranslateText` để các đoạn JSX tĩnh tự cập nhật ngay khi đổi locale. Mở rộng `en.ts` và `vi.ts` song song cho toàn bộ key mới.
- Đồng bộ tiêu đề tab trình duyệt với locale trong store; tiêu đề mặc định trước khi JavaScript khởi chạy là `Task Manager`.
- Dịch các nhãn động: số lượng bảng/danh sách/công việc/thành viên, trạng thái chọn người phụ trách, tooltip thêm người, bộ lọc nhãn `ANY`/`ALL`, nút hiện/ẩn mật khẩu, nhãn phân trang và aria-label bỏ phân công.
- Chuyển các hook CRUD còn đọc trực tiếp `response.data.message` sang `getApiErrorMessage`. Locale `vi` dùng catalog theo status hoặc câu lỗi chung; locale `en` vẫn có thể hiển thị câu backend. Chuyển cả lỗi đổi lịch, di chuyển task, tag, thành viên và đổi trạng thái. Các nhánh nhận diện lỗi đặc thù vẫn giữ câu dịch riêng.
- Dịch toast đặt lịch/đổi lịch, thông báo lỗi thành viên bảng và bổ sung chuỗi fallback cho các component ít dùng.
- Khi đổi locale, các form auth/đổi mật khẩu/chỉnh nhãn và 7 form React Hook Form của project/board/list/task xóa lỗi validation đang lưu để không giữ câu của ngôn ngữ cũ; dữ liệu nhập không bị đặt lại. Toast cũ cũng được đóng khi người dùng chọn ngôn ngữ khác.
- `npm run build`: đạt. `git diff --check`: đạt. `npm run lint`: còn các lỗi React hook/fast refresh có sẵn ở repository; đã sửa lỗi dependency mới phát sinh ở `tag-editor-dialog` và vị trí directive trong `ui/sidebar.tsx`.
