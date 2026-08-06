import { useInfiniteQuery } from "@tanstack/react-query";
import { taskApi } from "../api/task-api";
import { taskCommentKeys } from "./comment-cache";

type UseTaskCommentsOptions = {
  enabled?: boolean;
  limit?: number;
};

export const useTaskComments = (
  taskId: string,
  options?: UseTaskCommentsOptions,
) => {
  const limit = options?.limit ?? 20;
  return useInfiniteQuery({
    queryKey: taskCommentKeys.list(taskId),
    queryFn: ({ pageParam }) =>
      taskApi.getComments(taskId, {
        cursor: pageParam,
        limit,
        includeReplies: false,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: Boolean(taskId) && (options?.enabled ?? true),
    staleTime: 10_000,
  });
};
