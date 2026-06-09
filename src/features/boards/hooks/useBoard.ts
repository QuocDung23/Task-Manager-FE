import { useQuery } from "@tanstack/react-query";
import { boardApi } from "@/features/boards/api/board-api";

export const useBoard = (boardId: string) => {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => boardApi.getById(boardId),
    enabled: !!boardId,
  });
};
