import { useQuery } from "@tanstack/react-query";
import { boardApi } from "../api/board-api";
import { boardKeys } from "../utils/board-query-keys";

export const useBoards = (
  projectId: string,
  page: number,
  limit: number,
  name?: string,
) => {
  return useQuery({
    queryKey: boardKeys.list(projectId, page, limit, name),
    queryFn: () => boardApi.getAllByProjectId(projectId, page, limit, name),
    enabled: Boolean(projectId.trim()),
    retry: false,
  });
};
