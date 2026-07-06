import { useQuery } from "@tanstack/react-query";
import { taskApi } from "../api/task-api";
import type { TaskApiResponse } from "../types";

export const useTasks = (
  listId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery<TaskApiResponse>({
    queryKey: ["tasks", listId],
    queryFn: () => taskApi.getAllByListId(listId),
    enabled: Boolean(listId) && (options?.enabled ?? true),
    staleTime: 10_000,
  });
};
