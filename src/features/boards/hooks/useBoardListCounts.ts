import { useQueries } from "@tanstack/react-query";

import { listApi } from "@/features/lists/api/list-api";
import type { BoardResponse } from "../types";

export interface UseBoardListCountsResult {
  getCount: (board: BoardResponse) => number | undefined;
  isLoading: boolean;
}

/**
 * Đếm tổng số lists của mỗi board trong một trang (page đầu, limit 1).
 *
 * Lý do dùng page=1, limit=1 + đọc `pagination.totalItems`: API list có trả
 * về `totalItems` ngay cả khi `limit=1`, nên ta không cần kéo full list về —
 * tránh N+1 payload trên grid. Đây là cùng pattern với `useProjectBoardCounts`.
 *
 * Boards nào có dữ liệu đếm sẵn ở payload (eg. `board.listCount`) thì hook trả
 * về giá trị đó trước khi gọi API, không query lại.
 */
export function resolveBoardListCount(board: BoardResponse): number | undefined {
  if (typeof board.listCount === "number") return board.listCount;
  if (board._count?.lists !== undefined) return board._count.lists;
  return undefined;
}

export function useBoardListCounts(
  boards: BoardResponse[],
): UseBoardListCountsResult {
  const misses = boards.filter(
    (b) => resolveBoardListCount(b) === undefined,
  );

  const queries = useQueries({
    queries: misses.map((board) => ({
      queryKey: ["board-list-count", board.id] as const,
      queryFn: async () => {
        try {
          const res = await listApi.getAllByBoardId(board.id, 1, 1);
          return res.pagination?.totalItems ?? 0;
        } catch {
          return 0;
        }
      },
      staleTime: 60_000,
    })),
  });

  const getCount = (board: BoardResponse): number | undefined => {
    const fromPayload = resolveBoardListCount(board);
    if (fromPayload !== undefined) return fromPayload;
    const idx = misses.findIndex((b) => b.id === board.id);
    if (idx === -1) return undefined;
    return queries[idx]?.data;
  };

  const isLoading =
    misses.length > 0 && queries.some((q) => q.isLoading);

  return { getCount, isLoading };
}
