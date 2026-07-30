import { useQueries } from "@tanstack/react-query";

import { boardApi } from "../api/board-api";
import type { BoardMemberUser, BoardResponse } from "../types";

/**
 * Trả về một map boardId → BoardMemberUser[] đã được fetch.
 *
 * Pattern giống `useProjectBoardCounts`: chỉ gọi query cho các board
 * trong trang hiện tại, dùng `useQueries` để giữ Rules of Hooks.
 *
 * Stale time dài (60s) vì membership ít khi đổi trong một phiên mở grid.
 */
export function useBoardsMembers(boards: BoardResponse[]) {
  const queries = useQueries({
    queries: boards.map((board) => ({
      queryKey: ["board-members", board.id] as const,
      queryFn: async () => {
        try {
          const res = await boardApi.getMembers(board.id);
          return res.data;
        } catch {
          return [] as BoardMemberUser[];
        }
      },
      staleTime: 60_000,
    })),
  });

  const membersByBoardId: Record<string, BoardMemberUser[]> = {};
  let isLoading = false;

  boards.forEach((board, idx) => {
    const q = queries[idx];
    if (!q) return;
    if (q.isLoading) isLoading = true;
    membersByBoardId[board.id] = q.data ?? [];
  });

  return { membersByBoardId, isLoading };
}
