# Notification System — Debug & Test Guide

> Ngày 2026-08-24. Hướng dẫn kiểm tra toàn bộ notification system từ BE đến FE.
>
> Đọc trước: `FE/.AI/FE/plan/notification.md` để hiểu kiến trúc tổng thể.

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Bugs đã tìm thấy](#2-bugs-đã-tìm-thấy)
3. [Hướng dẫn t est Backend (REST API)](#3-hướng-dẫn-test-backend-rest-api)
4. [Hướng dẫn test Socket.IO](#4-hướng-dẫn-test-socketio)
5. [Hướng dẫn test Frontend](#5-hướng-dẫn-test-frontend)
6. [Test 2 user / 2 tab (realtime)](#6-test-2-user--2-tab-realtime)
7. [Debug checklist](#7-debug-checklist)
8. [Priority fix order](#8-priority-fix-order)

---

## 1. Tổng quan hệ thống

```
Business action (assign task, comment, schedule...)
        |
        v
BE: task.service.ts / comment.controller.ts
        |
        +--> notificationInboxService.createForRecipients()
        |         |
        |         +--> notification.repository.ts (upsert vào DB)
        |         |
        |         +--> realtimeEventService.emitNotificationCreated()
        |                   |
        |                   v
        |            Socket.IO --> user:{recipientId} room
        |                              |
        +--> notification.service.ts (email due soon / overdue)
                                      |
                                      v
FE: notification-event-handlers.ts
        |
        +--> setQueryData: prepend notification vào first page cache
        +--> setQueryData: tăng unread count
        +--> toast (nếu URGENT/DIRECT + app visible)
        |
        v
FE: notification-center.tsx / notification-bell.tsx
        |
        v
UI: Bell badge + Notification list
```

### Các thành phần chính

| Tầng              | File                                               | Mô tả                                 |
| ----------------- | -------------------------------------------------- | ------------------------------------- |
| DB                | `prisma.notifications`                             | Lưu notification với dedupe key       |
| BE Service        | `notification-inbox.service.ts`                    | CRUD + emit socket                    |
| BE Repository     | `notification.repository.ts`                       | Upsert, list, mark read               |
| BE Realtime       | `realtime-event.service.ts`                        | Emit socket vào user room             |
| BE Socket Server  | `socket.server.ts`                                 | Auto-join `user:{userId}` khi connect |
| FE API            | `notification-api.ts`                              | Gọi REST endpoints                    |
| FE Hooks          | `useNotifications.ts`                              | useInfiniteQuery + mutations          |
| FE Socket Handler | `notification-event-handlers.ts`                   | Xử lý socket events, update cache     |
| FE UI             | `notification-bell.tsx`, `notification-center.tsx` | Bell + Popover/Sheet                  |

---

## 2. Bugs đã tìm thấy

### Bug 1 — `readAt` Date vs string (CRITICAL — cần fix sớm)

**Vị trí:** `realtime-event.service.ts:134` và `notification-event-handlers.ts:67`

**Mô tả:** Backend gửi raw `Date` object qua socket, nhưng frontend khai báo `readAt: string | null`. Khi mark read qua socket event, `formatDateTime()` có thể crash hoặc hiển thị sai.

**Cách verify lỗi:**

- Mở notification center → tạo notification → mark read
- Nếu dùng REST: `formatDateTime()` nhận ISO string → OK
- Nếu dùng socket (tab khác): `formatDateTime()` nhận Date object → có thể crash

**Fix đã apply:**

```typescript
// realtime-event.service.ts

// === emitNotificationReadStateChanged ===
emitNotificationReadStateChanged(
  recipientId: string,
  notificationId: string,
  readAt: Date | null,
): void {
  const payload: NotificationReadStateChangedPayload = createRealtimeEnvelope({
    actorId: null, // Fix bug 5: actorId không cần thiết
    data: {
      notificationId,
      readAt: readAt instanceof Date
        ? readAt.toISOString()
        : readAt,
    },
  });
  this.emitToRoom(
    userRoom(recipientId),
    "notification:read_state_changed",
    payload,
  );
}

// === emitNotificationReadAll ===
emitNotificationReadAll(
  recipientId: string,
  before: Date,
  readAt: Date,
): void {
  const payload: NotificationReadAllPayload = createRealtimeEnvelope({
    actorId: null,
    data: {
      before: before instanceof Date ? before.toISOString() : before,
      readAt: readAt instanceof Date ? readAt.toISOString() : readAt,
    },
  });
  this.emitToRoom(userRoom(recipientId), "notification:read_all", payload);
}
```

---

### Bug 2 — `createForRecipients` không có transaction (MEDIUM)

**Vị trí:** `notification-inbox.service.ts:55-76`

**Mô tả:** Nếu tạo notification cho nhiều recipients, 3 row đầu thành công, row thứ 4 fail (unique constraint), 2 row còn lại có thể không được tạo hoặc tạo không đồng nhất. Prisma mặc định autocommit, không có transaction.

**Fix:**

```typescript
// Thêm prisma transaction vào createMany
async createForRecipients(input: ...) {
  const prisma = new PrismaService();
  const results = await prisma.$transaction(async (tx) => {
    const repo = new NotificationRepository(prisma);
    // ... tạo notification trong transaction
  });
}
```

---

### Bug 3 — Email không có authentication config (MEDIUM)

**Vị trí:** `notification.service.ts:29-34`

**Mô tả:** `MailConfig` không show `auth` trong log, có thể SMTP server yêu cầu auth mà không được config.

**Cách verify:**

- Check file `configs/mail.config.ts` xem có `user`/`pass` không
- Tạo task với due date sắp tới → trigger `sendTaskDueSoonEmail`
- Watch BE logs: `grep "email\|notification" BE_logs`

---

### Bug 4 — `invalidateQueries` thừa sau `setQueryData` + `handleReadAll` không patch cache (LOW)

**Vị trí:** `notification-event-handlers.ts:58-77`

**Mô tả:** Sau khi `setQueryData` patch đúng, `invalidateQueries` lại trigger refetch → gây blink 1 frame. Thêm vào đó, `handleReadAll` chỉ invalidate mà không patch cache.

**Fix đã apply:**

```typescript
// notification-event-handlers.ts

// handleReadState: BỎ invalidateQueries
const handleReadState: ... = (payload) => {
  updateLists(queryClient, (current) => ({
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: {
        ...page.data,
        items: page.data.items.map((item) =>
          item.id === notificationId ? { ...item, readAt } : item,
        ),
      },
    })),
  }));
  // ĐÃ XÓA: void queryClient.invalidateQueries(...)
};

// handleReadAll: PATCH CACHE thay vì chỉ invalidate
const handleReadAll: ... = (payload) => {
  const { before, readAt } = payload.data;
  updateLists(queryClient, (current) => ({
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: {
        ...page.data,
        items: page.data.items.map((item) => {
          const itemCreatedAt = new Date(item.createdAt).getTime();
          const beforeTime = new Date(before).getTime();
          if (itemCreatedAt <= beforeTime && !item.readAt) {
            return { ...item, readAt };
          }
          return item;
        }),
      },
    })),
  }));
  // ĐÃ XÓA: void queryClient.invalidateQueries(...)
};
```

---

### Bug 5 — `actorId = recipientId` không cần thiết (LOW — đã fix cùng Bug 1)

**Vị trí:** `realtime-event.service.ts:137`

**Mô tả:** `emitNotificationReadStateChanged` gửi `actorId = recipientId` không cần thiết.

**Trạng thái:** ✅ Đã fix — `actorId: null` trong cả hai method `emitNotificationReadStateChanged` và `emitNotificationReadAll`.

---

### Bug 6 — Socket không tự reconnect sau refresh token (LOW — đã fix)

**Vị trí:** `socket.ts:68-72`

**Mô tả:** Khi token được refresh khi app đang chạy, socket không reconnect với token mới.

**Fix đã apply:**

```typescript
// socket.ts
export function refreshSocketAuth(): void {
  if (!socket) return;
  const token = authStorage.getValidToken();
  socket.auth = token ? { token } : {};
  // Nếu socket đang disconnect do auth hết hạn, reconnect
  if (!socket.connected) {
    socket.connect();
  }
}
```

---

## 3. Hướng dẫn test Backend (REST API)

### 3.1. Chuẩn bị

```bash
# Xác định token BE đang chạy ở port nào
# Thường là http://localhost:3000

# Login lấy token (thay email/password bằng tài khoản test)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' \
  | jq -r '.data.accessToken')

echo "Token: $TOKEN"
```

### 3.2. Các API endpoints

```bash
# === Lấy số notification chưa đọc ===
curl http://localhost:3000/notification/unread-count \
  -H "Authorization: Bearer $TOKEN"

# Response mẫu:
# { "success": true, "data": { "count": 5 } }


# === List tất cả notification (all) ===
curl "http://localhost:3000/notification?filter=all&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Response mẫu:
# {
#   "success": true,
#   "data": {
#     "items": [
#       {
#         "id": "notif-uuid",
#         "type": "TASK_ASSIGNED",
#         "priority": "DIRECT",
#         "title": "Bạn được assign vào task mới",
#         "body": "Minh đã assign bạn vào task Thiết kế API",
#         "actor": { "id": "...", "name": "Minh", "avatar": null },
#         "context": { "projectId": "...", "boardId": null, "taskId": "...", "commentId": null },
#         "data": {},
#         "readAt": null,
#         "createdAt": "2026-08-24T10:00:00.000Z"
#       }
#     ],
#     "nextCursor": "notif-uuid-2-hoặc-null"
#   }
# }


# === List chỉ notification chưa đọc (unread) ===
curl "http://localhost:3000/notification?filter=unread&limit=5" \
  -H "Authorization: Bearer $TOKEN"


# === Mark một notification đã đọc ===
curl -X PATCH "http://localhost:3000/notification/<NOTIF_ID>/read" \
  -H "Authorization: Bearer $TOKEN"

# Response mẫu:
# { "success": true, "data": { "...notification object...", "readAt": "2026-08-24T10:05:00.000Z" } }


# === Mark một notification chưa đọc (undo) ===
curl -X PATCH "http://localhost:3000/notification/<NOTIF_ID>/unread" \
  -H "Authorization: Bearer $TOKEN"


# === Mark tất cả đã đọc trước một thời điểm ===
curl -X PATCH "http://localhost:3000/notification/read-all" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"before":"2026-08-24T12:00:00.000Z"}'

# Response mẫu:
# { "success": true, "data": { "affectedCount": 5, "before": "2026-08-24T12:00:00.000Z" } }
```

### 3.3. Trigger notification từ business action

Cách tốt nhất là trigger qua UI (FE) vì business logic nằm ở BE service. Nhưng có thể test trực tiếp:

```bash
# Cách 1: Qua comment (comment.controller.ts gọi createForRecipients)
# Tạo comment trên task → tạo notification cho assignee

# Cách 2: Check DB trực tiếp
psql $DATABASE_URL -c "
SELECT id, type, title, recipient_id, read_at, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
"

# Cách 3: Watch BE logs khi có action tạo notification
tail -f /path/to/BE/logs | grep -i "notification"
```

### 3.4. Test email

```bash
# Tạo task với dueDate = thời gian sắp tới (hoặc đợi cron chạy)
# Cron chạy theo config trong taskScheduleConfig

# Watch email logs:
tail -f /path/to/BE/logs | grep -i "email\|due\|overdue"

# Mong đợi log:
# [notification] Preparing email for task xxx, assignee: xxx@example.com
# [notification] MailConfig: { host, port, senderAddress, ... }
# [notification] Email sent to xxx@example.com for task xxx (due soon)
```

---

## 4. Hướng dẫn test Socket.IO

### 4.1. Test bằng Node.js script

```bash
# Cài socket.io-client
npm install -g socket.io-client

# Chạy script test
node -e "
const { io } = require('socket.io-client');

// Thay TOKEN bằng token đã lấy ở bước 3.1
const TOKEN = '$TOKEN';

const socket = io('http://localhost:3000', {
  auth: { token: TOKEN },
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
});

socket.on('notification:created', (payload) => {
  console.log('[NOTIFICATION:CREATED]', JSON.stringify(payload, null, 2));
});

socket.on('notification:read_state_changed', (payload) => {
  console.log('[NOTIFICATION:READ_STATE_CHANGED]', JSON.stringify(payload, null, 2));
});

socket.on('notification:read_all', (payload) => {
  console.log('[NOTIFICATION:READ_ALL]', JSON.stringify(payload, null, 2));
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
});

// Giữ script chạy 60 giây
setTimeout(() => {
  console.log('[Socket] Test timeout, disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 60_000);
"
```

### 4.2. Test socket disconnect/reconnect

```bash
# Mở script trên, sau đó:
# 1. Tắt BE → xem console: [Socket] Disconnected: transport close
# 2. Bật lại BE → xem: [Socket] Connected: <socket-id-mới>
# 3. Tạo notification → xem: [NOTIFICATION:CREATED] payload
```

### 4.3. Verify room

Trong `socket.server.ts:65`, server tự động join:

```typescript
io.on("connection", (socket) => {
  // Tự động join vào room của user hiện tại
  socket.join(userRoom(socket.data.user.id));
  // ...
});
```

Notification được emit vào đúng room:

```typescript
// realtime-event.service.ts:128
this.emitToRoom(userRoom(recipientId), "notification:created", payload);
```

→ User chỉ nhận notification gửi cho mình, không nhận notification của user khác.

---

## 5. Hướng dẫn test Frontend

### 5.1. Test Bell & Badge

```
1. Mở app → đăng nhập
2. Nhìn góc phải app bar → thấy Bell icon
3. Nếu có notification chưa đọc → badge hiện số (1..99)
4. Nếu tất cả đã đọc → badge ẩn
5. Hover Bell → tooltip "Notifications, N unread"
6. A11y: aria-label đúng với số unread
```

### 5.2. Test Notification Center (Desktop)

```
1. Click Bell → Popover mở ra (380-420px)
2. Header: "Notifications" + tab "All | Unread" + "Mark all read"
3. Empty state:
   - Filter "all": "No notifications yet"
   - Filter "unread": "You're all caught up"
4. Loading state: 4 skeleton items (avatar tròn + 2 dòng text)
5. Error state: "Could not load notifications" + Retry button
```

### 5.3. Test Notification Item

```
1. Mỗi item hiển thị:
   - Avatar actor (hoặc icon Bot nếu system)
   - Title (font-medium)
   - Body (text-muted, max 2 dòng)
   - Relative time (ví dụ: "5 phút trước")
   - Unread dot (chấm tròn màu primary) nếu chưa đọc

2. Click item:
   - Nếu chưa đọc → mark read (badge giảm)
   - Navigate đến context (project/board/task)
   - Popover đóng

3. Hover item → icon ⋯ (MoreHorizontal) hiện:
   - "Mark as read" (nếu chưa đọc)
   - "Mark as unread" (nếu đã đọc)

4. "Mark all read" button:
   - Disabled nếu count = 0
   - Loading spinner khi đang xử lý
   - Sau khi xong: tất cả dot biến mất, badge về 0
```

### 5.4. Test Load More

```
1. Tạo > 20 notifications
2. Mở notification center → thấy 20 items đầu
3. Scroll xuống → thấy button "Load more"
4. Click "Load more" → loading spinner → thêm items
5. Khi hết page cuối → button biến mất
```

### 5.5. Test Mobile (Sheet)

```
1. Resize browser < 768px hoặc dùng mobile emulator
2. Bell icon vẫn hiện
3. Click Bell → Sheet mở (full width hoặc 420px)
4. Header, list, mark read giống desktop
5. Swipe down hoặc click outside → Sheet đóng
```

### 5.6. Test visibility + toast

```
1. Tab đang active (document.visibilityState === "visible"):
   - Tạo notification URGENT hoặc DIRECT
   → Toast hiện ở góc phải màn hình
   → Toast có title, description, click để navigate

2. Switch sang tab khác:
   - Tạo notification
   → Không toast (đúng spec)
   → Notification vẫn vào inbox + count tăng

3. Quay lại tab:
   → Không toast đuổi

4. Tab bị minimize (visibilityState === "hidden"):
   → Không toast
```

---

## 6. Test 2 user / 2 tab (realtime)

### 6.1. Setup

```
Tab A: Browser profile "User Minh" (đăng nhập account Minh)
Tab B: Browser profile "User Lan" (đăng nhập account Lan)

Cả hai cùng nhìn một project/board
```

### 6.2. Test case 1: Minh assign task cho Lan

```
Tab A (Minh):
  - Mở board → mở task
  - Assign task cho Lan

Tab B (Lan) — kết quả mong đợi:
  ✅ Bell badge tăng +1
  ✅ Nếu notification là DIRECT/URGENT → toast hiện
  ✅ Notification center: item mới xuất hiện đầu list
  ✅ Item có unread dot
  ✅ Actor avatar = Minh

Tab A (Minh) — kết quả mong đợi:
  ✅ KHÔNG nhận notification (actor không nhận notification của chính mình — đúng spec)

Tab B: Click notification → navigate đến task, mark read, badge giảm
```

### 6.3. Test case 2: Minh comment task (Lan là assignee)

```
Tab A (Minh): Comment trên task mà Lan là assignee
Tab B (Lan):
  ✅ Bell badge tăng
  ✅ Notification center có item "Minh commented on task [Tên task]"
```

### 6.4. Test case 3: Multi-tab sync

```
Tab B (Lan): Mở notification center, chưa mark read gì
Tab B: Click "Mark all read"
  → Tất cả dot biến mất, badge về 0

Tab B (tab mới): Mở notification center cùng account
  → KHÔNG thấy dot nào (đúng, đã mark all read)
  → Badge = 0
```

### 6.5. Test case 4: Deduplication

```
1. Tab A (Minh): Assign task cho Lan
   → Tab B nhận notification:created → prepend vào list

2. Tab B: Reload page (F5)
   → Fetch REST
   → KIỂM TRA: item không bị duplicate (items[0].id !== items[1].id)
   → Check DB: chỉ có 1 row với dedupeKey đúng
```

### 6.6. Test case 5: Socket disconnect/reconnect

```
Tab B (Lan):
  1. Mở DevTools → Network → filter "socket.io" hoặc "websocket"
  2. Tắt BE server
  3. Console: [realtime] socket disconnected
  4. Bật lại BE
  5. Console: [realtime] socket connected (sau 1.5s - 8s)
  6. Tab B vẫn nhận notification realtime bình thường
```

---

## 7. Debug checklist

### 7.1. Backend logs

```bash
# Tất cả notification liên quan
grep -i "notification" /path/to/BE/logs

# Socket events
grep -i "realtime\|socket\|emit" /path/to/BE/logs

# Email
grep -i "email\|due\|overdue\|mail" /path/to/BE/logs

# Realtime event service
grep -i "emitNotification\|userRoom" /path/to/BE/logs
```

### 7.2. Frontend console

```bash
# Dev mode socket logs (bật trong socket.ts)
[realtime] socket connected, { url, id }
[realtime] socket disconnected, transport close
[realtime] connect_error, handshake unauthorized

# React Query DevTools
# Mở React Query DevTools → tìm keys:
notificationKeys.lists("all")    # InfiniteData pages
notificationKeys.lists("unread")
notificationKeys.unreadCount()     # { count: number }
```

### 7.3. React Query cache state

```javascript
// Mở DevTools Console của browser:
const cache = window.__REACT_QUERY_DEVTOOLS__.getQueryCache?.();
// Hoặc truy cập qua React Query devtools panel

// Kiểm tra unread count:
const countQuery = cache.find({ queryKey: ["notifications", "unreadCount"] });
console.log("Count:", countQuery?.state.data?.data.count);

// Kiểm tra list:
const listQuery = cache.find({ queryKey: ["notifications", "lists", "all"] });
console.log("Pages:", listQuery?.state.data?.pages);
console.log(
  "Items in first page:",
  listQuery?.state.data?.pages[0]?.data?.items.length,
);
```

### 7.4. Socket event inspection

```javascript
// Trong DevTools Console, intercept socket events:
// Mở file notification-event-handlers.ts trong DevTools Sources

// Hoặc thêm console.log tạm vào handler:
const handleCreated = (payload) => {
  console.log("[DEBUG] notification:created", payload);
  // ... logic hiện tại
};
```

### 7.5. Network tab

```
1. Mở DevTools → Network → filter "notification"
2. Các request cần thấy:
   - GET /notification → list notifications
   - GET /notification/unread-count → badge count
   - PATCH /notification/:id/read → mark read
   - PATCH /notification/:id/unread → mark unread
   - PATCH /notification/read-all → mark all read

3. KHÔNG nên thấy notification request sau khi:
   - Click item (đáng lẽ chỉ setQueryData, không refetch)
   - Mark read (đáng lẽ chỉ setQueryData + PATCH, không GET)
```

### 7.6. Database inspection

```sql
-- Xem tất cả notification
SELECT id, type, title, recipient_id, read_at, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 20;

-- Xem notification chưa đọc
SELECT COUNT(*) FROM notifications WHERE read_at IS NULL;

-- Check deduplication
SELECT recipient_id, dedupe_key, COUNT(*)
FROM notifications
GROUP BY recipient_id, dedupe_key
HAVING COUNT(*) > 1;
-- Kết quả: 0 rows → dedupe hoạt động đúng
```

---

## 8. Priority fix order

| Priority | Bug                                          | Effort  | Trạng thái     |
| -------- | -------------------------------------------- | ------- | -------------- |
| **P0**   | Bug 1: `readAt` Date vs string               | 5 phút  | ✅ Đã fix (BE)  |
| **P1**   | Bug 2: Transaction cho `createForRecipients` | 15 phút | ⬜ Chưa fix    |
| **P2**   | Bug 3: Verify email auth config              | 10 phút | ⬜ Chưa verify  |
| **P3**   | Bug 4: Bỏ `invalidateQueries` thừa           | 2 phút  | ✅ Đã fix (FE)  |
| **P3**   | Bug 5: `actorId = null` cho read state       | 2 phút  | ✅ Đã fix (BE)  |
| **P3**   | Bug 6: Auto reconnect sau refresh token      | 10 phút | ✅ Đã fix (FE)  |

---

## Thông tin bổ sung

### File quan trọng cần nắm

```
Backend:
- Manage -Task/BE/src/modules/notification/notification-inbox.service.ts
- Manage -Task/BE/src/modules/notification/notification.repository.ts
- Manage -Task/BE/src/modules/notification/notification.service.ts  (email)
- Manage -Task/BE/src/modules/notification/notification.types.ts    (enum types)
- Manage -Task/BE/src/modules/realtime/realtime-event.service.ts   (emit socket)
- Manage -Task/BE/src/modules/realtime/socket.server.ts           (join user room)
- Manage -Task/BE/src/common/service/taskSchedule-cron.service.ts (cron due/overdue)

Frontend:
- FE/src/features/notifications/api/notification-api.ts
- FE/src/features/notifications/hooks/useNotifications.ts
- FE/src/features/notifications/types/index.ts
- FE/src/features/notifications/utils/notification-query-keys.ts
- FE/src/features/notifications/utils/notification-navigation.ts
- FE/src/features/realtime/handlers/notification-event-handlers.ts
- FE/src/components/notifications/notification-bell.tsx
- FE/src/components/notifications/notification-center.tsx
```

### Cách thêm notification type mới

1. Thêm enum vào `notification.types.ts`:

```typescript
// BE
export enum NotificationType {
  TASK_DUE_SOON = "TASK_DUE_SOON",
  TASK_ASSIGNED = "TASK_ASSIGNED",
  // Thêm type mới ở đây
  TASK_STATUS_CHANGED = "TASK_STATUS_CHANGED",
}
```

1. Thêm trigger trong service tương ứng (task.service.ts, comment.controller.ts...):

```typescript
await notificationInboxService.createForRecipients({
  recipientIds: [assigneeId],
  actorId: currentUserId,
  type: "TASK_ASSIGNED",
  priority: NotificationPriority.DIRECT,
  title: `Bạn được assign vào task mới`,
  body: `${actorName} đã assign bạn vào task ${taskName}`,
  taskId: taskId,
  projectId: projectId,
  dedupeKey: (recipientId) => `task:${taskId}:assigned:${recipientId}`,
});
```

1. Thêm presenter trên FE để render notification (nếu cần custom UI):

```typescript
// notification-presenter.ts (tạo mới nếu cần)
export function presentNotification(item: NotificationResponse): NotificationUI {
  switch (item.type) {
    case "TASK_ASSIGNED":
      return {
        icon: <UserPlus />,
        color: "blue",
        // ...
      };
    default:
      return { icon: <Bell />, color: "gray" };
  }
}
```

---

Chỉnh sửa lần cuối: 2026-08-24
