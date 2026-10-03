# Trello-clone polish pass

## Phạm vi

Tinh chỉnh `task-detail-content.tsx` để đạt cảm giác "Trello-clone 70%" chính xác hơn. Layout đã có từ session trước — lần này thêm các chi tiết Trello-classic.

## Chi tiết Trello-clone bổ sung

### 1. Avatar group assignees ngay trong header (Trello-classic)

- File mới: `src/components/tasks/task-detail/task-detail-assignees.tsx`
- Hiển thị avatar tròn xếp chồng (`-space-x-1.5`) ngay phải title.
- Có `+N` chip khi vượt quá `max` (mặc định 4).
- Avatar empty state là 1 outlined `+` button (Trello-style "Add member").
- Resolve name + avatar từ `useBoardMembers` lookup (cùng pattern với sidebar).

### 2. Status action badge move lên header top-row

- Chuyển từ "kế title row" lên "top-row cùng breadcrumb" — Trello đặt status/actions ở góc phải topbar.
- Watching indicator: nếu `statusAction` là `UPDATED` / `CREATED`, hiển thị chip "Watching" xanh với dot pulse (`shadow-[0_0_0_3px_rgba(16,185,129,0.18)]`).

### 3. Move icon clarified

- Đổi `Calendar` icon (vốn trùng với Due date) → `ArrowRightLeft` cho dòng "Move" trong sidebar.

### 4. Relative due date label

- `formatDate` của Meta strip giờ trả về `Today · Aug 2, 2026` / `Tomorrow · Aug 3, 2026` / `Wednesday` (cho 2-6 ngày tới) thay vì chỉ `Wed, Aug 2, 2026` — Trello-classic.

### 5. Bug fix: missing `task-detail-cover-band.tsx`

- File bị mất giữa các session → build break. Tái tạo với cùng spec dùng ở `task-detail-content.tsx` (cover band gradient + shimmer + `TaskDetailHeaderMeta`).

## Files

```
src/components/tasks/task-detail/
├── task-detail-cover-band.tsx     (tái tạo - cover band + header meta chip)
├── task-detail-assignees.tsx      (mới - avatar group reusable)
├── task-detail-header.tsx         (sửa - avatars + watching chip + status badge di chuyển)
├── task-detail-sidebar.tsx        (sửa - Move icon đổi ArrowRightLeft)
└── task-detail-meta-strip.tsx     (sửa - relative date format)
```

## Verify

- `npx tsc --noEmit -p tsconfig.app.json` → sạch.
- `npx eslint src/components/tasks/task-detail src/components/tasks/task-detail-content.tsx src/components/tasks/task-detail.tsx src/features/lists/hooks/useListById.ts` → sạch.
- `npx vite build` → thành công (`dist/assets/index-*.js` 985 kB).

## Trello clone features hiện có

| Trello feature | Triển khai |
| --- | --- |
| Card cover band | ✅ `TaskDetailCoverBand` (gradient + shimmer) |
| Breadcrumb (board / list / ID) | ✅ header |
| Editable title | ✅ Click-to-edit `Input` |
| Status action badge | ✅ Move top-row + tone |
| Assignees avatar group | ✅ header + sidebar |
| Watching chip | ✅ conditional |
| Add to card sidebar | ✅ `Add to card` block |
| Members row | ✅ avatar stack + chevron |
| Actions submenu | ✅ Pin, Move, etc. |
| Description (inline edit) | ✅ Left col |
| Activity (= Comments) | ✅ Left col, dưới description |
| Close footer | ✅ Delete (button-in-button) + Close (ghost) |

## Ghi chú thiết kế

- Avatar assignees dùng `ring-2 ring-card` để tách bạch khi xếp chồng (Trello-classic).
- `Watching` chip có dot pulse mô phỏng live tailwind shadow ring (no keyframe animation để tránh prefers-reduction conflict).
- Relative date format giữ cả phần `· Aug 2, 2026` để không mất context absolute.
