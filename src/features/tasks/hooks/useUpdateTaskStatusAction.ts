import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { applyCanonicalTaskSnapshot } from "../utils/task-cache";
import { taskKeys } from "../utils/task-query-keys";
import type { ApiError } from "@/lib/api-error";
import type { TaskResponse, TaskStatusAction } from "../types";

export type UpdateTaskStatusActionVariables = {
  taskId: string;
  listId: string;
  statusAction: TaskStatusAction;
};

function getApiErrorMessage(error: ApiError, fallback: string): string {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

function isOverdueLockMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("overdue") &&
    (normalized.includes("locked") || normalized.includes("reschedule"))
  );
}

export const useUpdateTaskStatusAction = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof taskApi.updateStatusAction>>,
    ApiError,
    UpdateTaskStatusActionVariables,
    { previousDetail?: TaskResponse }
  >({
    mutationFn: ({ taskId, statusAction }) =>
      taskApi.updateStatusAction(taskId, { statusAction }),

    onSuccess: (response) => {
      applyCanonicalTaskSnapshot(queryClient, response.data, { source: "http" });
    },

    onError: (error, variables) => {
      const status = error.response?.status;
      const backendMessage = getApiErrorMessage(error, "");

      if (status === 404) {
        toast.error(backendMessage || "Task no longer exists.");
        void queryClient.invalidateQueries({
          queryKey: taskKeys.list(variables.listId),
        });
        void queryClient.removeQueries({
          queryKey: taskKeys.detail(variables.taskId),
        });
        return;
      }

      if (status === 403) {
        if (isOverdueLockMessage(backendMessage)) {
          toast.error(
            "Task is overdue and locked. Reschedule it first, or mark it done.",
          );
          return;
        }
        toast.error(
          backendMessage ||
            "Only assigned members with permission can change this status.",
        );
        return;
      }

      if (status === 400) {
        toast.error(backendMessage || "Invalid task status action.");
        return;
      }

      toast.error(backendMessage || "Could not update task status.");
    },
  });
};
