import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { UpdateTaskRequest } from "../api/task-api";

export const useUpdateTask = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskRequest;
    }) => taskApi.update(taskId, data),
    onSuccess: () => {
      toast.success("Task updated successfully");
      queryClient.invalidateQueries({ queryKey: ["tasks", listId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Update Task Failed");
    },
  });
};
