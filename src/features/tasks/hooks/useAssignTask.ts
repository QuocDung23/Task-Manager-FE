import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { AssignTaskRequest } from "../types";
import { updateTaskInListCache } from "../utils/task-cache";
import type { ApiError } from "@/lib/api-error";

type AssignTaskVariables = {
  taskId: string;
  listId: string;
  userIds: string[];
};

function getApiErrorMessage(error: ApiError, fallback: string): string {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

export const useAssignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, userIds }: AssignTaskVariables) =>
      taskApi.assign(taskId, { userIds } satisfies AssignTaskRequest),

    onSuccess: (res) => {
      updateTaskInListCache(queryClient, res.data);
      toast.success("Assignees updated");
    },

    onError: (error: ApiError) => {
      const status = error.response?.status;

      if (status === 403) {
        toast.error(
          getApiErrorMessage(
            error,
            "You do not have permission, or some users are not active board members.",
          ),
        );
        return;
      }
      if (status === 400) {
        toast.error(getApiErrorMessage(error, "Invalid assignee list."));
        return;
      }
      if (status === 404) {
        toast.error("Task no longer exists.");
        return;
      }

      toast.error(getApiErrorMessage(error, "Failed to update assignees."));
    },
  });
};
