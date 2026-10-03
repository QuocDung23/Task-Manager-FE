# Remove `any` — progress log

Theo dõi tiến độ xoá `any` ở toàn bộ hook layer + types.

## Trạng thái hiện tại

- ✅ Hook layer (16 file): error + data callbacks
- ✅ Type layer: `boards/types` `_count`
- ✅ Verify: TS clean, ESLint `src/features` clean

## Kết quả

- `tsc --noEmit`: 0 lỗi
- `eslint src/features --max-warnings 0`: 0 lỗi
- `eslint src/features/**/hooks/**/*.ts`: 0 lỗi
- ReadLints `src/features`: sạch
- Pre-existing UI primitives (`button.tsx`, `sidebar.tsx`) còn 2 lỗi react-refresh — NGOÀI scope.
