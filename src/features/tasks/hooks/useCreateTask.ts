import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { applyCanonicalTaskSnapshot } from "../utils/task-cache";
import type { CreateTaskRequest, TaskResponse } from "../types";
import type { ApiError } from "@/lib/api-error";

export const useCreateTask = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.create(listId, data),
    onSuccess: (response) => {
      toast.success(t("toast.taskCreated"));
      const task: TaskResponse = response.data;
      applyCanonicalTaskSnapshot(queryClient, task, { source: "http" });
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(error, "Create Task Failed"));
    },
  });
};