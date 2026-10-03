# Realtime Tag Pin - Nhat ky Phase 1-3

Ngay: 2026-08-15

## Backend da hoan tat

- Them `RealtimeEnvelope`, ack code on dinh va typed board/task event contract.
- Them `RoomPermissionService` de validate UUID, board active va
  `VIEW_TASK` theo context board/project.
- Them handler `board:join` / `board:leave` va dang ky trong Socket.IO server.
- Tach entrypoint `task-room.socket.ts`; task room dung permission service chung.
- Them Prisma field `tasks.tagVersion` va migration SQL
  `prisma/migrations/20260815000000_add_task_tag_version/migration.sql`.
- Increment `tagVersion` trong cung transaction replace/attach/detach; snapshot
  canonical duoc dung cho HTTP response va event.
- Publish `task:tags_updated` toi union task room + board room, publish ba event
  catalog tag toi board room sau khi mutation thanh cong.
- Truyen `actorUserId` tu controller vao service; loi publish khong lam rollback
  HTTP mutation.

## Frontend da hoan tat

- Tach mirror contract Socket.IO voi date dang `string` va khong import type BE.
- Them board room registry/hook: refcount, ack timeout 5 giay, leave, reconnect,
  blocked forbidden/not-found va logout reset.
- Mount board room theo `DetailBoard`, reconcile active tag/task/detail queries
  sau reconnect.
- Global realtime owner dang ky task handlers va tag handlers mot lan.
- Them reducer task snapshot stale-safe theo `tagVersion`, filter-aware, sort
  theo `orderTask`, pagination metadata va detail cache bridge.
- Them reducer catalog create/update/delete cho moi query variant, task tag
  summary va tasks-by-tag; delete patch ngay roi invalidate/refetch.
- Them dedupe bounded set theo `eventId`.
- Them picker conflict state: draft dirty duoc giu lai, hien
  `Labels changed elsewhere`, cho reload va khoa Apply.

## Kiem tra

- `npx prisma validate`: dat.
- `npx prisma generate`: dat.
- `npx tsc --noEmit` trong BE: dat.
- `npm run build` trong FE: dat.
- `npm run lint` trong FE: con 4 loi baseline khong thuoc feature realtime.
