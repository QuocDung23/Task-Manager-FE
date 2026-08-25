# Review: realtime boards (BE + FE)

## Findings

1. **[P2] Keep pagination totals updated when page 1 is full**
   - File: `FE/src/features/boards/utils/board-cache.ts:89`
   - When another user creates a board while the cached first page is already at the page limit, `insertBoardToFirstList` returns before updating `pagination.totalItems` / `totalPages`. The socket path does not invalidate/refetch the list, so the board count and pagination stay stale even though a new board exists.

2. **[P2] Do not gate project detail member totals on members-list cache**
   - File: `FE/src/features/projects/utils/project-cache.ts:257`
   - `applyProjectMemberAdded` now only updates project detail `totalMembers` when the project members list cache exists and the member was inserted there. If only the project detail/list is cached (common before opening the members panel), realtime member-added events no longer update the visible member total; the previous reducer adjusted it unconditionally.
