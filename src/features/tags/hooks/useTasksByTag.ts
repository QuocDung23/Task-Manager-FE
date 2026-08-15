import { useQuery } from "@tanstack/react-query";
import { tagApi } from "../api/tag-api";
import { tagKeys } from "../utils/tag-query-keys";
import type { GetTasksByTagParams, GetTasksByTagResponse } from "../types";

export const useTasksByTag = (
  boardId: string | null | undefined,
  tagId: string | null | undefined,
  params?: GetTasksByTagParams,
) => {
  return useQuery<GetTasksByTagResponse>({
    queryKey: tagKeys.tasks(boardId ?? "", tagId ?? "", params),
    queryFn: async () => {
      const response = await tagApi.getTasksByTag(boardId!, tagId!, params);
      return response.data;
    },
    enabled: Boolean(boardId && tagId),
    staleTime: 10_000,
  });
};
