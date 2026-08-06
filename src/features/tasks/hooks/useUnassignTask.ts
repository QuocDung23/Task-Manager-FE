import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import {
  removeTaskAcrossCaches,
  replaceTaskAcrossCaches,
} from "../utils/task-cache";
import type { ApiError } from "@/lib/api-error";

type UnassignTaskVariables = {
  taskId: string;
  listId: string;
  userId: string;
};

function getApiErrorMessage(error: ApiError, fallback: string): string {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

export const useUnassignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, userId }: UnassignTaskVariables) =>
      taskApi.unassign(taskId, userId),

    onSuccess: (res) => {
      replaceTaskAcrossCaches(queryClient, res.data);
      toast.success("Assignee removed");
    },

    onError: (error: ApiError, variables) => {
      const status = error.response?.status;

      if (status === 404) {
        toast.error("Assignee was already removed.");
        removeTaskAcrossCaches(queryClient, variables.taskId);
        return;
      }
      if (status === 403) {
        toast.error(
          getApiErrorMessage(
            error,
            "You do not have permission to remove this assignee.",
          ),
        );
        return;
      }

      toast.error(getApiErrorMessage(error, "Failed to remove assignee."));
    },
  });
};