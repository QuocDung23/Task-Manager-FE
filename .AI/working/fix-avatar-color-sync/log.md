# Work Log: Fix Avatar Color Không Đồng Bộ

**Ngày:** 04/09/2026
**Plan:** `FE/.AI/plan/fix-avatar-color-not-synced.md`
**Status:** IMPLEMENTED — cần test thủ công

---

## Tổng kết

Fix bug avatar mỗi user thấy màu khác nhau do `background=random` trong ui-avatars.com URL. Approach: thay bằng palette 15 màu deterministic hash từ tên user (FNV-1a).

---

## Files đã tạo/sửa

| File | Hành động | Mô tả |
|------|-----------|-------|
| `BE/src/common/utils/avatarColor.utils.ts` | TẠO MỚI | Utility `nameToHexColor` + `buildDefaultAvatarUrl`, palette 15 màu + FNV-1a hash |
| `BE/src/common/utils/index.ts` | THÊM | Export `avatarColor.utils` |
| `BE/src/modules/auth/auth.service.ts` | SỬA | Import `buildDefaultAvatarUrl`, thay URL `background=random` |
| `BE/prisma/schema.prisma:143` | SỬA | Default avatar URL dùng `background=3498DB` thay `random` |
| `BE/prisma/migrations/20260904000000_fix_avatar_random_to_deterministic/migration.sql` | TẠO MỚI | Backfill user cũ: REPLACE `random` → `3498DB` |

**Không đụng FE.**

---

## Verification

- `prisma format` — PASS
- `prisma validate` — PASS
- `prisma generate` — PASS (Prisma Client + Zod types)
- `prisma migrate dev` — FAIL (pre-existing issue: thư mục `20260630211952_add_task_comments` trống, không phải do本次 fix)

---

## Pre-existing issue

Thư mục `BE/prisma/migrations/20260630211952_add_task_comments/` không có file `migration.sql`. Prisma migrate dev không chạy được vì lý do này. Cần fix riêng (thêm file SQL hoặc xóa thư mục).

---

## Test plan (cần thực hiện thủ công)

1. Đăng ký user mới → verify avatar có `background=<hex>` deterministic
2. Reload trang 5 lần → avatar không nhảy màu
3. 2 user khác nhau xem cùng 1 profile → thấy cùng màu
4. User cũ (có `background=random` trong DB) → sau migration hiện `3498DB`, ổn định
5. Upload avatar Cloudinary → unaffected
