# Quản lý thành viên Member của Project & Board (Member Management UI)

> Ngày: 2026-09-15
>
> Mục tiêu: BE + data layer của FE đã hoàn chỉnh cho member (API get/add/remove/
> update-role, React Query hooks, cache appliers, socket events) nhưng **UI chỉ
> mới có "Add member" dialog**. Kế hoạch này xây dựng giao diện **quản lý danh
> sách member** của cả **Project** và **Board**:
>
> 1. Dialog xem **danh sách member** đầy đủ (avatar, tên, email, role).
> 2. **Thêm member** từ bên trong danh sách (tái sử dụng `AddMemberDialog`).
> 3. **Đổi role** (Admin / Member) cho từng member.
> 4. **Xoá member** khỏi project/board.
> 5. Đồng bộ **realtime** ngay khi người dùng khác thay đổi member trên tab khác.
>
> Chỉ thực hiện khi plan được duyệt (theo `.AI/workfollow/agent.md`).

---

## 1. Hiện trạng

**Data layer — đã có đầy đủ (không cần sửa):**

Project → `src/features/projects/`:

| Thành phần | File | Trạng thái |
|---|---|---|
| `GET /project/:projectId/members` → `{ members, totalMembers }` | `api/project-api.ts` | ✅ |
| `POST /project/:projectId/members` `{ userId }` | `api/project-api.ts` | ✅ |
| `PATCH /project/:projectId/members/:memberId` `{ roleId }` | `api/project-api.ts` | ✅ |
| `DELETE /project/:projectId/members/:memberId` | `api/project-api.ts` | ✅ |
| Query `useProjectMembers` | `hooks/useProjectMembers.ts` | ✅ |
| Mutation `useAddMemberProject` / `useRemoveProjectMember` / `useUpdateProjectMemberRole` | `hooks/` | ✅ |
| Cache appliers `applyProjectMemberAdded/Removed/RoleUpdated` | `utils/project-cache.ts` | ✅ |

Board → `src/features/boards/`:

| Thành phần | File | Trạng thái |
|---|---|---|
| `GET /board/:boardId/members` → `BoardMemberUser[]` | `api/board-api.ts` | ✅ |
| `POST /board/:boardId/members` `{ userId }` | `api/board-api.ts` | ✅ |
| `PATCH /board/:boardId/members/:userId/role` `{ roleId }` | `api/board-api.ts` | ✅ |
| `DELETE /board/:boardId/members/:userId` | `api/board-api.ts` | ✅ |
| Query `useBoardMembers` | `hooks/useBoardMembers.ts` | ✅ |
| Mutation `useAddMemberBoard` / `useRemoveMemberBoard` / `useUpdateBoardMemberRole` | `hooks/` | ✅ |
| Cache appliers `applyBoardMemberAdded/Removed/RoleUpdated` | `utils/board-cache.ts` | ✅ |

**⚠️ Lưu ý bất đối xứng API (dễ nhầm):**

| Scope | Remove / Update role nhận id nào? |
|---|---|
| Project | **`memberId`** (id của bản ghi membership — `ProjectMemberResponse.id`) |
| Board | **`userId`** (id của user — `BoardMemberUser.id`, vì `boardMemberId` chỉ là id bản ghi) |

Nghĩa là:
- Project: `useRemoveProjectMember({ projectId, memberId })` với `memberId = member.id`.
- Board: `useRemoveMemberBoard(boardId, projectId)(userId)` với `userId = member.id`.

**UI — hiện chỉ có:**

| Chức năng | File | Trạng thái |
|---|---|---|
| Search-by-email dialog (generic, dùng chung project/board) | `src/components/projects/addMember-dialog.tsx` → `AddMemberDialog` | ✅ |
| Wrapper thêm member project | `src/components/projects/addMember-project.tsx` → `DialogAddMemberProject` | ✅ |
| Wrapper thêm member board | `src/components/projects/addMember-board.tsx` → `DialogAddMemberBoard` | ✅ |
| Menu setting project (Add member / Edit / Delete) | `src/components/mainSpace/settingProject-main.tsx` → `MenuSettingProject` | ✅ |
| Menu setting board (Add member / Edit / Delete) | `src/components/projects/settingBoard-project.tsx` → `MenuSettingBoard` | ✅ |
| Avatar stack hiển thị trên card | `boardCard-project.tsx`, `projectCard-main.tsx`, `useBoardsMembers` | ✅ |
| **Xem danh sách member** | — | ❌ chưa có |
| **Đổi role** | — | ❌ chưa có |
| **Xoá member** | — | ❌ chưa có |

**Kết luận:** Toàn bộ hạ tầng đã sẵn sàng; chỉ thiếu **UI layer** gắn các mutation
này vào màn hình. Không cần thay đổi BE, không cần thêm hook/cache mới.

---

## 2. Mục tiêu

1. Mở được dialog **danh sách member** đầy đủ từ:
   - Menu `...` của **ProjectCard** (trang `/projects`).
   - Menu `...` của **BoardCard** (trang `/project/:projectId`).
   - (Optional) nút/avatar stack ở header **Board detail** (`/board/:boardId`).
2. Trong dialog: thêm member, đổi role, xoá member — đều cập nhật UI tức thì
   qua cache appliers hiện có.
3. Đồng bộ **socket realtime**: member mới / bị xoá / đổi role từ tab khác phải
   hiện ngay trong dialog (đã được hỗ trợ bởi `project:member_*` /
   `board:member_*` → cache mutation).
4. Không đổi luật nghiệp vụ: owner/admin/member giữ nguyên quyền từ BE; FE chỉ
   thêm guard để tránh thao tác sai (xoá admin cuối cùng, xoá chính mình…).
5. Tái sử dụng tối đa `AddMemberDialog`, các hook và cache applier hiện có.

---

## 3. Phạm vi

### 3.1. File mới

| File | Vai trò |
|---|---|
| `src/lib/member-roles.ts` | Hằng số role + helper nhãn/isAdmin (source of truth) |
| `src/components/members/member-list-dialog.tsx` | Dialog list member dùng chung (project & board) |
| `src/components/members/member-list-row.tsx` | Hàng member (avatar, tên, email, role dropdown, nút xoá) |
| `src/components/members/manage-members-project.tsx` | `DialogManageMembersProject` — wrapper scope project |
| `src/components/members/manage-members-board.tsx` | `DialogManageMembersBoard` — wrapper scope board |

### 3.2. File sửa

| File | Thay đổi |
|---|---|
| `src/components/mainSpace/settingProject-main.tsx` | Thêm menu item **"Manage members"** + render `DialogManageMembersProject` |
| `src/components/projects/settingBoard-project.tsx` | Thêm menu item **"Manage members"** + render `DialogManageMembersBoard` |
| `src/components/boards/detail-board.tsx` _(optional)_ | Nút member ở header board → mở dialog |

### 3.3. Không nằm trong phạm vi (đã có plan khác phụ trách)

- **Ẩn action quản trị theo role / badge Admin-Member trên card** → `role-badge-permission-ui.md`.
- **Phân biệt "Created by me" / "Shared with me"** → `project-board-owner-member-distinction.md`.
- **Fix refresh member trên card khi inviter thêm member** → `add-member-realtime-bug.md` / `project-member-card-refresh.md`.

Plan này **chỉ mở quyền thao tác member-list theo role hiện tại** của current
user (admin thì quản lý, member thì chỉ xem).

---

## 4. Thiết kế chi tiết

### 4.1. Chuẩn hoá dữ liệu member chung — `src/lib/member-roles.ts`

Do shape `ProjectMemberResponse` và `BoardMemberUser` khác nhau, định nghĩa 1
dạng chuẩn **`MemberItem`** và helper role dùng chung:

```ts
export type MemberItem = {
  membershipId: string; // id bản ghi membership: pm.id | bm.boardMemberId
  userId: string;       // pm.userId | bm.id
  name: string;
  email: string;
  avatar: string | null;
  roleId: string;
  isOwner?: boolean;    // project.userId === userId | board.userId === userId
};
```

Helper role (BE roles đã biết: `PROJECT_ADMIN`, `PROJECT_MEMBER`, `BOARD_ADMIN`,
`BOARD_MEMBER`):

```ts
export const MEMBER_ROLE_LABELS: Record<string, string> = {
  PROJECT_ADMIN: "Admin",
  PROJECT_MEMBER: "Member",
  BOARD_ADMIN: "Admin",
  BOARD_MEMBER: "Member",
};

export function getMemberRoleLabel(roleId?: string | null): string {
  return (roleId && MEMBER_ROLE_LABELS[roleId]) || "Member";
}

export function isAdminRole(roleId?: string | null): boolean {
  return Boolean(roleId && roleId.endsWith("_ADMIN"));
}
```

> Ghi chú: `ProjectMemberResponse` có thêm field `role` (tên) nhưng board không
> có — nên ưu tiên dùng `roleId` để resolve label đồng nhất ở cả 2 scope.
> Nếu BE trả role name mới (không có trong map), fallback: hiển thị chữ
> "Admin" nếu `roleId` kết thúc `_ADMIN`, ngược lại "Member".

### 4.2. Dialog list member dùng chung — `member-list-dialog.tsx`

**Props** (giữ cho dialog generic, không biết về project/board):

```ts
interface MemberListDialogProps {
  scope: "project" | "board";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // data
  members: MemberItem[];
  isLoading: boolean;
  isError?: boolean;
  currentUserId: string;   // user đang đăng nhập (so sánh để guard)
  ownerUserId?: string;    // project owner (board có thể truyền null nếu chưa có)
  // actions
  onAddMember: () => void;  // mở AddMemberDialog (wrapper tự xử lý)
  onRemoveMember: (member: MemberItem) => Promise<unknown> | void;
  onChangeRole: (member: MemberItem, roleId: string) => Promise<unknown> | void;
}
```

**Layout** (follow style `AddMemberDialog`: `Dialog` + `DialogContent` rounded-3xl,
icon header, `UserPlus`/`Users`):

- Header: icon + tiêu đề "Members" (+ tên scope) + mô tả số lượng
  (`{totalMembers} member(s)`).
- Thanh tìm kiếm (client-side filter theo name/email) — **không** cần debounce
  call API vì danh sách đã nằm trong cache.
- Nút **Add member** (primary, cạnh thanh search) → mở `AddMemberDialog` scope
  tương ứng.
- Danh sách member: render các `MemberListRow` trong vùng `max-h` scroll
  (tương tự `SearchResults` của `AddMemberDialog`).
- Empty state khi không có member.

**Trạng thái data:**

- `isLoading` → spinner (tái sử dụng pattern `ResultsStatus`).
- `isError` → retry lại `refetch` của hook (wrapper truyền callback).

### 4.3. Hàng member — `member-list-row.tsx`

```ts
interface MemberListRowProps {
  member: MemberItem;
  currentUserId: string;
  isAdminViewer?: boolean;      // current user có quyền quản trị hay không
  onChangeRole: (roleId: string) => void | Promise<unknown>;
  onRemove: () => void | Promise<unknown>;
  isRemoving?: boolean;
  isChangingRole?: boolean;
}
```

Render cho mỗi member:

- `UserAvatar` (avatar hoặc initials) kích thước ~`size-9` (tái sử dụng
  `AddMemberDialog`'s Avatar style hoặc `ui/avatar.tsx`).
- Tên + email (truncate).
- **Badge role**: pill nhỏ hiển thị `getMemberRoleLabel(roleId)`; "Owner" nếu
  `member.isOwner` (owner không bị đổi role).
- **Role dropdown** (chỉ khi `isAdminViewer` và không phải owner):
  - 2 lựa chọn: `Admin` (`*_ADMIN`) / `Member` (`*_MEMBER`).
  - Có thể tái sử dụng `DropdownMenu` (như pattern menu setting hiện có) hoặc
    `Popover`.
- **Nút xoá** (chỉ khi `isAdminViewer`):
  - Click lần 1 → row chuyển sang trạng thái **confirm** ("Remove?" /
    "Cancel") — tránh dùng `window.confirm` (không khớp style app, cồng kềnh).
  - Click confirm → gọi `onRemove`, hiện spinner `Loader2` trong khi `isRemoving`.

**Guard tự vệ ở row:**

1. `member.userId === currentUserId`: nếu là **member cuối cùng có quyền admin**
   (do parent truyền `canRemoveSelf`), chặn xoá chính mình.
2. `member.isOwner`: ẩn role dropdown + nút xoá (owner không thể bị demo/remove
   theo luật BE).
3. Nếu `member.roleId` là admin và tổng số admin `<= 1` → **chặn đổi role
   xuống Member** và **chặn xoá** (tránh khoá ngoài lợi ích ai quản lý).

### 4.4. Wrapper project — `manage-members-project.tsx`

```tsx
export function DialogManageMembersProject({
  projectId,
  open,
  onOpenChange,
}: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading, refetch } = useProjectMembers(projectId);
  const { data: currentUser } = useCurrentUser();
  const { mutateAsync: addMember } = useAddMemberProject();
  const { mutateAsync: removeMember } = useRemoveProjectMember();
  const { mutateAsync: changeRole } = useUpdateProjectMemberRole();

  const members: MemberItem[] = (data?.data?.members ?? []).map((m) => ({
    membershipId: m.id,          // ← dùng memberId cho remove/role
    userId: m.userId,
    name: m.name,
    email: m.email,
    avatar: m.avatar ?? null,
    roleId: m.roleId,
    isOwner: m.userId === ownerProjectUserId, // cần project detail để biết userId
  }));

  // mutations:
  // remove:  ({ projectId, memberId: member.membershipId })
  // role:    ({ projectId, memberId: member.membershipId, roleId })
  // add:     ({ projectId, data: { userId } })
}
```

> Xác định owner: `ProjectResponse.userId` từ `useProject(projectId)` hoặc từ
> item trong list cache (`/projects`). Nếu chưa có thì để `ownerUserId` là
> `undefined` — row chỉ dựa vào guard "admin cuối cùng".

**Quản lý trạng thái add-member:** giữ `openAddMember` (`useState`) trong
wrapper; nút "Add member" trong dialog list đổi giá trị này, render
`<AddMemberDialog scope="project" ... onAdd={(user) => addMember({...})} />` cạnh đó — **giống hệt** cơ chế đang có trong `DialogAddMemberProject`.

### 4.5. Wrapper board — `manage-members-board.tsx`

Tương tự wrapper project nhưng:

```tsx
const { data } = useBoardMembers(boardId);
// BoardResponse.userId đã có → resolve owner như scope project
const { data: boardDetail } = useBoard(boardId);
const ownerUserId = boardDetail?.data?.userId;

const members: MemberItem[] = (data ?? []).map((m) => ({
  membershipId: m.boardMemberId,  // chỉ dùng làm key
  userId: m.id,                    // ← remove/role board dùng userId
  name: m.name,
  email: m.email,
  avatar: m.avatar,
  roleId: m.roleId,
  isOwner: m.id === ownerUserId,
}));

// remove:  useRemoveMemberBoard(boardId, projectId)(member.userId)
// role:    useUpdateBoardMemberRole(boardId, projectId)({ userId: member.userId, roleId })
// add:     useAddMemberBoard(boardId, projectId)(userId)
```

### 4.6. Entry points (menu settings)

**`settingProject-main.tsx`** — thêm item giữa "Add member" và "Edit":

```tsx
const [openManageMembers, setOpenManageMembers] = useState(false);

<DropdownMenuItem onSelect={(e) => {
  e.preventDefault();
  setOpenMenu(false);
  setTimeout(() => setOpenManageMembers(true), 0);
}}>
  <span className="grid size-6 place-items-center rounded-full bg-foreground/4 text-foreground/80">
    <Users className="size-3.5" aria-hidden="true" />
  </span>
  <span>Manage members</span>
</DropdownMenuItem>

<DialogManageMembersProject projectId={project.id}
  open={openManageMembers} onOpenChange={setOpenManageMembers} />
```

**`settingBoard-project.tsx`** — làm tương tự với `DialogManageMembersBoard`
(icon `Users`, cần truyền thêm `projectId` đã có sẵn trong props).

**Optional — header board detail (`detail-board.tsx`):** thêm nút hiển thị
avatar stack + tổng member → mở dialog list member board. Dữ liệu đã có sẵn qua
`useBoardMembers(boardId)`; render `AvatarGroup` (có sẵn trong
`components/ui/avatar.tsx`).

---

## 5. Quy tắc nghiệp vụ & guard

Các luật sau được enforce **server-side** (BE) — FE chỉ chặn trước để tránh
thao tác lỗi và UX xấu:

| # | Luật | Xử lý FE |
|---|---|---|
| 1 | Owner project/board không thể bị đổi role / xoá khỏi scope | Ẩn role dropdown + nút xoá; hiển thị badge **Owner** |
| 2 | Không xoá / demote **admin cuối cùng** (tránh khoá quản trị) | Tính `adminCount`; disable confirm khi `adminCount <= 1` |
| 3 | User không tự xoá chính mình khi là admin duy nhất | Giống luật 2 (adminCount cảnh báo) |
| 4 | Member thường (non-admin) không quản lý member | `isAdminViewer=false` → chỉ xem danh sách, ẩn các action |
| 5 | Xoá chính mình khi là member thường → thoát project | Cho phép (BE tự xử lý); toast thông báo; nếu ở trang `/project/...` → điều hướng về `/projects` |
| 6 | Add member trùng (đã là member) | BE trả lỗi; toast từ mutation hiện có; dialog add đóng lại |

> Guard quyền **"ai là admin thì mở được menu manage"** phụ thuộc field `role`
> của current user trong list — đã có plan `role-badge-permission-ui.md`.
> Trong plan này, nếu thiếu thông tin role, tạm thời **cho phép ai có quyền
> open menu** (giữ đúng hành vi hiện tại: mọi user thấy "Add member" — BE sẽ
> chặn 403 nếu thiếu quyền). Gating chặt hơn sẽ áp dụng sau khi plan role
> badge được merge.

---

## 6. Cache & realtime

**Không cần viết thêm cache applier nào** — dialog chỉ đọc query:
- Project: `useProjectMembers(projectId)` → key `["project-members", projectId]`.
- Board: `useBoardMembers(boardId)` → key `["board-members", boardId]`.

Các mutation `useRemoveProjectMember` / `useUpdateProjectMemberRole` /
`useRemoveMemberBoard` / `useUpdateBoardMemberRole` **đã có `onSuccess` gọi
`applyProjectMember*` / `applyBoardMember*`** → cache members + list cards đều
được cập nhật.

Socket events `project:member_added/removed/role_updated`,
`board:member_added/removed/role_updated` đã được đăng ký trong
`project-event-handlers.ts` / `board-event-handlers.ts` → khi tab khác đổi
member, cache của dialog trên tab hiện tại được mutate → dialog **tự render
lại member mới** (do dùng cùng query key). **Không cần thêm code realtime.**

Lưu ý nhỏ: `useProjectMembers` / `useBoardMembers` đang có `staleTime: 60_000`.
Để dialog luôn mở với dữ liệu mới nhất sau khi quay lại mở lại, có thể set
`refetchOnMount: "always"` khi truyền cho dialog, hoặc để yên vì mutation đã
invalidate cache. **Khuyến nghị:** giữ nguyên; chỉ thêm `refetchOnMount: "always"` nếu test thấy data cũ sau reopen trong <60s.

---

## 7. Phụ thuộc giữa các plan

| Plan | Quan hệ |
|---|---|
| `role-badge-permission-ui.md` | Cung cấp `role` current user → gating menu "Manage members" cho đúng. **Không bắt buộc** để merge plan này (gating tạm thời theo quyền mở menu hiện có) |
| `project-board-owner-member-distinction.md` | Cung cấp khái niệm owner/badge. Phần badge **Owner** trong dialog có thể tận dụng helper resolve từ plan đó nếu merge trước |
| `add-member-realtime-bug.md` / `project-member-card-refresh.md` | Fix card avatar/count khi inviter add member — giúp avatar stack ngoài card khớp với list trong dialog. Không chặn nhau |

Thứ tự khuyến nghị: implement plan này **độc lập**; sau đó merge
`role-badge-permission-ui` để gating + badge trên card.

---

## 8. Thứ tự implement (phases)

**Phase 0 — Nền tảng**
- Tạo `src/lib/member-roles.ts` (`MemberItem`, `getMemberRoleLabel`, `isAdminRole`).

**Phase 1 — Component dùng chung**
- Tạo `member-list-dialog.tsx` + `member-list-row.tsx` (độc lập, chưa cần api).
- Follow style `AddMemberDialog` (Dialog rounded-3xl, framer-motion, `EASE_FLUID`, `pressHover`/`pressTap`).

**Phase 2 — Project**
- Tạo `manage-members-project.tsx`.
- Sửa `settingProject-main.tsx` (thêm item "Manage members").

**Phase 3 — Board**
- Tạo `manage-members-board.tsx`.
- Sửa `settingBoard-project.tsx`.
- (Optional) `detail-board.tsx` header button.

**Phase 4 — Hardening**
- Các guard: admin cuối cùng, self-remove, owner.
- Test realtime 2 tab.

---

## 9. Kiểm tra / Verify

CLI:
- `npm run lint`
- `npm run build` (gồm `tsc -b` type-check)

Manual (cần BE chạy local):
1. Mở `/projects` → menu project → **Manage members** → danh sách hiện đúng.
2. Thêm member (search email) → xuất hiện ngay trong list, avatar stack trên
   card cũng update.
3. Đổi role Admin ⇄ Member → badge đổi ngay; thử demote admin cuối cùng →
   bị chặn.
4. Xoá member → row biến mất, `totalMembers` giảm.
5. Owner project: không thấy role dropdown / nút xoá, có badge Owner.
6. Member (non-admin) mở dialog: chỉ thấy danh sách, không thấy action.
7. **Realtime:** mở 2 tab cùng project, tab A xoá member → tab B dialog cập nhật
   ngay không cần refresh.

---

## 10. Rủi ro & fallback

- **Board không có owner field** — ~~`BoardResponse` thiếu `userId`~~ → đã verify
  ngày 2026-09-20: `BoardResponse.userId` **có sẵn** (`src/features/boards/types/index.ts:13`),
  vậy guard owner scope board hoạt động như project: `useBoard(boardId).data?.data?.userId`.
  Nếu trong tương lai BE thay đổi contract (bỏ field), fallback về guard "admin cuối cùng" + BE.
- **Role name không nằm trong map** (BE thêm role mới): fallback heuristic
  `_ADMIN` / `_MEMBER`; an toàn tuyệt đối nếu không khớp thì hiện "Member".
- **Mutation thành công nhưng response thiếu DTO** (board hooks đã có fallback
  `invalidateQueries`): vẫn đúng, chỉ thêm 1 lần refetch.

---

## 11. Changelog

- 2026-09-15: tạo plan đầy đủ (view/add/role/remove member cho project & board
  + realtime), verify toàn bộ data layer FE đã sẵn sàng.
- 2026-09-20 (cập nhật sau khi đối chiếu code hiện tại):
  - Verify API + hooks + cache appliers khớp plan (project: `useRemoveProjectMember({ projectId, memberId })`,
    `useUpdateProjectMemberRole({ projectId, memberId, roleId })`, `useAddMemberProject({ projectId, data })`;
    board: `useRemoveMemberBoard(boardId, projectId)(userId)`,
    `useUpdateBoardMemberRole(boardId, projectId)({ userId, roleId })`, `useAddMemberBoard(boardId, projectId)(userId)`).
  - ~~Xoá hạn chế "board thiếu owner"~~: `BoardResponse.userId` đã tồn tại
    (`src/features/boards/types/index.ts:13`) → §4.5 dùng `useBoard(boardId).data?.data?.userId`
    để set `isOwner` cho board member; guard "admin cuối cùng" giữ làm lớp phòng thủ thứ 2.
  - Xác nhận entry point chuẩn: `MenuSettingProject` (`settingProject-main.tsx`) và
    `MenuSettingBoard` (`settingBoard-project.tsx`) đều đang có mẫu menu item
    "Add member" (icon `UserPlus`, `DropdownMenuItem` + `setTimeout`) để insert
    item "Manage members" (icon `Users`) đúng chuẩn.
  - Confirm `AddMemberDialog` props: `{ scope: "project" | "board", open, onOpenChange, onAdd(user) }`
    → tái sử dụng trực tiếp cho nút "Add member" trong dialog list.
  - Role constants xác nhận từ BE/plan RBAC: `PROJECT_ADMIN`, `PROJECT_MEMBER`,
    `BOARD_ADMIN`, `BOARD_MEMBER` (đúng như §4.1).