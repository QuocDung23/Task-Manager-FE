import { useQuery } from "@tanstack/react-query";
import { tagApi } from "../api/tag-api";
import { tagKeys } from "../utils/tag-query-keys";
import type { GetTagsParams, TagResponse } from "../types";

export const useTags = (
  boardId: string | null | undefined,
  params?: GetTagsParams,
) => {
  return useQuery<TagResponse[]>({
    queryKey: tagKeys.board(boardId ?? "", params),
    queryFn: async () => {
      const response = await tagApi.getByBoard(boardId!, params);
      return response.data;
    },
    enabled: Boolean(boardId),
    staleTime: 30_000,
  });
};
