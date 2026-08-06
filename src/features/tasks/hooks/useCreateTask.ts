import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { taskKeys } from "../utils/task-query-keys";
import type { CreateTaskRequest } from "../types";
import type { ApiError } from "@/lib/api-error";

export const useCreateTask = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.create(listId, data),
    onSuccess: () => {
      toast.success("Create Task Successfully");
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Create Task Failed");
    },
  });
};