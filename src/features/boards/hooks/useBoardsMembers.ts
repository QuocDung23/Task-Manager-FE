import { useQueries } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { boardApi } from "../api/board-api";
import { boardKeys } from "../utils/board-query-keys";
import type { BoardMemberUser, BoardResponse } from "../types";

/**
 * Trả về một map boardId → BoardMemberUser[] đã được fetch.
 *
 * Pattern giống `useProjectBoardCounts`: chỉ gọi query cho các board
 * trong trang hiện tại, dùng `useQueries` để giữ Rules of Hooks.
 *
 */
export function useBoardsMembers(boards: BoardResponse[]) {
  const queries = useQueries({
    queries: boards.map((board) => ({
      queryKey: boardKeys.members(board.id),
      queryFn: async (): Promise<BoardMemberUser[]> => {
        try {
          const res = await boardApi.getMembers(board.id);
          return res.data;
        } catch (error) {
          const status = (error as AxiosError)?.response?.status;
          if (status === 403) {
            return [];
          }
          throw error;
        }
      },
      staleTime: 60_000,
      retry: (failureCount: number, error: AxiosError): boolean => {
        if (error.response?.status === 403) return false;
        return failureCount < 2;
      },
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
