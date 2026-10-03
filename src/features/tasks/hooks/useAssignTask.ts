import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { AssignTaskRequest } from "../types";
import { applyCanonicalTaskSnapshot } from "../utils/task-cache";
import type { ApiError } from "@/lib/api-error";
import { getApiErrorMessage } from "@/lib/error-message";

type AssignTaskVariables = {
  taskId: string;
  listId: string;
  userIds: string[];
};

export const useAssignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, userIds }: AssignTaskVariables) =>
      taskApi.assign(taskId, { userIds } satisfies AssignTaskRequest),

    onSuccess: (res) => {
      applyCanonicalTaskSnapshot(queryClient, res.data, { source: "http" });
      toast.success(t("toast.assigneesUpdated"));
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
        toast.error(t("toast.taskMissing"));
        return;
      }

      toast.error(getApiErrorMessage(error, "Failed to update assignees."));
    },
  });
};
