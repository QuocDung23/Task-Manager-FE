import type { QueryClient } from "@tanstack/react-query";
import type { TaskApiResponse, TaskResponse } from "../types";

type TaskListCache = TaskApiResponse | undefined;

/**
 * Replace a task in any `["tasks", listId]` cache entry that matches `task.id`.
 *
 * BE returns a fresh `TaskResponse` after `assign` / `unassign` / `update`, so
 * we trust the response data and don't merge from the local optimistic state.
 */
export function updateTaskInListCache(
  queryClient: QueryClient,
  task: TaskResponse,
) {
  queryClient.setQueryData<TaskListCache>(["tasks", task.listId], (old) => {
    if (!old) return old;
    return {
      ...old,
      data: old.data.map((item) => (item.id === task.id ? task : item)),
    };
  });
}