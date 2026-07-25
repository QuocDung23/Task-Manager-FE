import { useQuery } from "@tanstack/react-query";
import { boardApi } from "../api/board-api";
import type { BoardMemberUser } from "../types";

/**
 * Lấy danh sách active members của 1 board.
 *
 * Stale time dài (60s) vì danh sách board member ít khi thay đổi trong 1 phiên
 * mở task detail. Refetch khi user thực hiện add/remove member khỏi board.
 */
export const useBoardMembers = (
  boardId: string | null | undefined,
  options?: { enabled?: boolean },
) => {
  return useQuery<BoardMemberUser[]>({
    queryKey: ["board-members", boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const res = await boardApi.getMembers(boardId);
      return res.data;
    },
    enabled: Boolean(boardId) && (options?.enabled ?? true),
    staleTime: 60_000,
  });
};
