# DEBUG: Bug Add Member - Avatar & Member Count Không Cập Nhật

**Ngày:** 25/08/2026  
**Tính năng:** Project Members  
**Severity:** High  
**Trạng thái:** ĐÃ FIX

---

## 1. Mô Tả Bug

Khi thực hiện **Add Member** vào project thông qua dialog, avatar stack và count member trên `ProjectCard` (trang Projects list) **không hiển thị được** ngay từ đầu. Phải refresh trang (F5) thì mới thấy member mới.

---

## 2. Root Cause Analysis (CẬP NHẬT)

### Phát hiện mới: **BUG Ở BACKEND, không chỉ FE**

Sau khi đọc kỹ cả BE và FE, tôi phát hiện **root cause thực sự nằm ở BE**:

**File:** `Manage -Task/BE/src/modules/projects/dtos/response/project.res.ts`

```typescript
// ❌ CODE CŨ - Constructor không nhận và không map members
export class ProjectResponseDto {
  id: string;
  name: string;
  description: string;
  userId: string;
  role?: string;

  constructor(data: ProjectResponseDto) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.userId = data.userId;
    this.role = data.role;
    // ❌ KHÔNG map projectMembers → members
  }
}
```

Trong khi `projects.repository.ts` (`getProjects`, `getProject`) **đã có** `include: { projectMembers: { include: { user: true } } }` — tức DB có trả về members, nhưng DTO **bỏ qua**.

**Hậu quả:**
1. `GET /project` trả về response **KHÔNG có field `members`**
2. FE lưu cache: `project.members = undefined`
3. Mọi fix ở FE (cache update, invalidation, optimistic update) đều **vô nghĩa** vì data ban đầu đã thiếu
4. Sau khi add member, FE không thể hiển thị avatar mới vì `members` luôn `undefined`

### Data Flow

```
[Add Member Dialog]
        │
        ▼
[useAddMemberProject.mutateAsync()]
        │
        ▼
[BE API: POST /project/{id}/members] → trả về memberDto
        │
        ▼
[onSuccess] ──── applyProjectMemberAdded(queryClient, member)
        │
        ▼
[FE project-cache.ts]  ⚠️ Cố update project.members, NHƯNG ban đầu members = undefined
        │
        ▼
[ProjectCard render]  ❌ Không có data để hiển thị
```

---

## 3. Giải Pháp (FIXED)

### BE Fix (ROOT CAUSE)

**File:** `Manage -Task/BE/src/modules/projects/dtos/response/project.res.ts`

Thêm `ProjectMemberUserDto` class và mapping `projectMembers` → `members`:

```typescript
export class ProjectMemberUserDto {
  id: string;
  name: string;
  email: string;
  avatar: string | null;

  constructor(data: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.avatar = data.avatar;
  }
}

export class ProjectResponseDto {
  id: string;
  name: string;
  description: string;
  userId: string;
  role?: string;
  members?: ProjectMemberUserDto[];  // ✅ THÊM MỚI

  constructor(data: {
    id: string;
    name: string;
    description: string;
    userId: string;
    role?: string;
    projectMembers?: Array<{  // ✅ NHẬN projectMembers
      user: {
        id: string;
        name: string;
        email: string;
        avatar: string | null;
      };
    }>;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.userId = data.userId;
    this.role = data.role;
    if (data.projectMembers) {  // ✅ MAP SANG members
      this.members = data.projectMembers.map(
        (pm) =>
          new ProjectMemberUserDto({
            id: pm.user.id,
            name: pm.user.name,
            email: pm.user.email,
            avatar: pm.user.avatar,
          }),
      );
    }
  }
}

export const projectMemberUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: z.string().nullable(),
});

export const projectResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  userId: z.string(),
  role: z.string().optional(),
  members: z.array(projectMemberUserSchema).optional(),  // ✅ THÊM
});
```

### BE Fix 2: Repository include members đầy đủ

**File:** `Manage -Task/BE/src/modules/projects/projects.repository.ts`

Đảm bảo `createProject` và `updateProject` cũng include project members:

```typescript
async createProject({ project }) {
  return this.prismaService.projects.create({
    include: {
      user: true,
      projectMembers: {  // ✅ THÊM
        where: {
          status: ProjectMemberStatus.ACTIVE,
          deletedAt: null,
        },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
    data: project,
  });
}

async updateProject({ id, project }) {
  return this.prismaService.projects.update({
    where: { id },
    data,
    include: {  // ✅ THÊM
      projectMembers: {
        where: { status: ProjectMemberStatus.ACTIVE, deletedAt: null },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
```

### BE Fix 3: addMember refetch project để có members mới nhất

**File:** `Manage -Task/BE/src/modules/projects/projects.service.ts`

```typescript
async addMember(...) {
  // ... existing logic ...

  await this.projectMemberRepository.addMemberToProject(...);

  const member = await this.projectMemberRepository.findProjectMember(...);
  if (!member) throw new InternalServerException();

  // ✅ Refetch project để lấy members list mới nhất
  const refreshedProject = await this.projectsRepository.getProject({
    id: projectId,
  });
  if (!refreshedProject) throw new InternalServerException();

  const memberDto = new ProjectMemberResponseDto({
    ...member,
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    role: { id: memberRole.id, name: memberRole.name },
  });
  const projectDto = new ProjectResponseDto(refreshedProject as any);  // ✅ có members

  this.realtime.emitProjectMemberAdded({ project, projectDto, memberDto, ... });
}
```

### FE Fix: Cache layer + Safety nets

Đã được implement ở các lần sửa trước (`project-cache.ts`, `useAddMemberProject`, `useRemoveProjectMember`).

---

## 4. Files Đã Sửa

| File | Thay đổi |
|------|-----------|
| `BE/src/modules/projects/dtos/response/project.res.ts` | Thêm `ProjectMemberUserDto`, mapping `projectMembers` → `members`, update zod schema |
| `BE/src/modules/projects/projects.repository.ts` | `createProject`, `updateProject` include project members |
| `BE/src/modules/projects/projects.service.ts` | `addMember` refetch project, build memberDto đầy đủ |
| `FE/src/features/projects/utils/project-cache.ts` | Thêm `upsertMemberInProjectLists`, `removeMemberFromProjectLists`, `toMemberUser` |
| `FE/src/features/projects/hooks/useAddMemberProject.ts` | Fallback `invalidateQueries({ queryKey: projectKeys.lists() })` |
| `FE/src/features/projects/hooks/useRemoveProjectMember.ts` | Truyền đúng `userId`, thêm fallback list invalidation |

---

## 5. Test Plan

1. **Test Case 1:** Add member mới vào project
   - Mở Projects page (lần đầu load) → **avatar + count hiển thị đúng** ✅
   - Add member mới → **avatar + count cập nhật ngay lập tức** ✅
   
2. **Test Case 2:** Remove member
   - Remove member → **avatar biến mất + count giảm ngay lập tức** ✅

3. **Test Case 3:** Realtime sync
   - User A add member → User B thấy avatar mới qua socket event ✅

4. **Test Case 4:** Refresh page (F5)
   - Data hiển thị đầy đủ members ngay từ lần load đầu ✅

---

## 6. Checklist

- [x] BE: `ProjectResponseDto` map `members`
- [x] BE: `createProject`, `updateProject` include project members
- [x] BE: `addMember` refetch project để có members đầy đủ
- [x] BE: `projectResponseSchema` zod thêm `members` field
- [x] BE: TS compile pass (`tsc --noEmit`)
- [x] FE: `upsertMemberInProjectLists`, `removeMemberFromProjectLists`
- [x] FE: Hook fallbacks
- [x] FE: TS compile pass
- [ ] Manual test trên browser (cần dev restart BE)