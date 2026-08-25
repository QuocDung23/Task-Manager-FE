# Realtime Tag Pin - Kiem tra cuoi

Ngay: 2026-08-15

## Dat

- FE `npm run build`.
- BE `npx tsc --noEmit`.
- BE `npx prisma validate`.
- BE `npx prisma generate`.
- ESLint rieng cac file thay doi: dat.
- `git diff --check` cho ca hai repo: dat.

## Baseline con lai

`FE npm run lint` van bao 4 loi da co truoc feature:

- `src/components/tasks/task-detail/task-detail-description.tsx`
- `src/components/tasks/task-detail/task-detail-header.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/sidebar.tsx`

Khong co loi lint trong cac file realtime/tag da thay doi.

## Chua the chay trong moi truong nay

- Chua chay integration hai browser, vi khong co test runner Socket.IO va
  database server dang chay trong workspace.
- Chua apply migration vao database; migration SQL da tao va da duoc mo khoa
  khoi pattern ignore cua BE, schema da validate va Prisma Client da generate.
- `npx prisma migrate status` khong ket noi duoc PostgreSQL tai `localhost:5434`
  (`P1001`), nen viec apply migration can thuc hien khi DB duoc bat.
