import { useQuery } from "@tanstack/react-query";
import { taskApi } from "../api/task-api";
import { taskKeys } from "../utils/task-query-keys";
import type { TaskApiResponse, TaskListFilters } from "../types";

export type UseTasksOptions = {
  enabled?: boolean;
  filters?: TaskListFilters;
};

export const useTasks = (
  listId: string,
  options: UseTasksOptions = {},
) => {
  return useQuery<TaskApiResponse>({
    queryKey: taskKeys.list(listId, options.filters),
    queryFn: () => taskApi.getAllByListId(listId, options.filters),
    enabled: Boolean(listId) && (options.enabled ?? true),
    staleTime: 10_000,
  });
};