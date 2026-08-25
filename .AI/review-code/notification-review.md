# Review: Task Activity và System Notification

> Review được đối chiếu lại ngày 2026-08-25 trên hai codebase:
> `Manage -Task/BE` và `FE`.
>
> Phạm vi: contract realtime, Prisma migration, cơ chế dedupe notification và
> đồng bộ unread count giữa nhiều tab/session.

## Kết luận

Phần notification hiện có bốn vấn đề cần xử lý trước khi xem là sẵn sàng để
deploy:

- **P1:** Backend không compile do contract realtime khai báo `Date` nhưng
  publisher emit ISO string.
- **P1:** Migration SQL có tồn tại trên máy nhưng toàn bộ
  `prisma/migrations` đang bị `.gitignore`, nên migration không nằm trong
  patch/worktree Git và sẽ không được đưa lên môi trường deploy.
- **P2:** Retry cùng `dedupeKey` vẫn emit lại `notification:created` dù DB
  không tạo row mới.
- **P2:** Event mark read/unread từ tab khác chỉ sửa list cache, không sửa unread
  count nên badge bell có thể bị stale.

Lệnh xác minh hiện tại:

```bash
cd "Manage -Task/BE"
npx tsc --noEmit
```

Kết quả: fail tại `realtime-event.service.ts:136` và
`realtime-event.service.ts:155`.

## Findings

### [P1] Contract realtime không khớp JSON payload và làm BE không compile

**Files:**

- `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts:131-162`
- `Manage -Task/BE/src/modules/realtime/realtime.types.ts:243-251`

Contract hiện khai báo:

```ts
export type NotificationReadStateChangedPayload = RealtimeEnvelope<{
  notificationId: string;
  readAt: Date | null;
}>;

export type NotificationReadAllPayload = RealtimeEnvelope<{
  before: Date;
  readAt: Date;
}>;
```

Nhưng publisher chủ động chuyển các field sang ISO string:

```ts
data: {
  notificationId,
  readAt: readAt instanceof Date ? readAt.toISOString() : readAt,
}

data: {
  before: before instanceof Date ? before.toISOString() : before,
  readAt: readAt instanceof Date ? readAt.toISOString() : readAt,
}
```

TypeScript báo:

```text
Type 'string | null' is not assignable to type 'Date | null'.
Type 'string' is not assignable to type 'Date'.
```

Đây không chỉ là lỗi compile. Dữ liệu qua Socket.IO thực tế là JSON, vì vậy FE
nhận timestamp dưới dạng string. Contract server nên mô tả wire format thay vì
object `Date` nội bộ.

**Hướng sửa đề xuất:**

Đổi các timestamp trong realtime DTO sang ISO string:

```ts
export type NotificationReadStateChangedPayload = RealtimeEnvelope<{
  notificationId: string;
  readAt: string | null;
}>;

export type NotificationReadAllPayload = RealtimeEnvelope<{
  before: string;
  readAt: string;
}>;
```

Giữ tham số method service là `Date` nếu thuận tiện cho domain layer, nhưng
serialize đúng một lần tại realtime boundary. Contract FE hiện đã dùng
`string | null` và `string`, nên hướng này đồng bộ hai phía.

Không nên bỏ `toISOString()` rồi dựa vào Socket.IO tự serialize `Date`, vì
contract runtime vẫn là string trong JSON và sẽ tiếp tục gây hiểu nhầm cho
consumer/test.

**Tiêu chí chấp nhận:**

- `npx tsc --noEmit` ở BE chạy thành công.
- Payload nhận ở FE có timestamp ISO hợp lệ.
- FE parse được `before`, `readAt` bằng `new Date(value)`.
- BE và FE khai báo cùng một wire contract.

### [P1] Migration mới không được Git theo dõi nên deployment sẽ thiếu bảng

**Files:**

- `Manage -Task/BE/prisma/schema.prisma:113-134`
- `Manage -Task/BE/prisma/schema.prisma:389-427`
- `Manage -Task/BE/.gitignore:5`
- `Manage -Task/BE/prisma/migrations/20260823000000_add_activity_notifications/migration.sql`

Schema Prisma thêm:

- Enum `TaskActivityType`.
- Enum `NotificationPriority`.
- Model/table `taskActivities`.
- Model/table `notifications`.
- Các relation mới trên `users` và `tasks`.

Migration SQL tương ứng đang tồn tại trên filesystem, nhưng lệnh:

```bash
git check-ignore -v \
  prisma/migrations/20260823000000_add_activity_notifications/migration.sql
```

cho thấy file bị ignore bởi rule:

```gitignore
/prisma/migrations
```

Vì vậy `git status --untracked-files=all` không hiển thị migration. Nếu merge
patch hiện tại, môi trường dùng `prisma migrate deploy` sẽ không tạo enum/bảng
mới, trong khi application đã query `taskActivities` và `notifications`.
Runtime sẽ lỗi ngay khi gọi API activity/inbox hoặc tạo notification.

**Hướng sửa đề xuất:**

Ưu tiên sửa `.gitignore` để migration là artifact được version control:

```gitignore
# Không ignore prisma/migrations.
# Chỉ ignore file tạm nếu thực sự có.
```

Sau đó add migration:

```bash
git add prisma/migrations/20260823000000_add_activity_notifications/migration.sql
```

Nếu dự án cố ý ignore toàn bộ migration, cần thay đổi quy trình deploy một cách
chính thức và có tài liệu. Không nên chỉ dùng `git add -f` như giải pháp lâu
dài vì migration sau rất dễ tiếp tục bị bỏ sót.

**Tiêu chí chấp nhận:**

- Migration xuất hiện trong `git status` và patch/commit.
- Database sạch chạy `prisma migrate deploy` tạo đủ hai enum và hai table.
- `npx prisma migrate status` không báo pending/diverged sau deploy.
- API list activity, unread count và create notification không gặp lỗi missing
  relation/table.

### [P2] Retry cùng dedupe key vẫn emit notification cũ như notification mới

**Files:**

- `Manage -Task/BE/src/modules/notification/notification.repository.ts:26-51`
- `Manage -Task/BE/src/modules/notification/notification-inbox.service.ts:55-75`

Repository dùng `upsert`:

```ts
const row = await prisma.notifications.upsert({
  where: { recipientId_dedupeKey: ... },
  update: {},
  create: ...,
});
```

Khi row đã tồn tại, `upsert` trả row cũ. Service không biết row vừa được tạo hay
đã tồn tại và luôn emit:

```ts
notifications.forEach((notification, index) => {
  realtimeEventService.emitNotificationCreated(
    recipientIds[index],
    notification,
  );
});
```

Hậu quả:

- Cron retry hoặc request retry có thể phát lại `notification:created`.
- Client mới mở session hoặc đã clear `receivedIds` có thể toast lại.
- Unread count phía FE có thể tăng dù database chỉ có một row.
- Dedupe DB đang ngăn duplicate persistence nhưng chưa ngăn duplicate delivery.

Set `receivedIds` trên FE chỉ là lớp bảo vệ trong một runtime, không giải quyết
retry sau reload, reconnect hoặc server instance khác.

**Hướng sửa đề xuất:**

Repository phải trả kèm trạng thái `created`:

```ts
type CreateNotificationResult = {
  notification: NotificationRow;
  created: boolean;
};
```

Với PostgreSQL, có thể dùng một trong các cách:

1. `createMany({ skipDuplicates: true })`, sau đó query lại chỉ khi caller cần
   response; emit dựa trên tập ID/recipient thực sự insert.
2. Thử `create`, bắt riêng Prisma error `P2002` và trả
   `{ created: false }`; không nuốt các lỗi DB khác.
3. Dùng raw SQL `INSERT ... ON CONFLICT DO NOTHING RETURNING ...` nếu cần insert
   batch và biết chính xác row nào mới.

Service chỉ emit các result có `created === true`. Không suy ra trạng thái mới
từ `createdAt` hoặc so timestamp vì có race condition.

**Tiêu chí chấp nhận:**

- Gọi `createForRecipients` hai lần với cùng recipient/dedupe key chỉ tạo một
  DB row.
- Chỉ lần đầu emit `notification:created`.
- Chỉ lần đầu tăng unread count và hiện toast.
- Retry cho nhiều recipient vẫn emit đúng những recipient mới insert, không
  dùng index mapping bị lệch.
- Lỗi DB khác `P2002` vẫn được throw/log, không bị coi nhầm là duplicate.

### [P2] Read/unread realtime không cập nhật unread count của bell

**File:**

- `FE/src/features/realtime/handlers/notification-event-handlers.ts:58-97`

`handleReadState` hiện patch `readAt` trong các notification list, sau đó cố
ý không invalidate query để tránh refetch/blink. Tuy nhiên handler không cập
nhật:

```ts
notificationKeys.unreadCount()
```

`handleReadAll` cũng patch list nhưng không đưa unread count về giá trị phù
hợp. Vì vậy:

- Tab A mark read, tab B nhận event và item đổi trạng thái nhưng badge không giảm.
- Tab A mark unread, badge tab B không tăng.
- Mark all read ở một tab có thể để badge tab khác giữ count cũ.

**Hướng sửa đề xuất:**

Với `notification:read_state_changed`, trước khi patch phải xác định transition
thực tế từ cache:

- `null -> ISO string`: giảm count một lần.
- `ISO string -> null`: tăng count một lần.
- `null -> null` hoặc read -> read: không đổi count.

Không tăng/giảm chỉ dựa trên payload vì event có thể lặp. Có thể viết helper
canonical nhận `notificationId`, tìm state cũ trong mọi list page, patch item và
trả về delta `-1 | 0 | 1`.

Sau đó cập nhật count:

```ts
queryClient.setQueryData<UnreadCountResponse>(
  notificationKeys.unreadCount(),
  (current) => ({
    success: true,
    data: {
      count: Math.max(0, (current?.data.count ?? 0) + delta),
    },
  }),
);
```

Với `notification:read_all`, cách an toàn:

- Đếm số item unread có `createdAt <= before` trong cache trước khi patch và
  giảm count theo số transition đã biết; hoặc
- Set count về 0 chỉ khi contract đảm bảo event read-all áp dụng cho toàn bộ
  unread hiện có trước `before` và không có notification mới hơn; hoặc
- Invalidate riêng unread count sau khi patch list. Đây là phương án đơn giản,
  đúng tuyệt đối và không làm list blink vì chỉ refetch count query.

Khuyến nghị P0: patch list tại chỗ, sau đó invalidate riêng
`notificationKeys.unreadCount()`. Tối ưu delta hoàn toàn local chỉ nên làm khi
có test idempotency đầy đủ.

**Tiêu chí chấp nhận:**

- Hai tab cùng user: mark read ở tab A làm item và badge tab B giảm đúng một.
- Mark unread ở tab A làm badge tab B tăng đúng một.
- Event lặp không làm count âm hoặc tăng hai lần.
- Mark all read đưa badge tab khác về count đúng.
- Notification mới đến đồng thời read-all không bị mark read hoặc làm mất count
  nếu `createdAt > before`.

## Thứ tự sửa đề xuất

1. Sửa realtime timestamp contract để khôi phục BE compile.
2. Bỏ ignore migration và đưa migration vào Git.
3. Sửa repository/service để chỉ emit row thực sự mới.
4. Đồng bộ unread count trong read-state/read-all handler.
5. Chạy lại type-check, Prisma validation, FE build và test hai tab.

## Acceptance test tổng

### Static checks

```bash
cd "Manage -Task/BE"
npx prisma validate
npx tsc --noEmit

cd ../../FE
npm run build
```

### Database

1. Tạo database sạch.
2. Chạy `prisma migrate deploy`.
3. Xác minh có `taskActivities`, `notifications`,
   `TaskActivityType`, `NotificationPriority`.
4. Tạo một activity và một notification qua business flow.

### Realtime/dedupe

1. Gọi cùng trigger hai lần với cùng dedupe key.
2. Xác minh DB có một notification.
3. Xác minh socket chỉ nhận một `notification:created`.
4. Xác minh toast và unread count chỉ tăng một.

### Multi-tab

1. Mở cùng user ở hai tab.
2. Mark read/unread từng item ở tab A.
3. Xác minh item state và bell badge ở tab B cập nhật ngay.
4. Mark all read và tạo notification mới đồng thời.
5. Xác minh notification mới hơn `before` vẫn unread và count chính xác.

## Trạng thái tại thời điểm review

- BE `npx tsc --noEmit`: **fail** vì mismatch `Date`/ISO string.
- Migration SQL: **có trên filesystem nhưng bị Git ignore**.
- Dedupe persistence: **có**, dedupe realtime delivery: **chưa có**.
- List read-state realtime: **có**, unread count realtime: **chưa đồng bộ**.

Tài liệu này chỉ ghi nhận review và hướng xử lý; chưa sửa các file implementation.
