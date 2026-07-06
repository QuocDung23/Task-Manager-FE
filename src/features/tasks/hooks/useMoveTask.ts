import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type {
  TaskApiResponse,
} from "../types";

export type MoveTaskVariables = {
  taskId: string;
  sourceListId: string;
  targetListId: string;
  orderedTaskIds: string[];
};

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

      if (sourceListId === targetListId) {
        queryClient.setQueryData<TaskApiResponse>(
          ["tasks", sourceListId],
          (old) => {
            if (!old) return old;
            return { ...old, data: response.data.targetTasks };
          },
        );
      } else {
        queryClient.setQueryData<TaskApiResponse>(
          ["tasks", sourceListId],
          (old) => {
            if (!old) return old;
            return { ...old, data: response.data.sourceTasks };
          },
        );
        queryClient.setQueryData<TaskApiResponse>(
          ["tasks", targetListId],
          (old) => {
            if (!old) return old;
            return { ...old, data: response.data.targetTasks };
          },
        );
      }
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || "Failed to move task. Please try again."
      );
    },
  });
};
