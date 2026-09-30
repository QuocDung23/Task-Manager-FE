import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { applyCanonicalTaskSnapshot } from "../utils/task-cache";
import { taskKeys } from "../utils/task-query-keys";
import type { ApiError } from "@/lib/api-error";
import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import type { TaskResponse, TaskStatusAction } from "../types";

export type UpdateTaskStatusActionVariables = {
  taskId: string;
  listId: string;
  statusAction: TaskStatusAction;
};

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
      const backendMessage = error.response?.data?.message ?? "";

      if (status === 404) {
        toast.error(t("toast.taskMissing"));
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
          toast.error(t("toast.statusOverdueLocked"));
          return;
        }
        toast.error(getApiErrorMessage(error, t("toast.statusForbidden")));
        return;
      }

      if (status === 400) {
        toast.error(getApiErrorMessage(error, t("toast.statusInvalid")));
        return;
      }

      toast.error(getApiErrorMessage(error, t("toast.statusUpdateFailed")));
    },
  });
};
