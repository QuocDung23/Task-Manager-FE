# Review: regression realtime notification

> Đối chiếu ngày 2026-08-25 trên hai codebase `FE` và `Manage -Task/BE`.
>
> Phạm vi: tương thích event notification cũ/mới và tính nhất quán của cache
> danh sách notification đã lọc theo trạng thái unread.

## Kết luận

Cả hai nhận xét từ reviewer đều đúng và là lỗi chức năng:

- **P2:** FE đã bỏ listener `notification:new` trong khi BE vẫn còn emitter đang chạy. Một số task notification không có event thay thế nên người nhận online không thấy toast realtime.
- **P3:** Handler read-state chỉ đổi `readAt` trên item nhưng không loại item đã đọc khỏi cache query `filter = "unread"`. Lỗi xảy ra cho cả mark-one-read và mark-all-read từ tab/session khác.

Hai lỗi độc lập nhưng cùng xuất phát từ việc migration notification v1 sang inbox v2 chưa hoàn tất ở toàn bộ producer và consumer.

## Findings

### [P2] Khôi phục listener cho event legacy `notification:new`

**Files liên quan:**

- `FE/src/features/realtime/hooks/useTaskSocket.ts:153-163`
- `FE/src/features/realtime/contracts/realtime-events.ts:256-261`
- `Manage -Task/BE/src/modules/tasks/task.service.ts:819-858`
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts:562-564`

Contract FE và BE vẫn khai báo `notification:new`, nhưng patch đã xóa toàn bộ `socket.on`/`socket.off` của event này khỏi `registerTaskEventHandlers`.

BE chưa migrate hoàn toàn sang inbox notification. Trong `TaskService.setTaskSchedule`:

- Nhánh `RESCHEDULED` gọi cả `notifyTaskRecipients(...)` và `notificationInboxService.createForRecipients(...)`.
- Nhánh `SCHEDULED` chỉ gọi `notifyTaskRecipients(...)`.
- `notifyTaskRecipients(...)` cuối cùng emit event legacy `notification:new`.

Vì nhánh đặt lịch lần đầu chưa tạo inbox row và chưa emit `notification:created`, việc bỏ listener legacy làm connected assignee không nhận được notification/toast realtime. Event không được bù bằng handler mới.

**Hướng sửa đề xuất:**

Khôi phục handler legacy trong `registerTaskEventHandlers` và giữ lifecycle đăng ký/hủy đăng ký đối xứng:

```ts
const handleLegacyNotification: ServerToClientEvents["notification:new"] = (
  payload,
) => {
  if (!payload.type.startsWith("TASK_")) return;
  toast(payload.title, { description: payload.body });
};

socket.on("notification:new", handleLegacyNotification);

return () => {
  // Các socket.off hiện có...
  socket.off("notification:new", handleLegacyNotification);
};
```

Không dùng anonymous callback trực tiếp trong `on`/`off`, vì `off` cần đúng function reference để cleanup listener.

Listener legacy chỉ nên hiển thị notification realtime; không tự chèn payload này vào inbox cache vì payload không có inbox `id`, `readAt`, `priority`, `createdAt` và không đại diện cho một DB row.

**Lưu ý duplicate:**

Nhánh reschedule hiện emit cả legacy và inbox event. `notification:created` chỉ toast với priority `URGENT` hoặc `DIRECT`, trong khi notification reschedule được tạo với priority `NORMAL`; vì vậy khôi phục legacy listener hiện không tạo hai toast từ hai handler. Khi thay đổi priority hoặc toast policy, cần có test chống duplicate.

**Điều kiện để xóa listener legacy trong tương lai:**

Chỉ xóa khi:

1. Không còn call site nào emit `notification:new` ở BE.
2. Mọi notification cần persistence đều đi qua `notificationInboxService`.
3. Các luồng không cần persistence đã có event thay thế rõ ràng.
4. Contract `notification:new` được xóa đồng thời ở cả FE và BE.
5. Test schedule, reschedule, due-soon, overdue và unlock xác nhận recipient online vẫn nhận realtime notification.

### [P3] Loại item đã đọc khỏi cache danh sách unread

**Files liên quan:**

- `FE/src/features/realtime/handlers/notification-event-handlers.ts:69-131`
- `FE/src/features/notifications/utils/notification-query-keys.ts:3-7`

Notification list có hai query key riêng:

```ts
["notifications", "list", "all"]
["notifications", "list", "unread"]
```

Nhưng helper `updateLists` dùng `setQueriesData` cho toàn bộ list cache mà callback không biết cache hiện tại là `all` hay `unread`. `handleReadState` vì vậy chỉ map item:

```ts
item.id === notificationId ? { ...item, readAt } : item
```

Khi `readAt` chuyển từ `null` sang timestamp:

- List `all`: cập nhật `readAt` là đúng.
- List `unread`: item không còn thỏa filter nhưng vẫn nằm trong danh sách, là sai.

`handleReadAll` có cùng lỗi: các item được gán `readAt` nhưng vẫn còn trong cache unread.

Lỗi thấy rõ khi thao tác mark read ở tab hoặc thiết bị khác. Tab hiện tại nhận socket event và badge count có thể giảm đúng, nhưng panel unread vẫn hiển thị item đã đọc cho đến khi refetch.

**Hướng sửa đề xuất:**

Thay helper bằng phiên bản duyệt từng query để callback nhận được filter từ query key:

```ts
function updateLists(
  queryClient: QueryClient,
  update: (
    data: InfiniteData<NotificationListResponse>,
    filter: NotificationFilter,
  ) => InfiniteData<NotificationListResponse>,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: notificationKeys.lists() });

  for (const query of queries) {
    const filter = query.queryKey[2];
    if (filter !== "all" && filter !== "unread") continue;

    queryClient.setQueryData<InfiniteData<NotificationListResponse>>(
      query.queryKey,
      (current) => (current ? update(current, filter) : current),
    );
  }
}
```

Thêm import type:

```ts
import type {
  NotificationFilter,
  NotificationListResponse,
  UnreadCountResponse,
} from "@/features/notifications/types";
```

Trong `handleReadState`, áp dụng rule theo filter:

```ts
items:
  filter === "unread" && readAt !== null
    ? page.data.items.filter((item) => item.id !== notificationId)
    : page.data.items.map((item) =>
        item.id === notificationId ? { ...item, readAt } : item,
      ),
```

Trong `handleReadAll`, với cache unread cần filter bỏ tất cả item thỏa điều kiện `createdAt <= before` và đang unread. Với cache all vẫn giữ item và cập nhật `readAt`:

```ts
const shouldMarkRead = (item: NotificationResponse): boolean =>
  new Date(item.createdAt).getTime() <= beforeTime && !item.readAt;

const items =
  filter === "unread"
    ? page.data.items.filter((item) => !shouldMarkRead(item))
    : page.data.items.map((item) =>
        shouldMarkRead(item) ? { ...item, readAt } : item,
      );
```

Không nên chỉ invalidate rồi chờ refetch. Socket handler cần cập nhật cache ngay để các tab/session cùng phản ánh read state tức thời; invalidate có thể dùng thêm như reconciliation nếu cursor pagination cần lấp đầy page vừa bị thiếu item.

**Trường hợp mark unread:**

Khi `readAt` chuyển từ timestamp về `null`, list `all` có thể cập nhật item tại chỗ. Nếu list unread đang cache nhưng chưa chứa item, handler cần chèn item từ cache `all` hoặc invalidate riêng `notificationKeys.list("unread")`. Không xử lý nhánh này sẽ tạo lỗi đối xứng: badge tăng nhưng item chưa xuất hiện trong panel unread.

Hướng an toàn, ít coupling nhất cho nhánh mark unread là:

```ts
if (readAt === null) {
  void queryClient.invalidateQueries({
    queryKey: notificationKeys.list("unread"),
  });
}
```

## Test cases bắt buộc

### Legacy event

1. Đặt lịch lần đầu cho task có assignee online: recipient nhận đúng một toast từ `notification:new`.
2. Reschedule task: recipient không nhận duplicate toast giữa legacy và inbox handler.
3. Unmount/remount realtime provider: mỗi event chỉ tạo một toast, chứng minh cleanup listener đúng.
4. Event legacy có type không bắt đầu bằng `TASK_`: task handler không hiển thị toast ngoài phạm vi.

### Read-state cache

1. Cache `all` và `unread` cùng chứa item A; nhận event A read: `all` giữ A với `readAt`, `unread` loại A, badge giảm một.
2. Nhận lại cùng event read: badge không giảm lần hai.
3. Nhận mark-all với mốc `before`: chỉ item unread có `createdAt <= before` bị loại khỏi unread list.
4. Item tạo sau `before` vẫn còn trong unread list.
5. Mark unread từ tab khác: badge tăng và unread list được refetch/chèn item.
6. Chỉ cache unread tồn tại: read event vẫn loại item đúng và badge không âm.
7. Chỉ cache all tồn tại: read state cập nhật đúng, không phát sinh cache unread giả.

## Tiêu chí hoàn thành

- Mọi emitter `notification:new` còn tồn tại ở BE đều có consumer tương thích ở FE.
- Listener legacy được cleanup bằng đúng function reference.
- Item có `readAt !== null` không tồn tại trong query cache `filter = "unread"`.
- Mark-all loại đúng tập item theo mốc `before`.
- Unread badge và unread list không lệch nhau sau event từ tab/session khác.
- Build và lint các file thay đổi đạt; test realtime không có duplicate listener/toast.
