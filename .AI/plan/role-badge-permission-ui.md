# Phân biệt Admin/Member trên Project & Board (Role Badge + Gating action)

> Ngày: 2026-09-10
>
> Mục tiêu: UI hiện không phân biệt được project/board nào người dùng là **Admin**
> hay **Member**. Backend đã có RBAC hoàn chỉnh (`PROJECT_ADMIN`/`PROJECT_MEMBER`,
> `BOARD_ADMIN`/`BOARD_MEMBER`) nhưng FE **chưa dùng role nào**. Plan này:
>
> 1. Backend trả `role` của current user kèm theo list/detail project & board.
> 2. FE hiển thị badge **Admin/Member** trên `ProjectCard` & `BoardCard`.
> 3. FE **ẩn các action quản trị** (Add member / Edit / Delete) với member.
>
> Chỉ thực hiện khi plan được duyệt (theo `.AI/workfollow/agent.md`).

---

## 1. Hiện trạng

**Backend (RBAC đã có sẵn, đầy đủ):**

- `roles`: `PROJECT_ADMIN`, `PROJECT_MEMBER`, `BOARD_ADMIN`, `BOARD_MEMBER`.
- Permission middleware: `verifyProjectPermission` / `verifyBoardPermission` đã
  enforce server-side (member không gọi được update/delete/add-member). Nếu FE
  không gating, member sẽ gặp 403 khi bấm menu.
- Seed mapping:
  - `PROJECT_ADMIN` → full project + **toàn bộ BoardPermissions** (quản lý được
    mọi board trong project).
  - `PROJECT_MEMBER` → view project, tạo board, **không** quản trị board.
  - `BOARD_ADMIN` → quản trị board đó (update/delete/member).
  - `BOARD_MEMBER` → chỉ view + tạo list/task.

**Lỗ hổng:**

- `GET /project` → `ProjectResponseDto` có field `role?` nhưng **không bao giờ
  được populate** (`projects.repository.ts` không include role, service không tính).
- `GET /board` → `BoardResponseDto` **không có role** nào.
- `GET /board/:boardId/members` → `BoardMemberResponseDto` chỉ trả `roleId`,
  **không trả tên role**.
- FE `MenuSettingProject` / `MenuSettingBoard` render **Add member / Edit /
  Delete cho mọi user** — member thấy menu rồi bị 403.
- `ProjectCard` / `BoardCard` chỉ hiển thị avatar + count, không có badge phân
  biệt Admin/Member.

---

## 2. Mục tiêu

1. **Backend:** mọi response list/detail của project & board đều trả role của
   current user để FE gating đúng theo quyền thực tế.
2. **UI:** ProjectCard & BoardCard hiển thị badge `Admin` / `Member` rõ ràng.
3. **Gating:** member không nhìn thấy các action quản trị (Add member / Edit /
   Delete) của project & board; không thấy nút đổi tên project trên trang chi tiết.
4. Không đổi luật nghiệp vụ (owner không đổi/không xoá role), chỉ expose + hiển thị.
5. Badge và gating phải **đồng bộ realtime** khi admin khác thay đổi role của
   current user trên một tab khác.

---

## 3. Quy tắc resolve role (single source of truth)

### 3.1. Project role của current user

```ts
function resolveProjectRole(project, currentUserId): ProjectRole {
  if (project.userId === currentUserId) return "PROJECT_ADMIN"; // owner
  const member = project.projectMembers.find(pm => pm.userId === currentUserId);
  return member?.role?.name ?? null; // PROJECT_ADMIN | PROJECT_MEMBER | null
}
```

### 3.2. Board role của current user

Board được `GET /board?projectId=` gating bằng `VIEW_PROJECT` → **mọi project
member đều thấy board, kể cả khi không phải board member**. Vì vậy cần 2 giá trị:

- `role` — role **board-level** của current user: `BOARD_ADMIN` nếu là owner
  (`board.userId`) hoặc board member có role `BOARD_ADMIN`; `BOARD_MEMBER` nếu là
  board member thường; `null` nếu **chưa là board member**.
- `projectRole` — role **project-level** của current user trong project sở hữu
  board (dùng làm fallback badge + nới quyền quản trị khi `PROJECT_ADMIN`).

### 3.3. Quy tắc gating FE (khớp với seed permission backend)

| Action | Được hiển thị khi |
|---|---|
| Menu quản trị project (Add member / Edit / Delete) | `project.role === 'PROJECT_ADMIN'` |
| Đổi tên project (title inline, trang detail) | `project.role === 'PROJECT_ADMIN'` |
| Menu quản trị board (Add member / Edit / Delete) | `board.role === 'BOARD_ADMIN'` **hoặc** `board.projectRole === 'PROJECT_ADMIN'` |

> Lý do: seed cho `PROJECT_ADMIN` bao gồm toàn bộ BoardPermissions nên project
> admin quản trị được mọi board trong project; `BOARD_MEMBER` / `PROJECT_MEMBER`
> thì không.

### 3.4. Badge hiển thị

| Card | Giá trị badge |
|---|---|
| `ProjectCard` | `project.role` → `Admin` / `Member` |
| `BoardCard` | `board.role ?? board.projectRole` → `Admin` / `Member` |

> Board mà current user chưa là board member nhưng là `PROJECT_MEMBER` → badge
> hiện `Member`; là `PROJECT_ADMIN` → `Admin` (đúng với quyền thực tế).

---

## 4. Backend — thay đổi

> Repo backend: `Manage -Task/BE/`. Không đổi DB schema; chỉ sửa DTO/query/service.

### 4.1. Project: trả `role` cho current user

**`src/modules/projects/projects.repository.ts`**

- `getProjects` & `getProject`: thêm include `role` trong `projectMembers`:
  ```ts
  projectMembers: {
    ...
    include: { user: true, role: { select: { name: true } } },
  }
  ```
- Cập nhật type `ProjectWithMembersResult` cho khớp (thêm `role` trên member).

**`src/modules/projects/dtos/request/getProject.req.ts`**

- `GetProjectRequestDto`: thêm field `userId: string` (dùng cho `getProjectById`).
- `getProjectRequestQuery`: KHÔNG nhận `userId` từ query (strict) — controller tự
  set từ `req.user.id` trong code, pass trực tiếp vào DTO constructor (giữ
  `projectId`/`name`/`status` từ params/query như cũ).

**`src/modules/projects/projects.controller.ts`**

- `getProjectById`: truyền `userId: user.id` vào DTO.

**`src/modules/projects/projects.service.ts`**

- `getProjectById`: tính `role` theo §3.1 với `getProjectDto.userId`, truyền vào
  `ProjectResponseDto`.
- `getAllProject`: đã có `userId` trong DTO → tính `role` theo §3.1 cho từng
  project; nếu owner → `PROJECT_ADMIN`, else role name của membership.
- `createProject`: set `role: 'PROJECT_ADMIN'` (creator).

**`src/modules/projects/dtos/response/project.res.ts`**

- Giữ `role?: string` (đã có). Cập nhật type constructor để nhận `projectMembers`
  có `role: { name }`. Không đổi shape response khác.

> Kết quả: `GET /project` & `GET /project/:projectId` trả
> `{ ..., "role": "PROJECT_ADMIN" | "PROJECT_MEMBER" | null }`.

### 4.2. Board: trả `role` + `projectRole` cho current user

**`src/modules/board/dtos/requests/getAllBoard.req.ts`**

- `GetAllBoardRequestDto`: thêm `userId: string`.

**`src/modules/board/board.controller.ts`**

- `getAllBoards`: truyền `userId: user.id` vào DTO.

**`src/modules/boardMember/boardMember.repository.ts`**

- `getActiveBoardMembersWithUser` / `getActiveBoardMemberWithUser`: include
  `role: { select: { id: true, name: true } }`.
- Thêm method batch lấy role của user trong 1 tập board:
  ```ts
  getUserBoardRoleNameMap(boardIds: string[], userId: string): Promise<Map<string, string>>
  ```
  Query `boardMembers.findMany({ where: { boardId: { in }, userId, status: ACTIVE, deletedAt: null }, select: { boardId: true, role: { select: { name: true } } } })` → map `boardId → roleName`.

**`src/modules/projectMember/projectMember.repository.ts`**

- Thêm `getUserProjectRoleName(projectId: string, userId: string)` trả role name
  (PROJECT_ADMIN/PROJECT_MEMBER/normal role id → map qua `roles.repository`).

**`src/modules/board/board.service.ts`**

- `getAllBoards`: lấy `projectRole` (của `userId` trong `projectId`) + theo từng
  board id gọi batch map `role` theo §3.2. Build `BoardResponseDto` với
  `{ ...board, role, projectRole }`.
- `getBoardById`: dto đã có `userId` → tính tương tự `role` + `projectRole`
  (query boardMembers 1 bản ghi + project role).

**`src/modules/board/dtos/responses/board.res.ts`**

- `BoardResponseDto`: thêm
  ```ts
  role?: string | null;         // BOARD_ADMIN | BOARD_MEMBER | null
  projectRole?: string | null;  // PROJECT_ADMIN | PROJECT_MEMBER | null
  ```
- Đồng bộ `boardResponseSchema` (optional).

**`src/modules/board/dtos/responses/boardMember.res.ts`**

- `BoardMemberResponseDto`: thêm `role: string` (tên role); constructor nhận
  `role: { name: string }`.
- Đồng bộ `boardMemberResponseSchema`.

> Kết quả: `GET /board` trả `{ ..., "role": ..., "projectRole": ... }`;
> `GET /board/:boardId/members` mỗi member trả thêm `"role": "BOARD_ADMIN" | ...`.

---

## 5. Frontend — thay đổi

> Repo FE: `FE/`.

### 5.1. Types (`src/features/projects/types/index.ts`, `src/features/boards/types/index.ts`)

- Export role union + gắn vào response:
  ```ts
  export type ProjectRole = "PROJECT_ADMIN" | "PROJECT_MEMBER";
  export type BoardRole = "BOARD_ADMIN" | "BOARD_MEMBER";
  ```
- `ProjectResponse.role?: ProjectRole | null` (thay `role?: string`).
- `BoardResponse` thêm:
  ```ts
  role?: BoardRole | null;
  projectRole?: ProjectRole | null;
  ```
- `BoardMemberUser` thêm `role?: BoardRole`.

### 5.2. Constants + helpers (`src/lib/roles.ts` — mới)

- Export `PROJECT_ADMIN` / `PROJECT_MEMBER` / `BOARD_ADMIN` / `BOARD_MEMBER` +
  `isProjectAdminRole`, `isBoardAdminRole`, `getRoleLabel(role)` (`"Admin"`/`"Member"`).

### 5.3. `RoleBadge` (`src/components/ui/role-badge.tsx` — mới)

- Props: `role: string | null | undefined`.
- Nhỏ gọn, `rounded-full`, text `[11px]`:
  - `Admin` → primary tone (`bg-primary/10 text-primary ring-primary/20`).
  - `Member` → neutral (`bg-muted text-muted-foreground ring-border/60`).
  - `null`/unknown → không render.

### 5.4. `ProjectCard` (`src/components/mainSpace/projectCard-main.tsx`)

- Thêm prop `role?: ProjectRole | null`.
- Render `RoleBadge role={role}` cạnh tiêu đề (bên phải tên project).

### 5.5. `BoardCard` (`src/components/projects/boardCard-project.tsx`)

- Thêm props `role?: BoardRole | null; projectRole?: ProjectRole | null`.
- Render badge bằng `role ?? projectRole`.

### 5.6. Gating `MenuSettingProject` (`src/components/mainSpace/settingProject-main.tsx`)

- Nếu `project.role !== PROJECT_ADMIN` → trả về `null` (ẩn hẳn nút `⋮`).
- Call site `view-main.tsx` không đổi.

### 5.7. Gating `MenuSettingBoard` (`src/components/projects/settingBoard-project.tsx`)

- Nhận thêm `role?: BoardRole | null`, `projectRole?: ProjectRole | null`.
- Render menu chỉ khi `role === BOARD_ADMIN || projectRole === PROJECT_ADMIN`;
  ngược lại `null`.

### 5.8. Wire dữ liệu vào trang

**`src/components/mainSpace/view-main.tsx`**

- Truyền `role={project.role}` vào `ProjectCard`.

**`src/components/projects/detail-project.tsx`**

- Truyền vào `BoardCard`: `role={board.role ?? null}`,
  `projectRole={board.projectRole ?? null}`.
- Truyền vào `MenuSettingBoard`: `role`, `projectRole`.

### 5.9. Gating đổi tên project (trang detail)

- `detail-project.tsx` thêm `useProject(projectId)` (hook đã có) để lấy
  `role` của current user trong project.
- Chỉ render button bấm để đổi tên (title) khi `role === PROJECT_ADMIN`;
  member thấy title tĩnh (không bấm rename, không rơi vào 403).

### 5.10. Realtime sync badge

Khi admin khác thay đổi role của current user, badge/menu phải tự cập nhật:

**`src/features/projects/utils/project-cache.ts`**

- Thêm `applyProjectRoleToLists(queryClient, projectId, role)`: set `role` mới
  cho project có `id === projectId` trong mọi queryKey `projectKeys.lists()`.

**`src/features/realtime/handlers/project-event-handlers.ts`**

- `handleMemberRoleUpdated`: nếu `member.userId === getCurrentUserId(socket)` →
  gọi `applyProjectRoleToLists(projectId, member.role)`.

**`src/features/boards/utils/board-cache.ts`**

- Thêm `applyBoardRoleToLists(queryClient, projectId, boardId, role)`.

**`src/features/realtime/handlers/board-event-handlers.ts`**

- `handleMemberRoleUpdated`: nếu `member.id === currentUserId` →
  `applyBoardRoleToLists(projectId, boardId, member.role)`.

**`src/features/realtime/handlers/project-event-handlers.ts`** (bổ sung)

- Khi `project.member_added` cho current user mới (role mặc định
  `PROJECT_MEMBER`): `applyProjectRoleToLists(projectId, member.role)` (đã có
  nhánh `applyProjectCreated` cho member mới — thêm update role để badge đúng).
- Khi current user bị `project.member_removed`: board/project đã bị loại khỏi
  list cache qua flow hiện có — không cần thêm.

---

## 6. File plan

### Backend (`Manage -Task/BE/`)

```text
Sửa:
src/modules/projects/projects.repository.ts       // include role trong projectMembers
src/modules/projects/projects.service.ts          // resolve role theo §3.1 + createProject
src/modules/projects/projects.controller.ts       // pass userId (getProjectById)
src/modules/projects/dtos/request/getProject.req.ts
src/modules/projects/dtos/response/project.res.ts // type constructor (role member)
src/modules/board/board.controller.ts              // pass userId vào getAllBoards
src/modules/board/board.service.ts                 // role + projectRole per board
src/modules/board/board.repository.ts              // batch: getUserBoardRoleNameMap
src/modules/boardMember/boardMember.repository.ts  // include role; JSON shape getBoardById
src/modules/projectMember/projectMember.repository.ts // getUserProjectRoleName
src/modules/board/dtos/requests/getAllBoard.req.ts  // + userId
src/modules/board/dtos/responses/board.res.ts       // + role, projectRole
src/modules/board/dtos/responses/boardMember.res.ts // + role (tên)
```

### Frontend (`FE/`)

```text
Tạo:
src/lib/roles.ts                       // role constants + helpers + label
src/components/ui/role-badge.tsx       // badge Admin/Member

Sửa:
src/features/projects/types/index.ts   // ProjectRole, ProjectResponse.role
src/features/boards/types/index.ts     // BoardRole, BoardResponse.role/projectRole, BoardMemberUser.role
src/components/mainSpace/projectCard-main.tsx        // badge
src/components/projects/boardCard-project.tsx        // badge (role ?? projectRole)
src/components/mainSpace/view-main.tsx               // truyền role
src/components/projects/detail-project.tsx           // truyền role + gating rename title + useProject
src/components/mainSpace/settingProject-main.tsx     // gating admin
src/components/projects/settingBoard-project.tsx     // gating admin (role || projectRole)
src/features/projects/utils/project-cache.ts         // realtime: applyProjectRoleToLists
src/features/realtime/handlers/project-event-handlers.ts // sync role khi role thay đổi/added
src/features/boards/utils/board-cache.ts             // realtime: applyBoardRoleToLists
src/features/realtime/handlers/board-event-handlers.ts // sync role board
```

---

## 7. Test plan (manual)

1. Login user A (admin cả project) → ProjectCard hiện badge **Admin**, menu
   Add member/Edit/Delete có đủ.
2. Login user B (member) → ProjectCard hiện badge **Member**, **không thấy** menu
   `⋮`; vào trang detail không bấm được đổi tên.
3. User B mở project có board: board là **BOARD_ADMIN** → badge Admin + menu quản
   trị; board chỉ là BOARD_MEMBER → badge Member + không menu.
4. User B là PROJECT_ADMIN nhưng không phải board member của 1 board → badge
   hiện Admin (fallback projectRole) + có menu quản trị board (đúng quyền seed).
5. `GET /project` response: field `role` xuất hiện, đúng role per user.
6. `GET /board` response: `role` + `projectRole` đúng; `GET /board/:id/members`
   trả thêm `role` tên.
7. Realtime: tab 1 là admin project; tab 2 mở cùng project (member). Tab 1 hạ
   role tab 2 xuống member → tab 2 badge đổi sang Member + menu ẩn (trong vài giây).
8. Dark/light theme: badge dùng token, không hardcode màu.
9. Không dùng `any`; đúng naming conventions (agent.md).

## 8. Definition of Done

- `GET /project` (list & detail) trả `role` của current user.
- `GET /board` (list & detail) trả `role` + `projectRole`.
- `GET /board/:boardId/members` trả `role` tên đầy đủ.
- ProjectCard/BoardCard hiển thị badge Admin/Member đúng.
- Menu quản trị project/board ẩn với member; đổi tên project ẩn với member.
- Gating FE khớp seed permission backend (PROJECT_ADMIN quản trị được mọi board).
- Badge/menu đồng bộ realtime khi role current user thay đổi.
- Lint + typecheck FE/BE pass; không dùng `any`.

## 9. Quyết định mặc định

- Board trả **2 field** `role` + `projectRole` thay vì 1 để giữ đúng quyền
  (project admin có thể quản trị board mà không cần là board admin).
- `MenuSettingProject`/`MenuSettingBoard` **ẩn hẳn nút `⋮`** với member (không
  render menu disabled) — tránh gợi ý action mà backend sẽ từ chối.
- Badge board fallback sang `projectRole` khi user chưa là board member.
- Không tự thêm UI "quản lý member / đổi role" (nằm ngoài phạm vi plan này).

## 10. Ngoài phạm vi (follow-up có thể tách plan riêng)

- UI quản lý member: danh sách member + đổi role + remove member
  (các hook/API đã tồn tại: `useUpdateProjectMemberRole`,
  `useUpdateBoardMemberRole`, `useRemoveProjectMember`, `useRemoveMemberBoard`).
- Gating chi tiết board page (create list / move task / chỉnh sửa task) theo role.
- Hiển thị role trong member list / avatar tooltip.