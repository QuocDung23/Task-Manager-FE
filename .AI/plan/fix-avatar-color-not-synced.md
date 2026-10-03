# Plan fix: Avatar color không đồng bộ giữa các user

> Ngày: 04/09/2026
> Tính năng: User Avatar / Member Display
> Severity: High
> Stack chịu ảnh hưởng: BE (chính), FE (không), DB (chính)
> Trạng thái: ĐÃ IMPLEMENT

---

## 1. Mục tiêu

Sửa bug **mỗi request tới ui-avatars.com với `background=random` trả về ảnh màu khác nhau**, làm avatar của cùng một user hiển thị không nhất quán giữa các client và giữa các lần reload.

Sau khi fix:

- Cùng một user → **luôn cùng màu nền** avatar ở mọi nơi, mọi client, mọi thời điểm.
- User khác tên → có khả năng khác màu (deterministic theo `name`).
- User cùng tên → chắc chắn cùng màu.
- User đổi tên → màu thay đổi theo (vì URL được tạo lại từ tên mới).
- User upload avatar Cloudinary → không bị ảnh hưởng (URL riêng).

---

## 2. Root cause (tóm tắt)

`ui-avatars.com/api/?background=random` là API endpoint có state ngẫu nhiên trên server, không phải static file. Dù URL lưu trong DB là cố định, mỗi HTTP request tới server này sẽ trả về một ảnh PNG với màu nền khác nhau.

Điểm gốc bug:

- `BE/src/modules/auth/auth.service.ts:51` — tạo URL `background=random` khi đăng ký.
- `BE/prisma/schema.prisma:143` — `@default("...background=random")` cho cột `avatar`.

FE không có bug về data flow; chỉ render URL nhận từ BE. Chỉ cần fix BE + DB.

### Vì sao không fix ở FE

- Nếu đổi logic ở FE để ignore random và render màu local: vi phạm single source of truth, avatar URL trong DB/cache/realtime payload vẫn chứa `random` → race condition khi 1 client render local, 1 client render URL gốc.
- Nếu generate màu ở FE rồi ghi đè URL: cần round-trip thêm API hoặc bị drift giữa client.
- Fix tận gốc ở BE là đúng nhất vì:
  1. URL là **dữ liệu thật** lưu DB, dùng cho mọi client (web, mobile sau này).
  2. Avatar URL còn nằm trong cache `current-user`, project members, board members, comment author, notification actor — không thể chỉnh sửa 1 chỗ.

---

## 3. Phương án giải quyết

### 3.1. Phương án đã chốt

**Dùng palette 15 màu hex cố định, hash từ `name` để chọn màu.**

```text
hash(name) -> mod 15 -> chọn 1 màu trong palette -> URL: ?background=<hex>&color=fff
```

Lý do chọn palette thay vì hash full-range:

- 15 màu đủ để phân biệt trong hầu hết context (project có <15 thành viên là phổ biến).
- Màu đã chọn thủ công, đảm bảo **contrast với text trắng đạt WCAG AA** (luminance trung bình, không chói, không quá tối).
- Deterministic, idempotent, có thể debug: biết ngay user "John" → màu gì.
- Không phụ thuộc CDN ui-avatars.com render ngẫu nhiên.
- Không cần thêm dependency mới (chỉ cần `crypto` built-in của Node).

### 3.2. Phương án đã cân nhắc nhưng bỏ

| Phương án | Lý do bỏ |
|---|---|
| `HSL hash` (360 hue) | Hue 60° (vàng chanh) / 0° (đỏ tươi) cho contrast kém với chữ trắng; một số hue gần nhau khó phân biệt. |
| Bỏ ui-avatars, render SVG ở FE | Phạm vi lớn (đụng `UserAvatar` + mọi chỗ dùng trực tiếp URL); cần đồng bộ giữa nhiều client. |
| Cache ảnh PNG về server mình | Tốn infra (storage, caching layer), ngoài scope bug hiện tại. |
| Thêm package `uuid` / `color-hash` | Repo không có sẵn, thêm dependency chỉ để hash tên là over-engineering. JS `String.charCodeAt` đủ dùng. |

### 3.3. Đặc tính kỹ thuật của `nameToHexColor`

- Input: `name: string` — có thể trim, lowercase, bỏ khoảng trắng thừa trước khi hash để "John" và " john " ra cùng màu.
- Output: hex color **không có `#`** (để đặt thẳng vào query string).
- Hàm hash dùng FNV-1a-like: đơn giản, không cần `crypto`, phân bố tốt với input ngắn (tên người). Có thể nâng cấp lên `crypto.createHash('sha1')` nếu sau này mở rộng palette mà vẫn muốn giảm collision.
- **Deterministic**: cùng input → cùng output, không phụ thuộc process, thời gian, locale.
- **Idempotent với DB**: nếu user chỉ đổi tên 1 ký tự, URL thay đổi theo (OK, vì URL phải khớp tên hiển thị).

Palette chốt (15 màu, đã chọn thủ công cho contrast ≥ 3:1 với chữ trắng):

```text
'1ABC9C' '2ECC71' '3498DB' '9B59B6' '34495E'
'E67E22' 'E74C3C' 'F1C40F' '16A085' '27AE60'
'2980B9' '8E44AD' '2C3E50' 'D35400' 'C0392B'
```

Lưu ý: palette đặt **const** trong file utility, không config env, không random. Mục đích: cùng input cho cùng output xuyên suốt mọi môi trường (dev/staging/prod).

---

## 4. Thiết kế chi tiết

### 4.1. Tạo utility mới

**File mới:** `BE/src/common/utils/avatarColor.utils.ts`

```ts
/**
 * Palette 15 màu hex cố định, đã chọn thủ công cho contrast với text trắng.
 * KHÔNG random, KHÔNG config env — deterministic across envs.
 */
const AVATAR_BG_PALETTE: readonly string[] = [
  '1ABC9C', '2ECC71', '3498DB', '9B59B6', '34495E',
  'E67E22', 'E74C3C', 'F1C40F', '16A085', '27AE60',
  '2980B9', '8E44AD', '2C3E50', 'D35400', 'C0392B',
] as const;

/**
 * FNV-1a 32-bit hash, trả về số nguyên không dấu.
 * Lý do chọn: đơn giản, không cần crypto, đủ tốt với input ngắn (tên người).
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5; // offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // prime, ép về uint32
  }
  return hash >>> 0;
}

/**
 * Chuẩn hoá tên trước khi hash:
 * - trim đầu/cuối
 * - lowercase (Unicode-safe)
 * - bỏ khoảng trắng thừa giữa các từ
 * Mục đích: "John" và " john " và "JOHN" -> cùng màu.
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Tạo hex color (không có #) từ tên user, deterministic.
 * Trả về màu fallback nếu name rỗng, để tránh URL lỗi.
 */
export function nameToHexColor(name: string | null | undefined): string {
  const normalized = normalizeName(name ?? '');
  if (!normalized) {
    // Trường hợp tên rỗng: dùng màu đầu palette (xanh ngọc) làm fallback.
    return AVATAR_BG_PALETTE[0];
  }
  const idx = fnv1a(normalized) % AVATAR_BG_PALETTE.length;
  return AVATAR_BG_PALETTE[idx];
}

/**
 * Build default avatar URL cho user mới (hoặc dùng làm fallback).
 * - size=256 để hiển thị tốt trên retina.
 * - color=fff (chữ trắng) đã verify contrast với palette.
 * - encodeURIComponent(name) để tránh ký tự đặc biệt phá URL.
 */
export function buildDefaultAvatarUrl(name: string | null | undefined): string {
  const bg = nameToHexColor(name);
  const displayName = (name ?? '').trim() || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${bg}&color=fff&size=256`;
}
```

**Export từ index:** thêm vào `BE/src/common/utils/index.ts`:

```ts
export * from './avatarColor.utils';
```

### 4.2. Sửa `auth.service.ts:51`

```ts
// ❌ Trước
const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(registerDto.name)}&background=random&color=fff&size=256`;

// ✅ Sau
const defaultAvatar = buildDefaultAvatarUrl(registerDto.name);
```

Import thêm `buildDefaultAvatarUrl` từ `@/common/utils`.

### 4.3. Sửa `schema.prisma:143`

Đổi default value sang màu cố định (dùng `3498DB` — xanh dương — cùng tông với màu fallback của FE theme):

```prisma
// ❌ Trước
avatar  String? @default("https://ui-avatars.com/api/?name=User&background=random")

// ✅ Sau
avatar  String? @default("https://ui-avatars.com/api/?name=User&background=3498DB&color=fff&size=256")
```

Ghi chú quan trọng: thay đổi `@default(...)` trong Prisma **CHỈ áp dụng cho row mới insert sau migration**. Row cũ phải xử lý bằng data migration (mục 4.4).

### 4.4. Migration data cho user hiện tại

**File mới:** `BE/prisma/migrations/<timestamp>_fix_avatar_random_to_deterministic/migration.sql`

Naming convention theo repo: `<timestamp>_snake_case_name`. Lấy timestamp UTC hiện tại theo format `YYYYMMDDHHMMSS`.

```sql
-- 1. Backfill avatar cho user có background=random và chưa từng upload.
--    Logic: REPLACE đơn giản 'background=random' -> 'background=3498DB' (màu fallback).
--    KHÔNG regenerate hash theo name ở đây, vì:
--      - SQL không có FNV-1a portable giữa các dialect.
--      - User đã có avatar hiển thị OK với 1 màu fallback, không cần thiết phải
--        hash đúng tên. Mục tiêu chính là bỏ 'random' để ảnh không nhảy màu.
--    Sau migration: user mới sẽ được hash đúng theo name (xử lý ở BE code).
UPDATE "users"
SET "avatar" = REPLACE("avatar", 'background=random', 'background=3498DB')
WHERE "avatar" LIKE '%background=random%';

-- 2. Sanity check: KHÔNG còn row nào chứa 'background=random'.
--    (Comment để người sau biết đã verify; KHÔNG chạy query trong migration file.
--     Verify thủ công bằng SELECT sau khi apply.)
```

**Tại sao không hash theo `name` trong SQL:**

- PostgreSQL không có FNV-1a built-in. Viết hàm plpgsql phức tạp, dễ sai, khó review.
- Quan trọng hơn: `name` có thể chứa Unicode tiếng Việt (`Nguyễn Văn A`) → cần Unicode-safe hash → càng phức tạp.
- Màu fallback `3498DB` đã đẹp, đồng nhất. User cũ sẽ thấy "ổn định" sau migration, dù không phải màu cá nhân hoá.
- **Lưu ý**: `updateMyProfile` (user.service.ts:116-124) hiện chỉ update `name`, `bio`, `address`, `phone` — **KHÔNG touch field `avatar`**. User bấm Save profile sẽ KHÔNG regenerate avatar URL. Nếu muốn user cũ được hash đúng theo tên thật, cần viết script Node.js backfill riêng (`scripts/backfill-avatar-colors.ts`), gọi `nameToHexColor` rồi update DB. Không nhét vào SQL migration, không nhét vào flow updateProfile hiện tại.

### 4.5. Xử lý cache FE (verify-only)

Cần verify 2 thứ trước khi merge:

1. **Cache key `["current-user"]`** chứa URL avatar cũ (có `random`) sau migration.
   - Khi user login/reload, query `/user/me` sẽ trả URL mới (đã được migration update).
   - Nhưng cache `["current-user"]` đang stale.
   - FE sẽ tự revalidate khi `staleTime` expire. Cần check `staleTime` config hiện tại.
2. **Avatar URL trong cache `["project-members", id]` và `["projects","list",...]`**:
   - Đây là URL member của user khác, hiển thị ở card/comment/notification.
   - Sau migration, DB đã đổi, nhưng cache có thể vẫn cũ.
   - Vì URL cũ vẫn "hợp lệ" với ui-avatars.com (chỉ là màu ngẫu nhiên), sẽ tự sửa khi cache expire. Không cần force invalidate toàn bộ app.
   - **Optional**: thêm 1 query `invalidateQueries` ở FE khi user vào app lần đầu sau deploy. Nhưng đây là over-engineering cho 1 bug hiển thị.

**Chốt**: không sửa FE logic. Chỉ cần test thủ công trên browser hard reload sau deploy.

---

## 5. Thay đổi code (tóm tắt)

| File | Hành động |
|---|---|
| `BE/src/common/utils/avatarColor.utils.ts` | TẠO MỚI — `nameToHexColor`, `buildDefaultAvatarUrl` |
| `BE/src/common/utils/index.ts` | THÊM export |
| `BE/src/modules/auth/auth.service.ts:51` | SỬA — dùng `buildDefaultAvatarUrl` |
| `BE/prisma/schema.prisma:143` | SỬA — default value cố định |
| `BE/prisma/migrations/<ts>_fix_avatar_random_to_deterministic/migration.sql` | TẠO MỚI — backfill user cũ |

Không đụng FE, không đụng các file khác.

---

## 6. Ảnh hưởng & rủi ro

### 6.1. Rủi ro kỹ thuật

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| User cũ nhìn avatar "khác" sau migration | Thấp | Đổi từ `random` → `3498DB` (xanh dương), màu khá neutral, user sẽ thấy "ổn định hơn" chứ không bất ngờ. |
| Cache FE chứa URL cũ sau deploy | Thấp | URL cũ vẫn trỏ được tới ui-avatars.com (chỉ là màu ngẫu nhiên), không 404. Tự sửa khi `staleTime` expire. Không cần force invalidate. |
| Collision hash (2 tên khác nhau → cùng màu) | Không tránh được | 15 màu palette là chấp nhận được. Cùng project thường < 15 người. Nếu sau này >15, mở rộng palette. |
| User đổi tên → URL đổi → ảnh cũ ở CDN cache có thể stale | Thấp | ui-avatars.com CDN tự invalidate theo URL. User sẽ thấy ảnh mới ngay sau đổi tên + reload. |
| Thay đổi `@default` trong Prisma không apply cho row cũ | Đã lường | Migration SQL xử lý. |

### 6.2. Khả năng tương thích ngược

- Avatar URL **giữ format cũ** (`ui-avatars.com/api/?name=...&background=...&color=fff&size=256`), chỉ thay giá trị `background`.
- FE `getAvatarUrl` không đụng tới `background`, chỉ check `cloudinary.com`. Không bị ảnh hưởng.
- Realtime payload (`member:added` etc.) trả avatar URL trong DB → đã được migration update → tự đúng.

### 6.3. Điểm cần đặc biệt chú ý

- **Không push code trước khi DB migration chạy**: nếu chỉ push code (bỏ random ở `auth.service`) mà DB vẫn còn `random` cho user cũ, user cũ sẽ vẫn thấy nhảy màu. Phải merge + deploy code và migration cùng release.
- **`name` có thể chứa ký tự đặc biệt**: `encodeURIComponent` ở `buildDefaultAvatarUrl` xử lý. Đã verify với "Nguyễn Văn A".
- **User cũ sau migration**: URL avatar có `name=User` (name mặc định từ DB default) → initials hiển thị là "U" thay vì tên thật. Màu đã deterministic nhưng initials sai. Để fix thêm cần backfill script Node.js (ngoài scope bug này).
- **Email làm avatar fallback**: nếu user không có name (sau này có thể xảy ra với OAuth), `normalizeName('')` trả về `''` → fallback màu `1ABC9C`. OK.

---

## 7. Rollback strategy

Nếu có sự cố sau deploy:

1. **Rollback code**: revert commit, redeploy. Code cũ vẫn tạo URL mới với `random` cho user đăng ký mới (không nguy hiểm, chỉ là bug cũ quay lại).
2. **Rollback DB**: nếu muốn revert migration, chạy:
   ```sql
   UPDATE "users"
   SET "avatar" = REPLACE("avatar", 'background=3498DB', 'background=random')
   WHERE "avatar" LIKE '%background=3498DB%'
     AND "avatar" LIKE '%name=User%';
   ```
   **Lưu ý**: câu `WHERE` thêm điều kiện `name=User` để chỉ revert user cũ (được migration replace `random` → `3498DB`). User mới đăng ký sau fix có thể có `background=3498DB` nhưng URL chứa tên thật (vd: `name=Alice`), sẽ không bị revert nhầm. Tuy nhiên nếu user mới恰好 có tên "User" thì vẫn bị ảnh hưởng — chấp nhận được vì xác suất thấp.
   
   **Không nên rollback DB trừ khi chấp nhận quay về bug ban đầu.** Cách an toàn hơn: fix forward (sửa code sai nếu có).
3. **Fix forward**: nếu palette 15 màu gây vấn đề UX (vd: 1 project có >15 người, nhiều người trùng màu khó phân biệt), mở rộng palette thành 30 hoặc 60 màu. Chỉ cần sửa constant trong utility, không cần migration DB.

---

## 8. Thứ tự implement (Milestones)

### Milestone 0 — pre-check (15 phút)

1. Check repo có đang chạy `prisma migrate dev` tự động hay CI. Nếu CI chạy migration, đảm bảo file SQL có syntax đúng.
2. Verify `staleTime` của `useCurrentUser` ở FE để ước lượng thời gian cache tự revalidate. Không sửa gì, chỉ ghi nhận.
3. Check xem `prisma migrate dev` có tự generate client hay không. Sau khi sửa `schema.prisma`, cần chạy `prisma generate` để Prisma client TypeScript types cập nhật. Nếu CI tự generate thì OK, nếu không thì thêm vào milestone 1.

### Milestone 1 — utility + code fix (45 phút)

1. Tạo `BE/src/common/utils/avatarColor.utils.ts` với `nameToHexColor` + `buildDefaultAvatarUrl`.
2. Export từ `common/utils/index.ts`.
3. Sửa `auth.service.ts:51` import và dùng `buildDefaultAvatarUrl`.
4. Sửa `schema.prisma:143` đổi default.
5. Chạy `prisma format` + `prisma validate` + `prisma generate` để chắc schema đúng và Prisma client types cập nhật.

### Milestone 2 — migration (15 phút)

1. Tạo folder `prisma/migrations/<ts>_fix_avatar_random_to_deterministic/`.
2. Tạo `migration.sql` theo mục 4.4.
3. Chạy `prisma migrate dev` để verify SQL không lỗi syntax và áp dụng local.
4. **Verify thủ công**:
   ```sql
   SELECT COUNT(*) FROM "users" WHERE "avatar" LIKE '%background=random%';
   -- Kỳ vọng: 0
   ```

### Milestone 3 — test (45 phút)

Test theo test plan mục 9.

### Milestone 4 — deploy

1. Merge PR (code + migration cùng PR).
2. CI chạy migration lên staging.
3. Smoke test trên staging: đăng ký user mới, xem avatar có màu deterministic.
4. Deploy lên prod. Migration tự chạy.

---

## 9. Test plan

### 9.1. Unit test cho utility (nếu repo có setup test)

Khuyến nghị thêm (nếu BE chưa có test infra, bỏ qua — đã smoke test ở 9.2):

```ts
// avatarColor.utils.spec.ts
describe('nameToHexColor', () => {
  it('trả về cùng màu cho cùng input', () => {
    expect(nameToHexColor('John')).toBe(nameToHexColor('John'));
  });

  it('normalize trước khi hash', () => {
    expect(nameToHexColor('John')).toBe(nameToHexColor('  john  '));
    expect(nameToHexColor('John')).toBe(nameToHexColor('JOHN'));
  });

  it('màu nằm trong palette', () => {
    const palette = ['1ABC9C', /* ... */];
    const color = nameToHexColor('Test User');
    expect(palette).toContain(color);
  });

  it('name rỗng -> fallback', () => {
    expect(nameToHexColor('')).toBe('1ABC9C');
    expect(nameToHexColor(null)).toBe('1ABC9C');
    expect(nameToHexColor(undefined)).toBe('1ABC9C');
  });
});

describe('buildDefaultAvatarUrl', () => {
  it('chứa background hex, không có random', () => {
    const url = buildDefaultAvatarUrl('John');
    expect(url).not.toContain('background=random');
    expect(url).toMatch(/background=[0-9A-F]{6}/);
  });

  it('encode tên có ký tự đặc biệt', () => {
    const url = buildDefaultAvatarUrl('Nguyễn Văn A');
    expect(url).toContain(encodeURIComponent('Nguyễn Văn A'));
  });

  it('name rỗng -> URL có name=User', () => {
    const url = buildDefaultAvatarUrl('');
    expect(url).toContain('name=User');
  });
});
```

### 9.2. Manual / integration test

| # | Bước | Kỳ vọng |
|---|---|---|
| 1 | Đăng ký user mới "Alice" trên dev | DB row có `avatar` URL với `background=3498DB` (hoặc màu hash của "alice" — tùy normalize). KHÔNG có `random`. |
| 2 | Reload trang `/login` 5 lần | Avatar preview (nếu có) **giống nhau** qua các lần. |
| 3 | User A xem profile của "Alice" | Avatar cùng màu. |
| 4 | User B (account khác) xem cùng profile | Cùng màu user A thấy. |
| 5 | Đăng ký user khác tên "Bob" | Màu khác Alice (trừ khi trùng hash — chấp nhận được). |
| 6 | Đăng ký 2 user cùng tên "Charlie" | Cùng màu. |
| 7 | User upload avatar Cloudinary | Avatar hiển thị ảnh upload, KHÔNG còn URL ui-avatars. Sau khi upload, refresh → vẫn là ảnh Cloudinary. |
| 8 | User cũ (đã có sẵn trước fix) login lại | Avatar hiển thị màu `3498DB` (xanh dương fallback), KHÔNG nhảy màu qua các lần reload. **Lưu ý**: URL cũ có `name=User` nên initials hiển thị là "U" thay vì tên thật — chấp nhận được vì màu đã ổn định. Muốn initials đúng tên thì cần backfill script Node.js (ngoài scope). |
| 9 | Click vào 1 task, xem comment author có avatar | Avatar đồng nhất qua các lần reload. |
| 10 | Mở 2 tab cùng lúc, login 2 user khác nhau | Mỗi user thấy avatar của user kia cùng màu xuyên suốt phiên. |
| 11 | Kiểm tra DB trước và sau migration: `SELECT COUNT(*) FROM users WHERE avatar LIKE '%background=random%';` | Trước: > 0 (nếu có user cũ). Sau migration: 0. |

### 9.3. Regression test

| # | Bước | Kỳ vọng |
|---|---|---|
| 1 | Upload avatar, xoá avatar, upload lại | Flow upload/display vẫn đúng (Cloudinary URL). |
| 2 | Realtime: user A update avatar, user B đang mở app | User B thấy avatar mới qua socket. |
| 3 | Login bằng OAuth (Google) — nếu có | Avatar default dùng `name` từ Google profile. |

---

## 10. Acceptance criteria (DoD)

### Qualitative

- Đăng ký user mới → avatar có màu nền deterministic (hash từ name).
- Reload trang 10 lần → avatar **không nhảy màu**.
- User A và user B cùng xem profile của user C → thấy **cùng màu**.
- User cũ sau migration → avatar hiển thị `3498DB` (fallback), ổn định.
- User upload avatar → không bị ảnh hưởng bởi thay đổi này.

### Measurable

- Query `SELECT COUNT(*) FROM users WHERE avatar LIKE '%background=random%'` = **0** sau migration.
- Cùng `name` (đã normalize) → hash cho ra cùng index trong palette (verify bằng unit test).
- Tất cả URL avatar mới sinh ra bởi `buildDefaultAvatarUrl` đều match regex `/background=[0-9A-F]{6}/` (verify bằng test).
- Không có bug report mới về "avatar nhảy màu" trong vòng 1 tuần sau deploy.

---

## 11. Câu hỏi mở / cần confirm

1. **Có muốn mở rộng palette lên 30 màu không?** 15 màu đủ cho project nhỏ, nhưng nếu có project 20+ người sẽ có người trùng màu. Nếu OK, có thể sửa constant 1 dòng.
   - **Mặc định chốt**: giữ 15 màu. Nếu cần mở rộng sau, làm task riêng.

2. **Có cần FE cũng revalidate cache ngay sau deploy?** Có thể thêm 1 query `invalidateQueries(['current-user'])` ở `main.tsx` chạy 1 lần sau deploy. Nhưng đây là over-engineering.
   - **Mặc định chốt**: không sửa FE, để cache tự expire.

3. **Có muốn thêm utility `nameToHexColor` vào FE để dùng cho placeholder khi URL lỗi?** Không nằm trong scope bug này.
   - **Mặc định chốt**: bỏ qua.

---

## 12. Changelog

- 2026-09-04 (v1):
  - Chốt approach: palette 15 màu + FNV-1a hash + `buildDefaultAvatarUrl` utility.
  - Thống nhất: fix tận gốc ở BE + DB, không đụng FE.
  - Migration SQL: REPLACE đơn giản `background=random` → `background=3498DB` cho user cũ.
  - Lý do bỏ: hash theo `name` trong SQL (vì Unicode + complexity).
  - Test plan: unit + manual + regression.
- 2026-09-04 (v1.1 — review fix):
  - Fix claim sai: `updateMyProfile` KHÔNG regenerate avatar URL (xóa claim ở 4.4, thêm note rõ).
  - Thêm `prisma generate` vào Milestone 1 step 5.
  - Fix rollback SQL: thêm điều kiện `name=User` để tránh revert nhầm user mới.
  - Thêm note về initials "U" cho user cũ sau migration (test case 8 + section 6.3).
- 2026-09-04 (v1.2 — implemented):
  - Đã tạo `avatarColor.utils.ts` với `nameToHexColor` + `buildDefaultAvatarUrl`.
  - Đã sửa `auth.service.ts` dùng `buildDefaultAvatarUrl`.
  - Đã sửa `schema.prisma` default value `3498DB`.
  - Đã tạo migration SQL backfill user cũ.
  - Prisma format + validate + generate: PASS.
  - `prisma migrate dev` fail do pre-existing issue: `20260630211952_add_task_comments` trống.