import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { UpdateTaskRequest } from "../api/task-api";
import {
  removeTaskAcrossCaches,
  replaceTaskAcrossCaches,
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
      replaceTaskAcrossCaches(queryClient, response.data);
      toast.success("Task updated successfully");
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Update Task Failed");
    },
  });
};

export { removeTaskAcrossCaches };