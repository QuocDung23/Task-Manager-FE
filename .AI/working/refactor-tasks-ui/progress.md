# Refactor UI — Tasks: progress log

Theo dõi tiến độ refactor UI `src/components/tasks/` theo design system MainSpace.

## Trạng thái hiện tại

- ✅ Foundation (id 1)
- ✅ Primitives (id 2)
- ✅ Task card + sortable wrapper (id 3)
- ✅ Assignee flow (id 4)
- ✅ Detail panel (id 5)
- ✅ Create dialog (id 6)
- ✅ Delete dialog (id 7)
- ✅ Verify (id 8)

## Kết quả verify cuối

- `npx tsc --noEmit --ignoreDeprecations 6.0` → exit 0
- `npx eslint src/components/tasks src/features/tasks --max-warnings 0` → exit 0
- `npx eslint src/components/{boards,lists,projects,tasks} src/features/tasks --max-warnings 0` → exit 0 (không vỡ scope liên quan)
- ReadLints `src/components/tasks` + `src/features/tasks` → sạch
