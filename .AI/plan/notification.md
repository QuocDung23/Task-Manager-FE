# Notification v2 - Task Activity va System Notification

> Cap nhat ngay 2026-08-23 dua tren code hien tai cua `FE` va
> `Manage -Task/BE`.
>
> Day la implementation plan, chua phai code implementation. Plan tach ro hai
> khai niem de tranh tron audit log cua task voi inbox ca nhan.

## 1. Muc tieu

He thong notification gom hai trai nghiem khac nhau:

1. **Task Activity**: lich su thay doi nam trong task detail. Activity tra loi
   cau hoi "task nay da thay doi nhu the nao, ai thay doi, luc nao?".
2. **System Notification**: inbox ca nhan tren toan app. Bell hien unread count,
   notification moi co the hien toast khi user dang online, va user co the mo
   bell de xem lai, mark read/unread va click vao context lien quan.

```text
Business action / scheduler
        |
        +--> Task Activity (task-scoped, audit history)
        |
        +--> System Notification (user-scoped, read/unread inbox)
                         |
                         +--> REST: durable source of truth
                         +--> Socket.IO: realtime delivery
                         +--> Toast: transient presentation khi app dang active
```

Mot business action co the tao activity, notification, ca hai, hoac khong tao
gi. Khong dung socket event hien tai nhu database history vi user offline hoac
reconnect se mat event.

## 2. Pham vi va nguyen tac

### 2.1. Task Activity

- Gan voi `taskId`, khong gan voi mot recipient cu the.
- Moi user con quyen xem task deu co the xem cung mot timeline.
- Khong co read/unread, badge, toast hoac mark-read.
- Luu actor, event type, snapshot metadata va thoi gian.
- Uu tien du lieu co y nghia: ten/tag/member/date truoc va sau thay doi.
- Activity la append-only. Khong sua history khi entity bi rename ve sau.
- Khong tao activity o FE sau mutation thanh cong; BE tao cung business action
  de khong mat history khi action den tu cron, API khac hoac client khac.

### 2.2. System Notification

- Gan voi `recipientId`, moi user co inbox rieng.
- Co `readAt`, unread count, bell, list All/Unread va deep link.
- Luu DB truoc, sau commit moi emit `notification:created` vao
  `user:{recipientId}`.
- REST la source of truth; Socket.IO chi giup cap nhat ngay khi dang dung app.
- Toast khong phai notification thu ba. Toast chi la cach hien tam thoi cua mot
  notification da duoc luu trong inbox.
- Mac dinh khong notify actor ve hanh dong actor vua thuc hien.
- Chi gui den user can phan ung hoac bi anh huong truc tiep, khong broadcast moi
  thay doi cua task cho tat ca member.

### 2.3. Ten mien su dung trong code

- Feature trong task detail: `task-activities`, khong dat ten `notifications`.
- Feature bell/inbox: `notifications`.
- Realtime event dung qua khu hoan thanh: `task:activity_created` va
  `notification:created`.
- `pinTag` trong yeu cau duoc hieu la gan/bo tag tren task. Code hien tai dang
  dung `task:tags_updated`; plan dung activity `TASK_TAG_ADDED` va
  `TASK_TAG_REMOVED` de UI hien duoc diff ro rang.

## 3. Event matrix

### 3.1. P0 can lam

| Business event | Task Activity | System Notification | Recipient inbox |
|---|---:|---:|---|
| Tao task | `TASK_CREATED` | Khong | - |
| Doi ten task | `TASK_NAME_CHANGED` | Khong | - |
| Sua description | `TASK_DESCRIPTION_CHANGED` | Khong | - |
| Assign member | `TASK_ASSIGNEE_ADDED` | `TASK_ASSIGNED` | User vua duoc assign, tru actor |
| Unassign member | `TASK_ASSIGNEE_REMOVED` | `TASK_UNASSIGNED` | User vua bi go, tru actor |
| Gan tag | `TASK_TAG_ADDED` | Khong | - |
| Bo tag | `TASK_TAG_REMOVED` | Khong | - |
| Dat schedule | `TASK_SCHEDULE_SET` | Khong | - |
| Reschedule | `TASK_RESCHEDULED` | `TASK_RESCHEDULED` | Assignee hien tai, tru actor |
| Xoa schedule | `TASK_SCHEDULE_CLEARED` | `TASK_SCHEDULE_CLEARED` | Assignee hien tai, tru actor |
| Due soon | `TASK_DUE_SOON` | `TASK_DUE_SOON` | Assignee hien tai |
| Qua han va bi lock | `TASK_OVERDUE_LOCKED` | `TASK_OVERDUE_LOCKED` | Assignee hien tai |
| Unlock | `TASK_UNLOCKED` | `TASK_UNLOCKED` | Assignee hien tai, tru actor |
| Doi status action | `TASK_STATUS_CHANGED` | P0 chi notify `IN_REVIEW`, `DONE`, `CANCELLED` | Assignee khac, tru actor |
| Comment moi | Khong chen vao activity P0 | `TASK_COMMENTED` | Assignee, tru actor |
| Reply comment | Khong chen vao activity P0 | `TASK_COMMENT_REPLIED` | Tac gia root comment, tru actor |

Comment da co panel va pagination rieng. Khong tron comment vao activity trong P0
de tranh duplicate content va hai cursor khac nhau trong cung mot list. Neu product
muon timeline hop nhat o P1, BE can tra mot feed canonical chung.

### 3.2. Notification toan he thong ngoai task

| Event | Notification | Recipient | Deep link |
|---|---|---|---|
| Them vao project | `PROJECT_MEMBER_ADDED` | Member vua duoc them | `/project/:projectId` |
| Them vao board | `BOARD_MEMBER_ADDED` | Member vua duoc them | `/board/:boardId` |
| Doi role | `MEMBER_ROLE_CHANGED` | Member bi doi role | Project/board tuong ung |
| Bi remove | `MEMBER_REMOVED` | Member bi remove | Mo parent neu con quyen, neu khong hien fallback |

### 3.3. Chua lam trong P0

- Browser Web Push, service worker va OS notification.
- Email cho moi loai event. P0 chi giu email due soon/overdue hien co.
- Notification preferences, email digest, watcher/subscriber va mention.
- Activity cho drag/reorder task/list vi tan suat cao va it gia tri audit.
- Activity cho edit/delete comment vi comment panel da the hien trang thai rieng.

## 4. Backend data model de xuat

FE can hai nguon durable rieng. Khong dung chung mot bang roi them nhieu field
nullable vi ownership, retention, query va read-state cua hai feature khac nhau.

### 4.1. Task activity

```prisma
enum TaskActivityType {
  TASK_CREATED
  TASK_NAME_CHANGED
  TASK_DESCRIPTION_CHANGED
  TASK_ASSIGNEE_ADDED
  TASK_ASSIGNEE_REMOVED
  TASK_TAG_ADDED
  TASK_TAG_REMOVED
  TASK_SCHEDULE_SET
  TASK_RESCHEDULED
  TASK_SCHEDULE_CLEARED
  TASK_DUE_SOON
  TASK_OVERDUE_LOCKED
  TASK_UNLOCKED
  TASK_STATUS_CHANGED
}

model taskActivities {
  id         String           @id @default(uuid())
  taskId     String           @map("task_id")
  task       tasks            @relation(fields: [taskId], references: [id])
  actorId    String?          @map("actor_id")
  actor      users?           @relation(fields: [actorId], references: [id])
  type       TaskActivityType
  metadata   Json?
  dedupeKey  String?          @map("dedupe_key")
  createdAt  DateTime         @default(now()) @map("created_at")

  @@unique([taskId, dedupeKey])
  @@index([taskId, createdAt, id])
  @@map("taskActivities")
}
```

`actorId = null` dai dien cho scheduler/system. `metadata` la snapshot nho
theo event, vi du:

```ts
type TaskActivityMetadata =
  | { from: string; to: string }
  | { user: { id: string; name: string; avatar: string | null } }
  | { tag: { id: string; name: string; color: string } }
  | {
      oldDueDate: string | null;
      newDueDate: string | null;
      oldReminderAt: string | null;
      newReminderAt: string | null;
    };
```

Khong luu full task snapshot hoac description day du. Voi description chi can
`changedFields: ["description"]`; neu can audit noi dung day du thi phai co
security/retention spec rieng. Bang `taskScheduleEvents` hien co co the migrate
vao `taskActivities`, hoac tam thoi adapter ve cung response contract. Khong de
FE goi hai API timeline khac nhau.

### 4.2. System notification

```prisma
enum NotificationPriority {
  NORMAL
  DIRECT
  URGENT
}

model notifications {
  id          String               @id @default(uuid())
  recipientId String               @map("recipient_id")
  recipient   users                @relation("NotificationRecipient", fields: [recipientId], references: [id])
  actorId     String?              @map("actor_id")
  actor       users?               @relation("NotificationActor", fields: [actorId], references: [id])
  type        String
  priority    NotificationPriority @default(NORMAL)
  title       String
  body        String
  projectId   String?              @map("project_id")
  boardId     String?              @map("board_id")
  taskId      String?              @map("task_id")
  commentId   String?              @map("comment_id")
  data        Json?
  dedupeKey   String               @map("dedupe_key")
  readAt      DateTime?            @map("read_at")
  createdAt   DateTime             @default(now()) @map("created_at")

  @@unique([recipientId, dedupeKey])
  @@index([recipientId, createdAt, id])
  @@index([recipientId, readAt, createdAt])
  @@map("notifications")
}
```

`title` va `body` la snapshot de item cu khong thay doi khi task/tag/user
duoc rename. Context ID dung de FE tao deep link; khong luu URL tuyet doi.

### 4.3. Transaction rule

Trong mot business action:

1. Validate permission va doc state cu.
2. Update domain data.
3. Tinh diff canonical.
4. Insert activity va cac notification row trong cung Prisma transaction.
5. Commit.
6. Emit activity vao `task:{taskId}` va notification vao tung
   `user:{recipientId}` theo best-effort.

Khong emit socket truoc commit. Loi socket khong rollback action. Cron due/overdue
phai co `dedupeKey` on dinh de retry khong tao duplicate.

## 5. REST contract

### 5.1. Task activity API

```http
GET /task/:taskId/activities?cursor=<opaque>&limit=20
```

```ts
type TaskActivityResponse = {
  id: string;
  taskId: string;
  type: TaskActivityType;
  actor: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type TaskActivityListResponse = {
  success: true;
  data: {
    items: TaskActivityResponse[];
    nextCursor: string | null;
  };
};
```

- Sort `createdAt DESC, id DESC`; cursor encode ca hai field.
- Default 20, max 50.
- Endpoint tai su dung permission view task hien co.
- Khong co create/update/delete activity API public.

### 5.2. Notification inbox API

```http
GET   /notification?filter=all|unread&cursor=<opaque>&limit=20
GET   /notification/unread-count
PATCH /notification/:notificationId/read
PATCH /notification/:notificationId/unread
PATCH /notification/read-all
```

Canonical item:

```ts
type NotificationResponse = {
  id: string;
  type: NotificationType;
  priority: "NORMAL" | "DIRECT" | "URGENT";
  title: string;
  body: string;
  actor: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  context: {
    projectId: string | null;
    boardId: string | null;
    taskId: string | null;
    commentId: string | null;
  };
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};
```

`read-all` nhan `{ before: string }`. FE chup timestamp khi user click de
khong mark-read notification moi vua den trong luc request dang chay. Mark
read/unread phai idempotent va chi update item thuoc authenticated user; ID cua
user khac tra 404 de khong leak data.

## 6. Realtime contract

Them vao `FE/src/features/realtime/contracts/realtime-events.ts`:

```ts
type TaskActivityCreatedPayload = RealtimeEnvelope<{
  activity: TaskActivityResponse;
}>;

type NotificationCreatedPayload = RealtimeEnvelope<{
  notification: NotificationResponse;
}>;

type NotificationReadStateChangedPayload = RealtimeEnvelope<{
  notificationId: string;
  readAt: string | null;
}>;

type NotificationReadAllPayload = RealtimeEnvelope<{
  before: string;
  readAt: string;
}>;

type ServerToClientEvents = {
  "task:activity_created": (payload: TaskActivityCreatedPayload) => void;
  "notification:created": (payload: NotificationCreatedPayload) => void;
  "notification:read_state_changed": (
    payload: NotificationReadStateChangedPayload,
  ) => void;
  "notification:read_all": (payload: NotificationReadAllPayload) => void;
};
```

- Activity emit den task room ma detail hien tai da join bang `useTaskSocket`.
- Notification emit den user room ma BE da auto-join sau JWT authentication.
- FE upsert theo entity `id`, khong prepend mu de tranh duplicate.
- `eventId` dedupe frame trong session; entity `id` dedupe data canonical.
- Reconnect invalidate activity dang mo, notification lists va unread count de
  bu cac event bi lo khi offline.
- Sau khi v2 chay, bo listener `notification:new` payload cu trong
  `useTaskSocket.ts`; khong duy tri hai contract song song lau dai.

## 7. UX Task Activity trong task detail

### 7.1. Bo cuc

Task detail hien tai chia main panel va comments panel. P0 them tabs
`Comments | Activity` o dau panel ben phai:

- Default tab: `Comments` de khong thay doi workflow hien tai.
- `Activity` dung cung vung scroll, khong render card long card.
- Desktop giu kich thuoc dialog hien tai.
- Mobile tabs sticky trong panel, noi dung khong lam tran dialog.

Moi activity item gom avatar/icon system, cau mo ta, optional value diff va
relative time. Vi du:

- `Minh assigned Lan to this task`
- `Lan added label Backend`
- `System marked this task overdue and locked it`
- `An changed status from In progress to In review`

Khong ghep text o BE thanh mot cau duy nhat. BE tra type + metadata snapshot; FE
renderer map type thanh UI. `aria-label` phai chua cau co nghia day du.

### 7.2. State va interaction

- Initial skeleton, empty state, inline retry va `Load older activity`.
- Event moi duoc prepend realtime; khong auto-scroll neu user dang xem history cu.
- Khong co unread dot hoac badge trong task activity.
- Actor system dung icon `Bot` hoac `Clock`; actor user dung `UserAvatar`.
- Tag hien color swatch; schedule hien local date/time bang utility hien co.
- Metadata khong hop le fallback thanh `Task was updated`, dong thoi log warning
  o development; khong lam crash ca dialog.

## 8. UX System Notification

### 8.1. Bell va notification center

Bell la global action, mount mot lan trong `MainLayout`, khong dat lap lai trong
tung page header.

- Desktop: icon button o goc phai app bar, mo `Popover` rong 380-420px.
- Mobile: cung bell, mo `Sheet` gan full width.
- Badge hien `1..99`, tren 99 hien `99+`, an khi count bang 0.
- Tooltip `Notifications`; `aria-label="Notifications, 7 unread"`.
- Header center co title, tabs `All | Unread` va `Mark all as read`.
- List co avatar/icon, title, body, relative time va unread dot.
- Click item unread: optimistic mark read, dong overlay, sau do navigate.
- Moi item co action trong menu de `Mark as read` hoac `Mark as unread`.
- Co loading, empty, error/retry va load-more states; text dai khong de timestamp
  hoac action bi overlap.

### 8.2. Toast khi dang dung app

- `URGENT`: luon toast khi app visible.
- `DIRECT`: toast khi app visible va notification den tu user/action khac.
- `NORMAL`: chi cap nhat inbox va badge.
- Khi `document.visibilityState !== "visible"`, khong toast; item van vao inbox.
- Toast click dung chung navigation resolver voi notification item.
- Dedupe toast theo notification ID.
- Khong toast cac socket event chi dung dong bo cache nhu
  `task:tags_updated`, `task:assignments_updated`.

### 8.3. Deep link

Project/board dung route hien co. Task dung query parameter:

```text
/board/:boardId?taskId=:taskId
/board/:boardId?taskId=:taskId&tab=comments&commentId=:commentId
/board/:boardId?taskId=:taskId&tab=activity
```

`DetailBoard` doc search params, fetch task theo ID neu task chua nam trong page
cache, sau do goi provider mo dialog. Khi dong dialog, xoa cac query param bang
`replace` de URL khong giu task cu. Neu 403/404, item van duoc mark read va hien
toast ngan `You no longer have access to this item`.

## 9. Frontend architecture va file plan

### 9.1. Task activity feature

Tao:

```text
src/features/task-activities/
├── api/task-activity-api.ts
├── hooks/useTaskActivities.ts
├── types/index.ts
├── utils/task-activity-query-keys.ts
└── utils/task-activity-presenter.ts

src/components/tasks/activity/
├── task-activity-panel.tsx
├── task-activity-list.tsx
├── task-activity-item.tsx
├── task-activity-empty.tsx
└── task-activity-skeleton.tsx
```

Sua:

- `task-detail-comments-panel.tsx`: doi thanh panel co tabs hoac tao
  `task-detail-side-panel.tsx` va giu comments section hien co.
- `task-detail-content.tsx`: doc tab tu context/search params.
- `task-detail-context.ts` va provider: expose active detail tab.
- `task-activity-event-handlers.ts`: upsert activity vao first page cache.
- `useTaskSocket.ts`: register activity handler va invalidate activity khi
  reconnect.

Query key de xuat:

```ts
taskActivityKeys.all;
taskActivityKeys.list(taskId); // ["task-activities", "list", taskId]
```

`useTaskActivities` dung `useInfiniteQuery`. TanStack Query la owner cua
server state; khong copy timeline vao Zustand.

### 9.2. Notification inbox feature

Tao:

```text
src/features/notifications/
├── api/notification-api.ts
├── hooks/useNotifications.ts
├── hooks/useUnreadNotificationCount.ts
├── hooks/useMarkNotificationRead.ts
├── hooks/useMarkNotificationUnread.ts
├── hooks/useMarkAllNotificationsRead.ts
├── types/index.ts
├── utils/notification-navigation.ts
└── utils/notification-query-keys.ts

src/components/notifications/
├── notification-bell.tsx
├── notification-center.tsx
├── notification-list.tsx
├── notification-item.tsx
├── notification-empty.tsx
└── notification-skeleton.tsx
```

Sua:

- `main-layout.tsx`: them compact global app bar va mount mot bell.
- `realtime-events.ts`: them canonical notification contracts.
- `notification-event-handlers.ts`: upsert list, cap nhat count va toast.
- `useTaskSocket.ts`: go listener `notification:new` cu.
- `useGlobalRealtime()`: register notification handler mot lan; reconnect
  invalidate list/count; logout clear notification cache.
- `detail-board.tsx` va task detail provider: deep link theo query params.

Query keys:

```ts
notificationKeys.all;
notificationKeys.list("all");
notificationKeys.list("unread");
notificationKeys.unreadCount();
```

Mark read/unread cap nhat optimistic tat ca list cache va count, co snapshot de
rollback khi API loi. Count luon clamp ve `>= 0`. Event realtime trung ID khong
duoc tang count lan hai.

### 9.3. Global ownership va auth lifecycle

- Bell chi mount trong protected `MainLayout`.
- Socket handler chi register trong `useGlobalRealtime()` o `App.tsx`.
- Login/app mount bootstrap unread count bang REST.
- Reconnect va window focus refetch count; khong polling lien tuc.
- Logout/disconnect phai `removeQueries` cho `notifications` va
  `task-activities` de user tiep theo trong cung tab khong thay cache cu.
- React StrictMode mount/unmount phai cleanup dung callback de khong duplicate
  listener.

## 10. Thu tu implementation

### Milestone 0 - chot contract

1. Chot event matrix P0 va recipient rule.
2. Chot canonical DTO, enum/type va deep-link format.
3. Chot viec migrate `taskScheduleEvents` hay adapter vao activity API.

Output: FE va BE cung dung mot contract, khong implementation bang payload tam.

### Milestone 1 - BE Task Activity

1. Migration `taskActivities`, repository va list API.
2. Tao helper append activity nhan transaction client.
3. Gan trigger update name/description, assignment diff, tag diff, schedule va
   status action.
4. Emit `task:activity_created` sau commit.
5. Them permission, cursor va dedupe tests.

Output: history reload van con va client khac thay activity realtime.

### Milestone 2 - FE Task Activity

1. Types/API/query keys/infinite hook.
2. Tabs Comments/Activity va day du UI states.
3. Presenter cho moi P0 type.
4. Realtime prepend/dedupe va reconnect reconcile.
5. Responsive va accessibility verification.

Output: task detail co timeline dung voi update, assignment, tag va schedule.

### Milestone 3 - BE System Notification

1. Migration notification, repository, list/count/read/unread/read-all API.
2. Notification service loai actor, dedupe recipients, persist trong transaction.
3. Realtime created/read-state/read-all vao user room.
4. Gan P0 trigger: assignment, schedule critical, selected status, comments va
   membership.
5. Giu email due/overdue la secondary channel.

Output: user offline van thay inbox khi quay lai; read state ben vung.

### Milestone 4 - FE Bell va inbox

1. Types/API/hooks va optimistic cache update.
2. Global app bar, bell/badge, desktop popover va mobile sheet.
3. All/Unread, load more, read/unread/read-all.
4. Global realtime, toast policy va multi-tab read sync.
5. Task/comment/activity deep link va access fallback.

Output: notification den realtime khi dang dung app va xem lai duoc qua bell.

### Milestone 5 - hardening

1. Retention cleanup theo config, vi du read 90 ngay/unread 180 ngay.
2. Distributed cron lock/row claiming cho nhieu BE instance.
3. Metrics: created, deduped, socket emit failed, unread query latency.
4. Them P1 event sau khi do notification volume.

## 11. Test plan

### 11.1. Backend

- Business action va activity/notification row commit cung nhau.
- Rollback action khong de lai activity hoac notification mo coi.
- Assignment replace chi tao diff added/removed, khong tao cho user khong doi.
- Tag replace tao dung activity add/remove voi snapshot name/color.
- Due/overdue retry khong duplicate nho `dedupeKey`.
- Activity API check quyen xem task va cursor khong duplicate/bo item.
- Inbox chi tra item cua authenticated user.
- Mark read/unread/read-all idempotent; ID cua user khac tra 404.
- Actor bi loai khoi recipient; scheduler van notify assignee.
- Socket chi emit sau commit va dung task/user room.

### 11.2. Frontend automated

- Activity renderer co fallback an toan cho metadata khong hop le.
- `task:activity_created` trung ID chi prepend mot lan.
- `notification:created` trung ID chi tang count va toast mot lan.
- Optimistic read/unread cap nhat ca All, Unread va count; loi API rollback dung.
- Read-all khong tac dong item co `createdAt > before`.
- Reconnect invalidate dung keys; logout clear cache user cu.
- Bell badge hien dung 0, 1 va 99+; aria-label dung unread count.
- Deep link mo dung board/task/tab/comment.
- StrictMode khong de lai listener duplicate.

### 11.3. Manual hai user/hai tab

1. User A doi name, gan tag, schedule task; ca A va B dang mo task thay activity
   moi dung mot lan.
2. A assign B; task activity ghi A da assign B, B nhan inbox + badge + toast.
3. B offline, A reschedule; B login lai thay notification tu REST.
4. B mo hai tab; mark read tab 1 thi badge tab 2 cap nhat realtime.
5. Click notification assignment/reschedule mo dung task; click comment mo dung
   Comments tab va thread.
6. Trigger due soon/overdue; activity, inbox, task state va email khong duplicate.
7. B mat quyen board sau khi notification duoc tao; click item co fallback 403/404
   va app khong crash.
8. Logout B, login C cung tab; C khong thay badge/list/cache cua B.

## 12. Definition of Done

- Task Activity va System Notification la hai model/API/query cache rieng.
- Update task, assignment, tag va schedule co activity durable dung actor/diff.
- Activity trong task detail reload van con va cap nhat realtime.
- Notification inbox van con sau reload/offline, co read/unread va unread count.
- Bell chi co mot global owner, responsive tren desktop/mobile va accessible.
- Notification moi cap nhat badge/list ngay; toast tuan theo priority va app
  visibility.
- Socket event trung/reconnect/multi-tab khong tao duplicate.
- Click notification mo dung project/board/task/tab hoac co fallback khi mat quyen.
- Actor/recipient/dedupe/transaction rules co test.
- Khong co browser push va preference trong P0.

## 13. Quyet dinh mac dinh de team co the bat dau

- P0 dung tabs `Comments | Activity`, default `Comments`.
- Assignment va membership la `DIRECT`; due soon/overdue la `URGENT`; con lai
  la `NORMAL` tru khi product doi priority.
- Reschedule/clear/unlock notify cac assignee khac; set schedule lan dau chi ghi
  activity de giam spam.
- Status chi notify khi vao `IN_REVIEW`, `DONE`, `CANCELLED`.
- Comment khong chen vao Activity P0.
- Khong notify actor ve action cua chinh ho.
- Cursor pagination, khong dung offset cho ca hai feed.
- Retention de xuat: activity theo vong doi task; notification read 90 ngay,
  unread 180 ngay, cau hinh o BE.

Nhung default nay du de implement P0. Team chi can mo lai neu product muon notify
tat ca member cho moi update, vi thay doi do se lam notification volume va
recipient model khac dang ke.
