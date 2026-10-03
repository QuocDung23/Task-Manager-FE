# Lỗi: Search member email chỉ hoạt động khi nhập đúng full email

## Ngày: 2026-09-10

## Triệu chứng 1: Search phải nhập đúng full email mới ra kết quả
- Nhập một phần email (vd: "john", "john@", "john@gma") không trả về kết quả nào

## Nguyên nhân 1
**File:** `Manage -Task/BE/src/modules/user/dtos/request/getUsers.req.ts:19`

```ts
email: z.string().email().optional(),
```

Zod `.email()` yêu cầu định dạng email hợp lệ → validation fail khi nhập partial email.

## Cách khắc phục 1
**File:** `Manage -Task/BE/src/modules/user/dtos/request/getUsers.req.ts`

```ts
// Trước
email: z.string().email().optional(),
// Sau
email: z.string().optional(),
```

---

## Triệu chứng 2: Client research được admin system
- Khi tìm member, admin system (SUPER_ADMIN) cũng hiện trong kết quả search
- Client không nên thấy admin trong danh sách tìm kiếm

## Nguyên nhân 2
**File:** `Manage -Task/BE/src/modules/user/user.repository.ts:32-35`

Query không filter role → tất cả user ACTIVE đều bị trả về, kể cả SUPER_ADMIN.

## Cách khắc phục 2

### Fix 2a: Thêm auth middleware cho GET /user
**File:** `Manage -Task/BE/src/modules/user/user.router.ts:50-54`

```ts
// Trước
router.get("/", validateRequestMiddleware(...), userController.getAllUsers);
// Sau
router.get("/", authMiddleware.verifyAccessToken, validateRequestMiddleware(...), userController.getAllUsers);
```

### Fix 2b: Filter SUPER_ADMIN khỏi kết quả search
**File:** `Manage -Task/BE/src/modules/user/user.repository.ts`

```ts
const where: Prisma.usersWhereInput = {
  ...(status !== undefined ? { status } : {}),
  ...(orConditions.length > 0 ? { OR: orConditions } : {}),
  userRoles: {
    none: {
      role: {
        name: "SUPER_ADMIN",
      },
    },
  },
};
```

Dùng Prisma relation filter `userRoles.none.role.name` để loại trừ user có role SUPER_ADMIN.

---

## Triệu chứng 3: UI nháy khi search
- Khi gõ từng chữ, spinner hiện rồi biến → tạo hiệu ứng nhấp nháy

## Cách khắc phục 3

### Fix 3a: keepPreviousData
**File:** `FE/src/features/users/hooks/useUsers.ts`

```ts
placeholderData: keepPreviousData,
```

### Fix 3b: Debounce 300ms
**File:** `FE/src/components/projects/addMember-dialog.tsx`

Thay `useDeferredValue` bằng debounce state + useEffect 300ms.

### Fix 3c: Spinner chỉ hiện lần đầu
**File:** `FE/src/components/projects/addMember-dialog.tsx`

```ts
// Trước
if (isLoading) return <Spinner/>
// Sau
if (isLoading && !isPlaceholder && users.length === 0) return <Spinner/>
```

---

## Files liên quan
- `Manage -Task/BE/src/modules/user/dtos/request/getUsers.req.ts` - DTO validation (đã fix)
- `Manage -Task/BE/src/modules/user/user.router.ts` - Route (đã fix: thêm auth)
- `Manage -Task/BE/src/modules/user/user.repository.ts` - Prisma query (đã fix: filter SUPER_ADMIN)
- `FE/src/features/users/api/user-api.ts` - API call (giữ nguyên)
- `FE/src/features/users/hooks/useUsers.ts` - React Query hook (đã fix: keepPreviousData)
- `FE/src/components/projects/addMember-dialog.tsx` - Search dialog UI (đã fix: debounce + spinner)
