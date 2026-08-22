import { useQuery } from "@tanstack/react-query";
import { boardApi } from "@/features/boards/api/board-api";
import { boardKeys } from "@/features/boards/utils/board-query-keys";

export const useBoard = (boardId: string) => {
  return useQuery({
    queryKey: boardKeys.detail(boardId),
    queryFn: () => boardApi.getById(boardId),
    enabled: !!boardId,
  });
};
