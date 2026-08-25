# Review: unread count và lỗi timeline không đầy đủ

> Đối chiếu ngày 2026-08-25 trên `FE` và `Manage -Task/BE`.
>
> Phạm vi: realtime `notification:read_all` và error state của timeline gộp
> comments + task activities.

## Kết luận

Cả hai finding đều đúng và cần sửa trước khi xem feature hoàn chỉnh:

- **P2:** Unread badge được trừ theo số item đang có trong cache infinite query, không phải số notification thực tế đã được BE mark read. Badge sẽ stale khi unread list mới load một phần hoặc chưa được cache.
- **P2:** Timeline chỉ hiện error khi cả comments và activities cùng lỗi. Nếu một query lỗi và query còn lại thành công, UI im lặng render timeline thiếu dữ liệu, khiến người dùng hiểu sai rằng phần dữ liệu bị thiếu không tồn tại.

## Findings

### [P2] Refetch unread count sau event mark-all

**Files liên quan:**

- `FE/src/features/realtime/handlers/notification-event-handlers.ts:157-210`
- `FE/src/features/notifications/api/notification-api.ts:18-20`
- `Manage -Task/BE/src/modules/notification/notification.repository.ts:107-113`
- `Manage -Task/BE/src/modules/notification/notification-inbox.service.ts:100-103`
- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts:143-155`

#### Nguyên nhân

`handleReadAll` đang tính `affectedCount` bằng số item bị loại khỏi các page của cache `filter = "unread"`:

```ts
let affectedCount = 0;

// affectedCount chỉ được gán từ removedCount của các page đã load.
affectedCount = removedCount;

queryClient.setQueryData(notificationKeys.unreadCount(), (current) => ({
  success: true,
  data: {
    count: Math.max(0, (current?.data.count ?? 0) - affectedCount),
  },
}));
```

Notification list dùng cursor pagination với limit mặc định 20. Cache infinite query không đại diện cho toàn bộ unread collection.

Ví dụ:

```text
Unread count từ server:             50
Unread item đang load trong cache:  20
BE mark-all-read thực tế:            50
FE affectedCount cục bộ:             20
Badge sau phép trừ:                  30 (sai, đúng phải là 0)
```

Nếu unread list chưa từng được mở, không có cache `filter = "unread"`; `affectedCount` giữ nguyên 0 và badge hoàn toàn không được cập nhật.

BE thực tế biết số row đã update qua `result.count` và trả `affectedCount` trong HTTP response của request mark-all. Tuy nhiên socket payload `notification:read_all` hiện chỉ chứa:

```ts
{
  before: string;
  readAt: string;
}
```

Vì socket consumer không nhận `affectedCount` hoặc `remainingUnreadCount`, FE không thể tính badge authoritative từ số item đã load.

#### Hướng sửa đề xuất

Giữ optimistic update cho list cache để item biến mất ngay, nhưng luôn invalidate query unread count sau khi xử lý event:

```ts
void queryClient.invalidateQueries({
  queryKey: notificationKeys.unreadCount(),
});
```

Không tiếp tục dùng `affectedCount` cục bộ để ghi giá trị cuối cùng cho badge. Có thể bỏ hoàn toàn block `setQueryData` tại cuối `handleReadAll`:

```ts
// Không dùng số item loaded để suy ra tổng unread.
void queryClient.invalidateQueries({
  queryKey: notificationKeys.unreadCount(),
});
```

`invalidateQueries` là hướng sửa ít thay đổi contract nhất và dùng endpoint `/notification/unread-count` làm nguồn dữ liệu chính xác.

Nếu muốn badge cập nhật ngay mà không chờ network, có thể optimistic update tạm thời rồi vẫn refetch. Tuy nhiên không được set về 0 nếu `before` có thể là một cutoff cũ, vì notification tạo sau cutoff vẫn có thể unread.

#### Hướng nâng cấp contract tùy chọn

BE có thể mở rộng event với kết quả authoritative:

```ts
type NotificationReadAllPayload = RealtimeEnvelope<{
  before: string;
  readAt: string;
  affectedCount: number;
  remainingUnreadCount: number;
}>;
```

Trong đó `remainingUnreadCount` đáng tin cậy hơn phép trừ `affectedCount` khỏi cache count có thể đã stale. Nếu thêm field này, phải cập nhật đồng thời:

- BE realtime type.
- `emitNotificationReadAll`.
- Notification inbox service/repository.
- FE realtime contract.
- Handler và contract tests.

Với phạm vi patch hiện tại, invalidate/refetch là phương án khuyến nghị.

#### Lưu ý về list cache

Việc filter item khỏi cache unread vẫn đúng để UI phản hồi ngay. Tuy nhiên handler hiện gộp toàn bộ item còn lại vào một page và giữ `nextCursor` của page đầu. Cách này có thể làm mất cấu trúc `pageParams`/cursor khi đã load nhiều page. Đây là rủi ro riêng; nên giữ nguyên số page và filter `items` trong từng page, sau đó invalidate unread list nếu cần lấp đầy khoảng trống.

### [P2] Hiện lỗi khi một trong hai timeline query thất bại

**File:**

- `FE/src/components/tasks/comments/task-comments-section.tsx:147-159`

#### Nguyên nhân

Timeline được ghép từ hai nguồn độc lập:

- `useTaskComments(taskId)`.
- `useTaskActivities(taskId)`.

Nhưng error condition hiện tại là:

```tsx
isError && activityQuery.isError
```

Điều kiện này chỉ đúng khi cả hai request cùng lỗi. Các trường hợp sau bị che giấu:

| Comments | Activities | Kết quả hiện tại | Kết quả đúng |
| --- | --- | --- | --- |
| Lỗi | Thành công | Chỉ render activities, không báo comments bị thiếu | Hiện lỗi hoặc cảnh báo partial data |
| Thành công | Lỗi | Chỉ render comments, không báo activities bị thiếu | Hiện lỗi hoặc cảnh báo partial data |
| Lỗi | Lỗi | Hiện error state | Hiện error state |

Trường hợp comments fail đặc biệt nghiêm trọng: toàn bộ comments biến mất khỏi timeline nhưng UI không có thông báo hay đường retry rõ ràng cho lỗi đó.

#### Hướng sửa tối thiểu

Dùng toán tử OR:

```ts
const hasTimelineError = isError || activityQuery.isError;
```

```tsx
{isLoadingTimeline ? (
  <CommentListSkeleton />
) : hasTimelineError ? (
  <TimelineError onRetry={refreshTimeline} />
) : (
  <TimelineList items={timeline} />
)}
```

Error block hiện có và `refreshTimeline` đã refetch cả hai query nên có thể tái sử dụng. Chỉ cần đổi điều kiện:

```diff
- ) : isError && activityQuery.isError ? (
+ ) : isError || activityQuery.isError ? (
```

Nên thêm ngoặc để tránh khó đọc khi JSX ternary kết hợp với toán tử boolean:

```tsx
) : (isError || activityQuery.isError) ? (
```

#### Hướng UX chi tiết hơn

Nếu muốn vẫn hiển thị dữ liệu nguồn thành công, có thể render warning banner theo từng query và giữ partial timeline bên dưới:

```ts
const commentsFailed = isError;
const activitiesFailed = activityQuery.isError;
```

Banner phải nói rõ nguồn nào lỗi và nút Retry phải gọi đúng query hoặc cả hai. Không được render partial timeline im lặng như hiện tại.

Với timeline gộp và sort chung, hướng full error state dùng OR là an toàn, đơn giản và giữ đúng hành vi cũ của comments: comments lỗi luôn được báo cho người dùng.

## Test cases bắt buộc

### Unread count

1. Badge = 50, unread list chỉ load 20 item; nhận `read_all`: list loại item ngay và unread count được refetch về 0.
2. Badge đã cache nhưng unread list chưa cache; nhận `read_all`: unread count vẫn được invalidate/refetch.
3. `before` cũ hơn một số unread notification: refetch trả đúng số notification còn lại, không ép badge về 0.
4. Endpoint unread-count lỗi tạm thời: query ở trạng thái stale/error nhưng không ghi một giá trị suy diễn sai làm authoritative.
5. Nhận nhiều event `read_all` liên tiếp: kết quả cuối khớp server và không làm badge âm.
6. Unread list đã load nhiều page: filter không làm hỏng `pages`/`pageParams`; lần load tiếp theo không trùng hoặc bỏ item.

### Timeline error

1. Comments lỗi, activities thành công: hiện error/warning và có Retry.
2. Comments thành công, activities lỗi: hiện error/warning và có Retry.
3. Cả hai lỗi: hiện error state một lần.
4. Cả hai thành công: render timeline đã sort như hiện tại.
5. Retry thành công: error state biến mất và timeline đầy đủ được render.
6. Một query đang loading trong khi query còn lại đã có data: giữ loading state hiện tại, không render timeline chưa hoàn chỉnh.

## Tiêu chí hoàn thành

- `notification:read_all` luôn reconcile badge với endpoint unread-count, không dựa vào số item đã load.
- Event vẫn cập nhật list cache ngay để item đã đọc không còn trong tab unread.
- Cache infinite query giữ cấu trúc page/cursor hợp lệ sau mark-all.
- Timeline báo lỗi khi bất kỳ nguồn dữ liệu bắt buộc nào thất bại.
- Người dùng luôn có đường retry cho comments và activities.
- Build, lint các file thay đổi và test các tổ hợp success/error đều đạt.
