import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { removeTaskAcrossCaches } from "../utils/task-cache";
import type { ApiError } from "@/lib/api-error";

export const useDeleteTask = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.delete(taskId),
    onSuccess: (_response, taskId) => {
      toast.success(t("toast.taskDeleted"));
      removeTaskAcrossCaches(queryClient, taskId);
      queryClient.invalidateQueries({ queryKey: ["tasks", listId] });
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(error, "Delete Task Failed"));
    },
  });
};