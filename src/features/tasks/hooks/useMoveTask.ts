import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { taskKeys } from "../utils/task-query-keys";
import type { TaskApiResponse } from "../types";

export type MoveTaskVariables = {
  taskId: string;
  sourceListId: string;
  targetListId: string;
  orderedTaskIds: string[];
};

function updateListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  listId: string,
  tasks: TaskResponseFromCache[],
): void {
  queryClient.setQueryData<TaskApiResponse>(
    taskKeys.list(listId),
    (old) => (old ? { ...old, data: tasks } : old),
  );
}

type TaskResponseFromCache = TaskApiResponse["data"][number];

function normalizeTasks(listId: string, tasks: TaskResponseFromCache[]) {
  return tasks.map((task, index) => ({
    ...task,
    listId,
    orderTask: index,
  }));
}

export const useMoveTask = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof taskApi.move>>,
    Error,
    MoveTaskVariables
  >({
    mutationFn: ({ taskId, ...data }: MoveTaskVariables) =>
      taskApi.move(taskId, data),
    onSuccess: (response, variables) => {
      const { sourceListId, targetListId } = variables;
      const moved = response.data.movedTask;
      const normalizedSource = normalizeTasks(
        sourceListId,
        response.data.sourceTasks,
      );
      const normalizedTarget = normalizeTasks(
        targetListId,
        response.data.targetTasks,
      );

      if (sourceListId === targetListId) {
        updateListCache(queryClient, sourceListId, normalizedSource);
        queryClient.invalidateQueries({
          queryKey: taskKeys.list(sourceListId),
          refetchType: "none",
        });
      } else {
        updateListCache(queryClient, sourceListId, normalizedSource);
        updateListCache(queryClient, targetListId, normalizedTarget);
        queryClient.invalidateQueries({
          queryKey: taskKeys.list(sourceListId),
          refetchType: "none",
        });
        queryClient.invalidateQueries({
          queryKey: taskKeys.list(targetListId),
          refetchType: "none",
        });
      }

      queryClient.setQueriesData<TaskApiResponse | undefined>(
        { queryKey: taskKeys.detail(moved.id) },
        () => ({ success: true, data: [moved] }),
      );
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || "Failed to move task. Please try again.",
      );
    },
  });
};