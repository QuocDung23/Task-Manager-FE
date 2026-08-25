import { useInfiniteQuery } from "@tanstack/react-query";
import { taskActivityApi } from "../api/task-activity-api";
import { taskActivityKeys } from "../utils/task-activity-query-keys";

export function useTaskActivities(taskId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: taskActivityKeys.list(taskId),
    queryFn: ({ pageParam }) => taskActivityApi.list(taskId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.data.nextCursor ?? undefined,
    enabled: Boolean(taskId) && enabled,
    staleTime: 10_000,
  });
}
