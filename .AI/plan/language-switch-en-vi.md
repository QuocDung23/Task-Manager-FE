# Language Switch — English / Tiếng Việt

> Ngày: 2026-09-24
>
> Mục tiêu: người dùng chuyển giao diện giữa English và Tiếng Việt, lựa chọn
> được nhớ sau khi reload, và mọi chữ do frontend sở hữu đổi theo. Dữ liệu
> người dùng tạo (tên project, board, task, comment, tag) giữ nguyên.

---

## 1. Hiện trạng

Toàn bộ UI đang là chuỗi tiếng Anh gắn cứng. Không có thư viện i18n, không có
locale store, `<html lang="en">` cố định trong `index.html`.

| Lớp | Trạng thái | Chi tiết |
|---|---|---|
| Thư viện i18n | Không có | `package.json` không có `i18next` / `react-intl` |
| Persist preference | Không có | Theme đã có mẫu: `mt-theme-mode` + `useSyncExternalStore` trong `src/services/themeColor/theme-store.ts` |
| Switcher | Không có | Chỗ tự nhiên là dropdown user, cạnh `ThemeSwitcher` (`src/components/users/sideBar-user.tsx`) |
| Auth nằm ngoài sidebar | Quan trọng | Login / register / OTP không render `SidebarUser`, nên switcher chỉ ở sidebar thì màn hình chưa đăng nhập không đổi được ngôn ngữ |
| Ngày giờ | Gắn `en-GB` | `src/utils/formatDateTime.ts` gọi `toLocaleString("en-GB", …)` |
| Calendar | Nhận `locale` nhưng không ai truyền | `src/components/ui/calendar.tsx` đã forward `locale` vào `react-day-picker`. `date-fns` đã có trong dependencies, locale `vi` / `en-US` dùng được |
| Activity | FE dựng câu từ type | `src/features/task-activities/utils/task-activity-presenter.ts` — đây là lớp đúng để dịch |
| Status / role | FE sở hữu label | `STATUS_ACTION_META` trong `src/features/tasks/utils/status-action.ts`, `MEMBER_ROLE_LABELS` trong `src/lib/member-roles.ts` |
| Toast thành công / lỗi FE | Rải trong hooks | Ví dụ `useCreateProject`, `useCreateTag`, `useVerifyAccount` |
| Lỗi API | BE message thắng | `getApiErrorMessage()` ưu tiên `response.data.message`. Auth đã map status → câu tiếng Anh trong `src/lib/auth-error-message.ts` |
| Notification title / body | BE ghi vào DB, tiếng Anh | Inbox render `item.title` nguyên văn (`notification-center.tsx`). Toast realtime cũng dùng `notification.title`. User không có cột locale |
| Font | Đủ dấu tiếng Việt | Geist variable đã load `latin-ext` |

Backend **không** đọc `Accept-Language`. User model (`users`) không có field
locale. Inbox và email nằm ngoài phạm vi frontend của plan này.

Một chi tiết dễ gây hiểu nhầm: `task.service.ts` đang gửi **hai** bản copy cho
cùng một sự kiện. Payload socket (`notifyTaskRecipients`) thường là tiếng Việt
(`"Task đã được đổi lịch"`), còn bản ghi inbox là tiếng Anh (`"Task rescheduled"`).
UI chuông đọc inbox, nên chuông đang là tiếng Anh. Plan này không sửa sự lệch
đó; xem mục 9.

---

## 2. Quyết định

Làm một lớp i18n nhỏ, cùng kiểu với theme store. Không thêm `react-i18next`.

Lý do: app chỉ có hai ngôn ngữ, không RTL, không cần plural ICU. Toast và
presenter chạy ngoài render (mutation callback, socket handler), nên hàm `t()`
phải đọc snapshot đồng bộ — đúng việc `getSnapshot()` của theme đang làm. Thêm
framework chỉ để bọc `I18nextProvider` trong khi pattern này đã có.

Dictionary là nguồn chữ. `en.ts` là kiểu gốc. `vi.ts` phải `satisfies typeof en`
để TypeScript bắt key thiếu trước khi merge.

Default là `en` khi chưa có lựa chọn. Không tự theo `navigator.language`: sản
phẩm hiện tại là tiếng Anh, đổi ngầm ở lần mở đầu sẽ làm người đang dùng giật
mình. Chỉ đổi khi người dùng bấm, hoặc khi `localStorage["mt-locale"]` đã là
`"en"` / `"vi"`.

---

## 3. Trong phạm vi / ngoài phạm vi

### Làm trong feature này

- Store + `t()` + hook.
- Gắn `lang` lên `<html>` trước paint.
- Switcher dùng được cả khi đã đăng nhập và khi đang ở màn auth.
- Dịch toàn bộ chữ FE sở hữu: label, nút, placeholder, empty state, `aria-label`,
  toast do FE viết, validation, status, role, câu activity, catalog lỗi FE.
- Ngày giờ và lịch theo locale đang chọn.

### Không làm

- Dịch tên project, board, list, task, comment, tag, bio, email người dùng.
- Dịch `title` / `body` notification đã lưu, email, và câu `message` tự do từ BE
  mà catalog chưa biết.
- Thêm cột locale trên user, không gửi `Accept-Language` ở vòng này.
- Đổi query key của React Query theo ngôn ngữ. Dữ liệu server không phụ thuộc
  locale; dịch là việc lúc render. Gộp locale vào key sẽ refetch thừa và làm
  cache lệch giữa hai tab.

---

## 4. Thiết kế

```
src/services/i18n/
  types.ts                 Locale = "en" | "vi"
  locale-store.ts          cùng khuôn theme-store
  translate.ts             t(key, params?) đọc getSnapshot()
  use-locale.ts            useSyncExternalStore
  dictionaries/
    en.ts
    vi.ts
    index.ts
  index.ts                 public API
```

### Store

- Key: `mt-locale`.
- Giá trị hợp lệ: `"en"` | `"vi"`. Chuỗi khác coi như chưa chọn → `en`.
- `setLocale` ghi `localStorage`, set `document.documentElement.lang`, rồi emit.
- Boot: nếu `document` có sẵn thì set `lang` ngay, giống `applyTheme()` trong
  theme store.
- `index.html`: thêm vài dòng cạnh script theme, đọc `mt-locale` và set `lang`
  trước first paint. Không đổi theme script.

### `t()`

- Key dạng đường dẫn: `"auth.login.title"`.
- Tham số chỉ là thay thế `{name}` trong chuỗi. Không nhét HTML vào dictionary.
- Thiếu key ở runtime: trả về key (để thấy trên UI lúc dev), không throw trong
  production render.
- Gọi được trong hook, trong `onSuccess` của mutation, và trong presenter.
  Component nào cần re-render khi đổi ngôn ngữ thì gọi `useLocale()` (hoặc một
  `useT()` vừa subscribe vừa trả `t`). Gọi `t()` trần trong body render mà
  không subscribe sẽ giữ câu cũ cho đến lần render khác — đây là lỗi dễ gặp,
  review từng PR phải soi.

### Shape dictionary

Nhóm theo bề mặt, không theo file:

`common`, `nav`, `auth`, `project`, `board`, `list`, `task`, `member`,
`notification`, `profile`, `activity`, `status`, `error`.

Tiếng Việt không chia số ít / số nhiều như tiếng Anh. Không dùng hậu tố
`_one` / `_other`. Một key, nhét `{count}` vào câu:

- en: `"{count} projects"`
- vi: `"{count} dự án"`

Tên ngôn ngữ trên switcher **không** đi qua `t()`: luôn hiện `English` và
`Tiếng Việt`. Người dùng phải đọc được tên ngôn ngữ mình muốn chuyển sang.

### Ngày và lịch

- `formatDateTime` nhận locale hiện tại: `en` → `en-GB` (giữ format đang có),
  `vi` → `vi-VN`.
- Calendar của schedule truyền `date-fns` locale `enUS` hoặc `vi` vào prop
  `locale` đã có sẵn. Tháng, thứ trong lịch đổi theo. Không viết lại
  `calendar.tsx` ngoài việc default locale lấy từ store khi caller không truyền.

### Lỗi

Tách hai đường, đừng dịch câu tiếng Anh của BE bằng cách so khớp chuỗi.

1. **Catalog FE** — status và mã mình đã biết (`error-message.ts`,
   `auth-error-message.ts`, các nhánh `toast.error` trong tag/task hooks).
   Đổi các chuỗi này thành key. Auth giữ bảng map theo HTTP status như hiện
   tại; chỉ có câu chữ chuyển vào dictionary. Quy ước đang ghi trong đầu file
   `auth-error-message.ts` vẫn đúng: BE thêm lỗi auth mới thì phải thêm một
   dòng catalog.
2. **Câu BE chưa có trong catalog** — khi locale là `vi`, không hiện nguyên
   câu tiếng Anh. Hiện câu chung đã dịch (`error.unknown`). Locale `en` giữ
   hành vi hiện tại: hiện `response.data.message` nếu có, vì đó là bản tiếng
   Anh người dùng đang thấy.

`getApiErrorMessage` hôm nay trả BE message trước fallback. Phải đảo ưu tiên
khi locale là `vi`: catalog → câu chung đã dịch. Không để một dòng BE lọt ra
giữa form tiếng Việt.

### Activity và status

`presentTaskActivity` giữ `switch (activity.type)`. Mỗi case gọi `t()` với
`{actor}` và tên entity lấy từ metadata. Tên người, tên tag, giá trị from/to
do người dùng đặt thì không dịch. Từ nối và động từ thì dịch.

`STATUS_ACTION_META.label` / `description` và `getMemberRoleLabel` trở thành
hàm đọc locale, không còn hằng chuỗi. Icon và `tone` giữ nguyên.

---

## 5. UX switcher

Một component `LanguageSwitcher`. Hai nơi gắn:

| Nơi | File | Vì sao |
|---|---|---|
| Dropdown user, ngay dưới `ThemeSwitcher` | `sideBar-user.tsx` | Cùng nhóm preference với theme |
| Góc trên màn auth | layout bọc các view trong `src/components/auth/` và page auth | Chưa có sidebar |

Tương tác: một `DropdownMenuItem` mở hai lựa chọn, hoặc một hàng hai nút
`English` | `Tiếng Việt`. Lựa chọn đang active có dấu check. Bấm ngôn ngữ hiện
tại thì không làm gì.

Đổi ngôn ngữ là tức thì, không reload, không gọi API. Cả hai tab cùng origin
không bắt buộc phải đồng bộ ở vòng này (theme cũng không lắng nghe `storage`).
Nếu làm, lắng `window` `storage` trong store là đủ, cùng một chỗ.

Sidebar collapsed (`collapsible="icon"`) vẫn mở được dropdown user như hôm nay,
nên không cần icon riêng trên rail.

### Chữ tiếng Việt trên UI đang siết tracking

Một số label đang `uppercase` + `tracking-[0.18em]` (subtitle `Workspace` trong
`sidebar-main-view.tsx`, eyebrow của `HeaderLayout`). Dấu tiếng Việt trên chữ
hoa giãn tracking dễ bị cắt và xấu. Với locale `vi`, những chỗ đó bỏ
uppercase và giảm tracking. Nội dung dịch vẫn là cùng một key; chỉ class thay
đổi theo locale. Kiểm tra bằng mắt ở phase 1.

Nút và dialog không cố định width theo chữ tiếng Anh. Câu tiếng Việt dài hơn
ở vài chỗ (mô tả status, lỗi auth). Cho phép wrap, không truncate câu lỗi.

---

## 6. Thứ tự triển khai

Mỗi phase là một PR nhỏ, review được. Không gom hết app vào một diff.

### Phase 1 — Nền và chứng minh vòng lặp

Làm xong phase này thì bấm switcher đổi được vài chuỗi, reload vẫn giữ, `lang`
đúng. Chưa đụng business screen.

- Thêm `src/services/i18n/` như mục 4.
- Script `lang` trong `index.html`.
- `LanguageSwitcher` ở dropdown user và màn auth.
- Dictionary chỉ cần `common` + `nav` + `profile`: Overview, Task Manager,
  Workspace, Profile, Logout, Light Mode / Dark Mode.
- `formatDateTime` đọc locale. Một chỗ đang hiện ngày (schedule badge hoặc
  activity detail) để thấy ngày đổi theo, dù câu quanh nó vẫn tiếng Anh đến
  phase sau.
- Calendar nhận locale từ store ở màn schedule.

Chưa dịch form auth trong phase này. Switcher hiện trên auth để vị trí đúng,
nhưng copy login vẫn tiếng Anh cho đến phase 2.

### Phase 2 — Auth

File: `login-view`, `register-view`, `forgotPassword-view`, `resetPassword-view`,
`verifyAccount-view`, `verifyOtp-view`, `InputOtp-form`, `resendOtp-button`,
`useResetPasswordForm`, `auth-error-message.ts`, các toast trong
`useLogin` / `useRegister` / `useSendOtp` / `useVerifyOtp` / `useVerifyAccount` /
`useResetPassword`.

Đây là lần đầu người chưa đăng nhập thấy app tiếng Việt trọn một flow: sai
mật khẩu, OTP, email đã tồn tại, tài khoản khoá.

### Phase 3 — Workspace

Sidebar còn lại, main space, project, board, list, member.

- `sidebar-main-view.tsx`, `header-layout` callers, `view-main`, project card,
  create / update / delete project và board, list dialogs.
- Member: add member, manage members, role badge, empty / permission states.
- Toast create / update / delete / remove member.

### Phase 4 — Task

Dialog tạo / xoá, detail panel, comment, tag, schedule, status picker,
assignee, activity presenter, `status-action.ts`.

Activity là phần dễ sót vì không nằm trong JSX. Sau phase này, mở một task có
đủ loại activity và đọc timeline bằng cả hai ngôn ngữ.

### Phase 5 — Khung notification và lỗi chung

- Chrome của bell và center: filter, empty, “mark as read”, lỗi tải. **Không**
  dịch `item.title` / `item.body`.
- `error-message.ts`, `query-client.ts`, `error-state.tsx`, `error-boundary.tsx`.
- Các toast còn lại (avatar upload, access revoked, tag permission).
- Áp quy tắc mục 4 cho BE message chưa có catalog.

### Xong feature khi

- Không còn chuỗi tiếng Anh do FE viết trên các màn đã liệt kê, trừ tên riêng
  sản phẩm nếu ta cố ý giữ (`Task Manager` có thể giữ nguyên — đó là tên app,
  không dịch).
- `rg` trên `src/components` và `src/features` không còn toast literal mới.
  Cho phép sót trong comment và trong dữ liệu test.
- `vi.ts` typecheck khớp `en.ts`.

---

## 7. Quy ước khi thêm chữ mới

Sau phase 1, chuỗi người dùng đọc không đi thẳng vào JSX hay `toast.*`.

- Thêm key vào `en.ts` và `vi.ts` trong cùng một commit.
- Câu có biến dùng `{token}`, token đặt tên theo danh từ (`{actor}`, `{count}`).
- Không dịch value từ API trừ khi value đó là enum FE sở hữu (`TODO`,
  `PROJECT_ADMIN`, activity `type`).
- Aria-label cũng là chữ người dùng (screen reader). Đưa vào dictionary.

---

## 8. Kiểm thử

Không có test runner trong `package.json`. Kiểm bằng tay trên app đang chạy.
Mỗi phase kiểm phần nó đụng; phase 5 kiểm lại các màn trước không bị tụt về
tiếng Anh.

1. Màn login, chưa từng chọn: UI tiếng Anh, `<html lang="en">`.
2. Chọn Tiếng Việt trên login: form, nút, lỗi submit sai đổi ngay, không reload.
3. Reload: vẫn tiếng Việt. `localStorage["mt-locale"] === "vi"`.
4. Đăng nhập: sidebar, profile, logout, theme switcher đúng ngôn ngữ. Đổi lại
   English từ dropdown, reload, về English.
5. Tạo / sửa / xoá project, board, list: toast và dialog đúng ngôn ngữ.
6. Task detail: status, schedule, comment actions, activity timeline. Tên task
   và tên người giữ nguyên ở cả hai ngôn ngữ.
7. Calendar: tên tháng và thứ đổi. `formatDateTime` đổi định dạng locale.
8. Notification: chrome đổi ngôn ngữ; một item inbox cũ vẫn hiện đúng câu BE
   đã lưu (tiếng Anh). Không kỳ vọng item cũ thành tiếng Việt.
9. Lỗi 403 / 404 đã có catalog: tiếng Việt khi locale `vi`. Một lỗi BE lạ:
   câu chung tiếng Việt, không lộ câu tiếng Anh ở giữa form.
10. Dark mode vẫn đổi độc lập. Đổi ngôn ngữ không đổi theme và ngược lại.
11. Desktop và mobile: auth (switcher không che form), sidebar dropdown, một
    dialog task. Soi label uppercase có dấu ở sidebar và header.
12. Xoá `mt-locale` rồi reload: về English.

---

## 9. Việc backend để sau, không nằm trong các PR trên

Khi cần chuông và email theo ngôn ngữ của từng người:

- Thêm locale trên user, hoặc nhận `Accept-Language` lúc ghi notification.
- Inbox lưu `type` + dữ liệu (`taskName`, `actorName`), FE dựng câu bằng `t()`.
  Bản `title` / `body` hiện tại là câu đã render, đổi ngôn ngữ sau đó không
  sửa được hàng cũ.
- Gộp hai nguồn copy trong `task.service.ts` (socket tiếng Việt, inbox tiếng
  Anh) về một chỗ. Trước khi có locale từng user, đừng tiếp tục viết song song
  hai thứ tiếng cho cùng một sự kiện.
- API lỗi trả mã ổn định (`EMAIL_NOT_REGISTERED`) thay vì câu tiếng Anh. FE
  catalog map mã đó. So khớp câu BE là cách dễ gãy, không làm.

Plan BE viết riêng khi bắt đầu việc đó. Feature switch trên FE hoàn thành mà
không cần đợi BE, với giới hạn đã ghi ở mục 3 và bước kiểm thử số 8.
