# DEBUG: Avatar Color Không Đồng Bộ Giữa Các User

**Ngày:** 04/09/2026
**Tính năng:** User Avatar / Member Display
**Severity:** High
**Trạng thái:** CHƯA FIX

---

## 1. Mô Tả Bug

Khi hiển thị avatar của một user (member) trên giao diện, **mỗi lần fetch/trang reload hoặc mỗi user khác nhau sẽ thấy avatar có màu nền khác nhau**. Avatar không đồng bộ - User A thấy User B với màu xanh, User B thấy chính mình với màu đỏ, refresh trang lại thấy màu khác.

---

## 2. Root Cause Analysis

### Nguyên nhân chính: `background=random` trong ui-avatars.com URL

**File:** `Manage -Task/BE/src/modules/auth/auth.service.ts:51`

```typescript
// ❌ background=random → mỗi HTTP request trả về MÀU KHÁC NHAU
const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(registerDto.name)}&background=random&color=fff&size=256`;
```

**File:** `Manage -Task/BE/prisma/schema.prisma:143`

```typescript
// ❌ Cũng dùng background=random
avatar  String? @default("https://ui-avatars.com/api/?name=User&background=random")
```

### Cách ui-avatars.com hoạt động với `background=random`:

1. User đăng ký → URL `https://ui-avatars.com/api/?name=John&background=random` được **lưu vào DB**
2. URL này **giữ nguyên** trong DB, KHÔNG thay đổi
3. NHƯNG `background=random` khiến **server ui-avatars.com tạo màu ngẫu nhiên mới trên MỖI HTTP request**
4. Kết quả:

- User A load trang → browser fetch avatar URL → ui-avatars.com trả về màu **XANH**
- User B load trang → browser fetch cùng URL → ui-avatars.com trả về màu **ĐỎ**
- User A refresh → fetch lại → giờ thành màu **VÀNG**
- Mỗi lần mở tab mới, mỗi lần F5, mỗi lần user khác xem → màu đều khác

### Data Flow表现出问题:

```
[DB lưu avatar URL]
    │
    │  https://ui-avatars.com/api/?name=John&background=random
    │
    ▼
[User A browser fetch] → ui-avatars.com → trả về ảnh màu #3498DB ✅
[User B browser fetch] → ui-avatars.com → trả về ảnh màu #E74C3C ❌ KHÁC!
[User A refresh]       → ui-avatars.com → trả về ảnh màu #2ECC71 ❌ LẠI KHÁC!
```

### Tại sao avatar Cloudinary thì OK nhưng default avatar thì lỗi?

- **Avatar Cloudinary** (user upload): URL trả về đúng 1 file ảnh cụ thể → luôn giống nhau ✅
- **Avatar ui-avatars.com** (default): URL là API endpoint, `random` param khiến mỗi request trả về ảnh mới → không đồng bộ ❌

### Vị trí các file liên quan:

| File                                                            | Vai trò                                                 | Có bug?                                 |
| --------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------- |
| `BE/src/modules/auth/auth.service.ts:51`                        | Tạo default avatar URL khi đăng ký                      | ❌ **NGUỒN GỐC BUG**                    |
| `BE/prisma/schema.prisma:143`                                   | Default value trong DB schema                           | ❌ **Cũng dùng random**                 |
| `BE/src/modules/user/dtos/response/myInfo.res.ts:26`            | Trả avatar từ DB (có dùng getCloudinaryDisplayImageUrl) | ✅ OK (nhưng utility ko fix đc random)  |
| `BE/src/modules/projects/dtos/response/projectMember.res.ts:35` | Trả avatar member trong project                         | ✅ OK (trả raw URL từ DB)               |
| `FE/src/components/users/user-avatar.tsx`                       | Component hiển thị avatar                               | ✅ OK (hiển thị đúng URL nhận được)     |
| `FE/src/utils/getAvatarUrl.ts`                                  | Xử lý Cloudinary URL optimization                       | ✅ OK (pass-through cho ui-avatars URL) |

---

## 3. Giải Pháp Đề Xuất

### Fix chính: Tạo màu deterministic từ name

Thay `background=random` bằng màu được hash từ tên user, đảm bảo cùng tên → cùng màu.

**Option A (Khuyến nghị): Dùng hàm hash đơn giản ở BE**

```typescript
// Thêm utility function
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 45%)`;
}

// Hoặc dùng hex color palette cố định
function nameToHexColor(name: string): string {
  const colors = [
    '1ABC9C', '2ECC71', '3498DB', '9B59B6', '34495E',
    'E67E22', 'E74C3C', 'F1C40F', '16A085', '27AE60',
    '2980B9', '8E44AD', '2C3E50', 'D35400', 'C0392B',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Auth service
const hexColor = nameToHexColor(registerDto.name);
const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(registerDto.name)}&background=${hexColor}&color=fff&size=256`;

// Prisma schema default (cũng cần fix)
avatar  String? @default("https://ui-avatars.com/api/?name=User&background=3498DB")
```

### Fix phụ: Cleanup data cũ (migration)

Tất cả user hiện tại đã có URL `background=random` trong DB → cần update lại URL cho determinism:

```sql
-- Cần script migration để update avatar URL cho user chưa upload avatar
-- Logic: chỉ update avatar chứa "background=random"
UPDATE users
SET avatar = REPLACE(avatar, 'background=random', 'background=3498DB')
WHERE avatar LIKE '%background=random%';
```

---

## 4. Files Cần Sửa

| File                                     | Thay đổi                                                     |
| ---------------------------------------- | ------------------------------------------------------------ |
| `BE/src/modules/auth/auth.service.ts:51` | Thay `background=random` bằng màu deterministic hash từ name |
| `BE/prisma/schema.prisma:143`            | Thay default `background=random` bằng màu cố định            |
| **Migration script**                     | Update avatar URL cho user hiện tại có `background=random`   |

---

## 5. Test Plan

1. **Test Case 1:** Đăng ký user mới

- Đăng ký → avatar có màu deterministic ✅
- Reload trang → màu avatar **KHÔNG thay đổi** ✅

2. **Test Case 2:** Đồng bộ giữa các user

- User A xem profile User B → thấy avatar màu X ✅
- User B xem chính mình → cũng thấy avatar màu X ✅
- User C xem User B → cũng thấy avatar màu X ✅

3. **Test Case 3:** User cùng tên → cùng màu

- Đăng ký 2 user name "John" → avatar có **cùng màu nền** ✅

4. **Test Case 4:** User khác tên → khác màu

- "John" và "Jane" → avatar có **màu nền khác nhau** ✅

5. **Test Case 5:** User upload avatar mới

- Upload avatar → Cloudinary URL thay thế → hiển thị đúng ✅

6. **Test Case 6:** Existing users

- User đã đăng ký cũ (có background=random) sau migration → avatar determinstic ✅

---

## 6. Checklist

- [ ] BE: Tạo utility `nameToHexColor()` hoặc tương đương
- [ ] BE: Fix `auth.service.ts` dùng màu deterministic
- [ ] BE: Fix `prisma/schema.prisma` default avatar
- [ ] BE: Tạo migration script update data cũ
- [ ] FE: Không cần fix (hiển thị đúng URL từ BE)
- [ ] Test: Avatar màu đồng bộ giữa các user
- [ ] Test: Avatar giữ nguyên màu khi refresh
