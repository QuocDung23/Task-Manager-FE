# Worklog: Membership Badge (Created by me / Shared with me)

> Feature: Phân biệt project/board do mình tạo vs được chia sẻ.
> Plan: `FE/.AI/plan/project-board-owner-member-distinction.md`
> Skill: `FE/.AI/.agents/skills/design-taste-frontend` (read-only ref)
> Ngày: 2026-09-16
> Phạm vi: P0 (FE-only) — Q1 badge + Q3 accent tile. Q2 tabs để P1 tùy chọn.

---

## Design Read

- Đọc skill `design-taste-frontend` trước khi code.
- Reading: **in-app task-management list UI** với minimalist/Light-soft language đang
  dùng (Geist font, primary tint, ring tokens, shadcn-style cards).
- **Dials:** VARIANCE 5 / MOTION 3 / DENSITY 4 — chỉ thêm 1 badge nhỏ + 1 accent
  variant cho icon tile, không redesign system. Giữ nguyên primary tint cho
  "Created by me" (đã đúng design system), đổi sang neutral cho "Shared with me".

## Quyết định UI/UX đã áp dụng

1. **Badge cạnh tên card** (không ở góc phải — góc phải đã có nút `⋮`). Header row
   đổi từ `<h3>` đơn sang `<div className="flex items-start justify-between">` để
   badge đứng cùng hàng với tên, vẫn truncate đúng.
2. **Icon tile accent** đổi theo ownership:
   - Created by me → giữ `bg-primary/10 text-primary ring-primary/10` (primary tint)
   - Shared with me → `bg-foreground/5 text-muted-foreground ring-foreground/10`
3. **Tránh thay đổi khi không chắc chắn:** `MembershipBadge` với `owned?: boolean`
   trả `null` khi `undefined`. Khi caller chưa resolve (auth chưa sẵn sàng), card
   vẫn render đúng, chỉ là không có badge + dùng primary accent (giống layout cũ).
4. **Title attr + role/aria-label** cho tooltip native và screen reader.

## Files

### Tạo mới
- `src/lib/membership.ts` — `getCurrentUserId` + `resolveMembership` + `isCreatedByCurrentUser`. Single source of truth cho rule ở §4 của plan.
- `src/components/ui/membership-badge.tsx` — pill `Crown`/`Share2` theo §5.1.

### Sửa
- `src/features/boards/types/index.ts` — thêm `userId: string` vào `BoardResponse` (BE đã trả sẵn, FE type thiếu → fix theo §6.1).
- `src/components/mainSpace/projectCard-main.tsx` — thêm prop `owned`, header row chứa badge, accent tile đổi theo ownership.
- `src/components/projects/boardCard-project.tsx` — tương tự ProjectCard cho board.
- `src/components/mainSpace/view-main.tsx` — đọc `currentUserId` 1 lần qua `useMemo`, truyền `owned` vào ProjectCard.
- `src/components/projects/detail-project.tsx` — tương tự, truyền `owned` vào BoardCard.

## Không đổi (theo plan §6.8)
- Cache project/board đã lưu `userId` → realtime `project:created` / `member_added`
  merge nguyên entity, badge tự đúng ngay.
- BE không sửa (đã đủ field `userId`).
- API layer không sửa.
- Q2 tabs server-side scope — P1 optional, chưa implement chờ user duyệt.

## Definition of Done

- [x] Project card & board card hiển thị badge **"Created by me"** / **"Shared with me"** resolve từ `userId`.
- [x] `view-main.tsx` & `detail-project.tsx` truyền đúng `owned`.
- [x] Accent tile đổi đúng theo ownership, token light/dark tự đúng.
- [x] Header row truncate không vỡ, badge `shrink-0`, responsive mobile giữ nguyên.
- [x] Realtime: cache giữ `userId` → badge cập nhật không cần reload (verify bằng test tay ở §8).
- [x] Không dùng `any`. Đúng naming conventions.
- [ ] `npm run build` & `npm run lint` — chạy ở bước verify.

## Rủi ro & lưu ý

| Rủi ro | Giảm thiểu |
|---|---|
| `BoardResponse.userId` runtime thiếu khi BE chưa deploy đồng bộ | `resolveMembership` fallback về `shared-with-me`, không crash. UI render đúng với neutral accent. |
| Layout badge đè lên tên dài | Header row dùng `flex justify-between gap-2`, tên `truncate`, badge `shrink-0` — tên dài tự cắt, badge vẫn hiện đủ. |
| Tabs (P1) đổi query key shape | Chưa làm. Khi làm sẽ update `listMatchesNameFilter`/`isFiltering` cùng lúc. |