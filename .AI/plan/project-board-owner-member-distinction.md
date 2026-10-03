# Phân biệt Project/Board: "Do mình tạo" vs "Được chia sẻ" (Badge + Filter)

> Ngày: 2026-09-15
> Phạm vi: FE (`src/components/mainSpace/*`, `src/components/projects/*`,
> `src/components/ui/*`, `src/lib/*`, types projects/boards) + BE boards/projects
> (chỉ khi chốt Q2-a — track tabs server-side).
> Trạng thái: Chưa code gì cho tới khi user duyệt quyết định ở §2.

## 1. Hiện trạng

FE hiện **không phân biệt được** project/board nào mình **tạo ra** (owner/actor)
và project/board nào mình chỉ **đang là member** (người khác tạo, mình được thêm).
Cả `view-main.tsx` (list project) lẫn `detail-project.tsx` (list board) render các
card đồng bộ về mặt thị giác: cùng icon tile `bg-primary/10`, cùng avatar stack,
cùng count — không có badge/icon hay nhóm phân loại nào.

**Dữ liệu cần thiết đã có sẵn từ BE (không cần đụng BE):**

| Field | Project | Board |
|---|---|---|
| `userId` (id người tạo/owner) | ✅ FE type đã có + BE trả (`project.res.ts:46,56`) | ⚠️ **BE trả** (`board.res.ts:9,17`) nhưng **FE type thiếu** → thêm |
| `role` / member role | `role?` chưa được populate, KHÔNG cần cho mục tiêu này | không có |

- `GET /project` trả `ProjectResponse.userId` = id người tạo project.
  (`view-main.tsx` chưa từng đọc field này.)
- `GET /board?projectId=` trả `userId` = id người tạo board (mapping qua
  `BoardResponseDto`). FE `BoardResponse` không khai báo nên `unknown`.
- List hiện tại (cả project lẫn board) đều đã là **subset "mình có quyền xem"**:
  project gating `OR [{ owner }, { member }]` (`projects.repository.ts:47-62`),
  board gating bằng `VIEW_PROJECT`. Nên việc phân 2 nhóm chỉ cần so sánh
  `userId` với id của current user.
- Current user id đọc đồng bộ được từ JWT: `authStorage.getTokenPayload()?.userId`
  (`auth-storage.ts:59`, `TokenPayload.userId`), không cần thêm request.

**Lỗ hổng UX cụ thể:**

- `ProjectCard` / `BoardCard` không có bất kỳ tín hiệu "tôi là chủ" nào
  (`projectCard-main.tsx`, `boardCard-project.tsx`).
- Không có tabs/filter để xem "của mình" hay "được chia sẻ".
- Khi `project:created` / `member_added` realtime đẩy project vào cache, badge
  (nếu có) phải tự đúng — hiện cache đã giữ `userId` nên không cần sửa realtime.

## 2. Mục tiêu

1. User nhận diện được **ngay lập tức** project/board nào mình tạo so với
   project/board được chia sẻ, không cần mở vào xem.
2. Cách phân biệt phải **bền vững với dữ liệu hiện có** (không phụ thuộc role/
   permission chưa được populate; không phụ thuộc BE mới).
3. UI/UX giữ nguyên chất lượng: badge nhỏ gọn, đúng design token (light/dark),
   không chèn action, layout card không bị vỡ (truncate, responsive).
4. **Tự động đúng realtime**: khi project/board được chia sẻ thêm cho mình, hoặc
   mình tạo mới, badge/tab cập nhật không cần reload thủ công.
5. (P1, tùy chọn) Có thể filter nhanh "Tất cả / Của mình / Được chia sẻ" — đúng
   count + đúng pagination.

## 3. Quyết định cần người duyệt

- **Q1 — Badge phân biệt (P0, đề xuất: LÀM NGAY, FE-only):**
  Thêm badge "Created by me" / "Shared with me" lên `ProjectCard` & `BoardCard`.
  Rẻ, an toàn, không đụng BE, giải quyết đúng câu hỏi gốc.
- **Q2 — Filter tabs (P1):**
  - **(a) Server-side `scope` query param (đề xuất nếu làm tabs):** thêm
    `scope=created|shared` cho `GET /project` + `GET /board?projectId=`. Count và
    pagination chuẩn, scale tốt.
  - (b) FE-only "fetch lớn + filter client": đổi page size khi chọn tab, tiềm ẩn
    payload nặng, phá pagination; chỉ nên khi không muốn đụng BE.
  - (c) **Không làm tabs**, chỉ badge (scope nhỏ nhất, không đụng BE gì).
  Plan viết theo nhánh (c) cho P0 Mặc định, và mô tả đầy đủ nhánh (a) như P1
  optional — không implement cho tới khi duyệt.
- **Q3 — Accent theo ownership cho icon tile (đề xuất: LÀM LUÔN):**
  Ngoài badge, icon tile (ô folder đầu card) của "Created by me" giữ
  `bg-primary/10 text-primary ring-primary/10`; card "Shared with me" chuyển sang
  neutral (`bg-foreground/5 text-muted-foreground ring-foreground/10`). Giúp nhận
  diện nhanh bằng màu vùng, không phá layout.

## 4. Rule resolve ownership (single source of truth)

```ts
// src/lib/membership.ts (mới)
export type MembershipKind = "created-by-me" | "shared-with-me";

export function getCurrentUserId(): string | null {
  return authStorage.getTokenPayload()?.userId ?? null;
}

export function resolveMembership(
  entityOwnerId: string | null | undefined,
  currentUserId: string | null,
): MembershipKind {
  if (currentUserId && entityOwnerId === currentUserId) {
    return "created-by-me";
  }
  return "shared-with-me";
}
```

- **Project:** `entityOwnerId = project.userId`.
- **Board:** `entityOwnerId = board.userId` (FE type thêm field).
- Nguyên tắc: list đầu vào luôn là "mình được quyền xem" → mặc định `shared` khi
  không khớp owner là đúng. Nếu `userId` thiếu (bất thường) → rơi về `shared`,
  không crash.
- Nhóm nghĩa lý: creator luôn là member (tự động được thêm `PROJECT_ADMIN` khi
  tạo, `projects.service.ts:143-159`), nên "created-by-me" ⊆ "member". Hai nhóm
  hiển thị là **created-by-me** và **phần còn lại (shared-with-me)** — không trùng.

## 5. Thiết kế UI/UX

### 5.1. Badge trên card (P0)

- 1 component `MembershipBadge` đặt **cạnh tên** trong header row của card, ngay
  sau icon folder (không phải góc phải — góc phải đã có nút `⋮`).
- Nhìn:

```text
[📁] Project Alpha                    ← icon tile + tên + badge
      ...description...          
```

- Thông số:
  - `Created by me`: pill `rounded-full`, `bg-primary/10 text-primary`,
    `ring-1 ring-inset ring-primary/20`, icon `Crown` (lucide) `size-3`,
    label `text-[11px] font-medium` → "Created by me".
  - `Shared with me`: pill neutral `bg-muted text-muted-foreground`,
    `ring-1 ring-inset ring-border/60`, icon `Users`/`Share2`, label → "Shared
    with me".
  - `title` attr giải thích ("You created this project/board" / "Shared with you")
    để tooltip tự hoạt động.
- Layout: header row hiện là `<div className="flex items-start gap-3.5">` → đổi
  thành wrap badge ở right của cột tên (`.min-w-0.flex-1`). Tên vẫn truncate,
  badge shrink-0, mobile không vỡ.

### 5.2. Accent icon tile theo ownership (Q3)

| Trạng thái | Icon tile |
|---|---|
| created-by-me | `bg-primary/10 text-primary ring-1 ring-inset ring-primary/10` (giữ nguyên) |
| shared-with-me | `bg-foreground/5 text-muted-foreground ring-1 ring-inset ring-foreground/10` (mới) |

Áp dụng cho cả `ProjectCard` lẫn `BoardCard`. Dùng đúng semantic token → sáng/tối
tự đúng.

### 5.3. Filter tabs (P1 — nhánh Q2-a)

- Segmented pill control ngay dưới toolbar (`Toolbar: search + create`), trước
  grid: `All` | `Created by me` | `Shared with me`.
- Nút dạng pill giống search input (rounded-full, `bg-card border-border/80`),
  active dùng primary fill / ring; smooth transition; reduced-motion friendly.
- Chọn tab ≙ đổi `scope` tham số query → server lọc đúng + pagination đúng count.
- Khi đổi tab: reset `page = 1` (giống search).
- Toolbar "X projects / Page Y of Z" phản ánh scope đang chọn (vì nó đọc
  `pagination` trả về của scope đó).

## 6. Chi tiết FE thay đổi (P0 — badge + accent)

### 6.1. Types

**`src/features/boards/types/index.ts`** — thêm field vốn BE đã trả:

```ts
export type BoardResponse = {
  _count?: { lists?: number; tasks?: number };
  id: string;
  name: string;
  description?: string;
  projectId: string;
  userId: string;        // ← thêm: id người tạo board (owner)
  listCount: number;
  memberCount: number;
};
```

`ProjectResponse.userId` đã có sẵn — không đổi.

### 6.2. Tạo `src/lib/membership.ts`

Thêm đúng code ở §4 (có thể xuất kèm `type BoardResponseOwnership` nếu cần).
Import `authStorage` từ `@/features/auth/storage/auth-storage`.

### 6.3. Tạo `src/components/ui/membership-badge.tsx`

```tsx
interface MembershipBadgeProps {
  owned: boolean;
  labelOwner?: string;   // mặc định "Created by me"
  labelMember?: string;  // mặc định "Shared with me"
}
```

Render pill theo §5.1. Không render gì khi thiếu thông tin cần thiết (không bắt
buộc — vì `owned` luôn boolean; nếu muốn "unknown" → để `owned?: boolean`,
`undefined` → `null`).

### 6.4. `ProjectCard` (`src/components/mainSpace/projectCard-main.tsx`)

- Props thêm: `owned?: boolean` (hoặc `ownerId` + tự resolve — chọn `owned` để
  card không phụ thuộc current user, view quyết định).
- Header row: thêm `MembershipBadge` theo §5.1 + áp accent tile theo §5.2.

### 6.5. `BoardCard` (`src/components/projects/boardCard-project.tsx`)

- Props thêm: `owned?: boolean`. Áp dụng y hệt §6.4.

### 6.6. `view-main.tsx` (list project)

- Lấy `currentUserId` 1 lần (module/component level):
  `const currentUserId = useMemo(() => getCurrentUserId(), []);`
- Truyền vào `ProjectCard`: `owned={project.userId === currentUserId}` (dùng
  `resolveMembership` cho rõ intent).

### 6.7. `detail-project.tsx` (list board)

- Same pattern, `owned={board.userId === currentUserId}` truyền vào `BoardCard`.

### 6.8. Realtime — KHÔNG cần sửa

Cache project/board đã lưu `userId`; `applyProjectCreated`, `applyProjectUpdated`,
cache board upsert đều merge nguyên entity → badge tự đúng ngay khi realtime
cập nhật. (Verify ở §8 mục 7.)

## 7. P1 — Filter tabs server-side scope (chỉ khi duyệt Q2-a)

### 7.1. BE project

- `src/modules/projects/dtos/request/getAllProject.req.ts`: thêm
  `scope?: "created" | "shared"` + `getAllProjectRequestQuery` thêm
  `scope: z.enum(["created", "shared"]).optional()`.
- `src/modules/projects/projects.repository.ts` — `getAccessibleProjectsWhere`
  nhận thêm `scope: "created" | "shared" | undefined`:
  - mặc định: giữ nguyên (`OR owner/member`).
  - `created`: `{ ...where, AND: [{ OR: name filter }, { userId }] }`.
  - `shared`: accessible (OR owner/member) `AND userId: { not }`:
    ```ts
    where: {
      status, deletedAt: null,
      userId: { not: userId },
      OR: [{ userId }, { projectMembers: { some: { userId, status ACTIVE, deletedAt null } } }],
      AND: name-filter,
    }
    ```
  (accessible + `userId NOT me` hợp logic: nếu tôi là owner thì tôi luôn ở
  created, không lọt shared.)
- `projects.service.ts` `getAllProject`: truyền `scope` vào repository.
- Không đổi response — vẫn có `userId` để badge.

### 7.2. BE board

- `src/modules/board/dtos/requests/getAllBoard.req.ts`: thêm `scope`.
- `src/modules/board/board.controller.ts` `getAllBoards`: truyền thêm
  `userId: user.id` + `scope` (hiện chưa truyền userId).
- `src/modules/board/board.repository.ts` `getBoards`: thêm `scope` →
  - `created`: `userId: currentUserId`
  - `shared`: `userId: { not: currentUserId }` (kết hợp điều kiện projectId
    như cũ). Board list vốn đã gating bằng VIEW_PROJECT nên "không phải của tôi"
    = share với tôi.
  - mặc định: không lọc theo userId.
- `board.service.ts` `getAllBoards`: pass 2 giá trị trên.

### 7.3. FE

- `projectApi.getAll(page, limit, name?, scope?)` + `boardApi.getAllByProjectId(projectId, page, limit, name?, scope?)` thêm param `scope`.
- `useProjects/page` + `useBoards` nhận `scope`.
- Query key: thêm scope vào giữa:
  - `projectKeys.list(page, limit, name, scope?)` →
    `["projects","list", page, limit, name ?? null, scope ?? null]`.
  - `boardKeys.list(...similar)`.
- **Cập nhật helper đọc key**: `listMatchesNameFilter` trong
  `project-cache.ts:26-38` đang đọc `queryKey[4]` là name. Khi thêm scope, name
  dịch chuyển — đổi cách lấy name theo index mới (hoặc đọc index cố định sau khi
  chốt shape). `isFiltering` ở `upsertProjectInLists` (dòng 95-96) cũng đọc `key[4]`
  → bám cùng shape.
- Board cache tương tự (`board-cache.ts` — grep `queryKey[` nơi đọc list key).
- UI tabs: state `scope` trong `view-main.tsx` & `detail-project.tsx`, reset page
  khi đổi, render segmented pills (§5.3).

## 8. Test plan (manual)

1. Login user A → tạo project → project đó hiện badge **"Created by me"** (primary
   pill + icon crown), icon tile primary.
2. User A mời user B → B đăng nhập → cùng project đó hiện badge **"Shared with
   me"** (muted pill), icon tile neutral.
3. B vào project (của B là member) → board do B tạo → badge "Created by me";
   board do A tạo (trong cùng project) → badge "Shared with me".
4. B board `⋮` menu không bị ảnh hưởng (không thuộc phạm vi plan) — verify không
   regression.
5. Title dài: tên truncate, badge vẫn hiện đủ; màn hình mobile xếp đúng, không tràn.
6. Dark + light theme: badge/ring đúng token, không hardcode màu.
7. **Realtime:** A đang mở list project; B tạo project mới + thêm A → project
   xuất hiện trên list A với badge "Shared with me" không cần reload. A tạo
   project (socket online) → badge "Created by me" ngay.
8. (P1-a) Tabs: đếm chính xác theo scope, đổi tab reset page=1, phân trang đúng,
   kết hợp search hoạt động.
9. Không dùng `any`; đúng naming conventions.
10. `npm run build` (tsc -b && vite build), `npm run lint` pass.

## 9. File plan

### P0 (FE-only)

```text
Tạo:
src/lib/membership.ts                      // getCurrentUserId + resolveMembership
src/components/ui/membership-badge.tsx     // badge Created/Shared

Sửa:
src/features/boards/types/index.ts         // BoardResponse + userId
src/components/mainSpace/projectCard-main.tsx  // badge + accent tile + prop owned
src/components/projects/boardCard-project.tsx  // badge + accent tile + prop owned
src/components/mainSpace/view-main.tsx         // pass owned
src/components/projects/detail-project.tsx     // pass owned
```

Không đổi: BE, cache, realtime, api layer.

### P1 (Q2-a — BE nhỏ + FE)

```text
BE:
src/modules/projects/dtos/request/getAllProject.req.ts   // + scope
src/modules/projects/projects.repository.ts               // scope filter
src/modules/projects/projects.service.ts                  // pass scope
src/modules/board/dtos/requests/getAllBoard.req.ts        // + scope
src/modules/board/board.controller.ts                     // pass userId + scope
src/modules/board/board.repository.ts                     // scope filter
src/modules/board/board.service.ts                        // pass scope

FE:
src/features/projects/api/project-api.ts                  // + scope param
src/features/boards/api/board-api.ts                      // + scope param
src/features/projects/hooks/useProjects.ts                // + scope
src/features/boards/hooks/useBoards.ts                    // + scope
src/features/projects/utils/project-query-keys.ts         // + scope vào key
src/features/boards/utils/board-query-keys.ts             // + scope vào key
src/features/projects/utils/project-cache.ts              // cập nhật index đọc key
src/features/boards/utils/board-cache.ts                  // cập nhật index đọc key
src/components/mainSpace/view-main.tsx                    // tabs UI + state scope
src/components/projects/detail-project.tsx                // tabs UI + state scope
src/components/ui/project-board-scope-tabs.tsx            // segmented pills (mới)
```

## 10. Definition of Done

- Mọi project card & board card hiển thị badge phân biệt **Created by me** /
  **Shared with me**, resolve từ `userId`.
- List page và board page truyền đúng `owned`; badge + accent tile đúng token
  sáng/tối; layout truncate/responsive không vỡ.
- Badge cập nhật chính xác qua realtime (created / member_added) không cần reload.
- (P1) Tabs All / Created / Shared hoạt động với đúng count + pagination (server
  scope) hoặc quyết định Q2-c (chỉ badge).
- Lint + tsc pass; không dùng `any`.

## 11. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| `BoardResponse.userId` chưa chắc BE deploy đồng bộ | Field này đã có trong DTO BE (`board.res.ts`) — chỉ FE type thiếu; nếu thiếu runtime → badge fallback "Shared", không crash. |
| Tabs (P1) đổi shape query key làm cache helper lệch index | Cập nhật `listMatchesNameFilter`/`isFiltering` cùng lúc; thêm test tay §8-mục 8. |
| Accent tile mới khiến card "cùn" so với bản cũ | Tint rất nhạt (foreground/5), giữ ring 1px, không đổi size/layout. |
| Current user id lấy từ token lệch với id thật | `TokenPayload.userId` chính là id dùng cho request (`userId` từ JWT); sẵn sàng fallback `useCurrentUser().data?.data.id` nếu cần cross-check. |

## 12. Ngoài phạm vi (follow-up)

- Gating permission theo role Admin/Member (đã có plan riêng
  `role-badge-permission-ui.md`) — không trộn vào plan này.
- Hiển thị "được chia sẻ" trong member list/avatar tooltip.
- Sắp xếp ưu tiên owner lên đầu grid.

## 13. Update log

### 2026-09-15 — Tạo plan

Xác minh BE trả `userId` cho cả project (`project.res.ts:46`) và board
(`board.res.ts:9`); FE project type đã có `userId`, board type thiếu → plan đưa
vào P0. Chốt phân loại 2 nhóm dựa trên so sánh `userId` với current user id
(đọc từ JWT, không cần request thêm). Tabs để ở P1 tùy chọn server-side scope.