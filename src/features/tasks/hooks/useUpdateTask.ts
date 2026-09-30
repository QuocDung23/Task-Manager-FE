import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { UpdateTaskRequest } from "../api/task-api";
import {
  removeTaskAcrossCaches,
  applyCanonicalTaskSnapshot,
} from "../utils/task-cache";

type ApiError = {
  response?: { status?: number; data?: { message?: string } };
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskRequest;
    }) => taskApi.update(taskId, data),
    onSuccess: (response) => {
      applyCanonicalTaskSnapshot(queryClient, response.data, { source: "http" });
      toast.success(t("toast.taskUpdated"));
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(error, "Update Task Failed"));
    },
  });
};

export { removeTaskAcrossCaches };
