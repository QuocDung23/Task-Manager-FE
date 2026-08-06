import { useInfiniteQuery } from "@tanstack/react-query";
import { taskApi } from "../api/task-api";
import { taskCommentKeys } from "./comment-cache";

type UseTaskCommentRepliesOptions = {
  enabled?: boolean;
  limit?: number;
};

export const useTaskCommentReplies = (
  taskId: string,
  commentId: string,
  options?: UseTaskCommentRepliesOptions,
) => {
  const limit = options?.limit ?? 20;
  return useInfiniteQuery({
    queryKey: taskCommentKeys.replies(taskId, commentId),
    queryFn: ({ pageParam }) =>
      taskApi.getCommentReplies(taskId, commentId, {
        cursor: pageParam,
        limit,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled:
      Boolean(taskId && commentId) && (options?.enabled ?? false),
    staleTime: 10_000,
  });
};
