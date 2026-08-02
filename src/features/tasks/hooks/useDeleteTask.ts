import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { ApiError } from "@/lib/api-error";

export const useDeleteTask = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.delete(taskId),
    onSuccess: () => {
      toast.success("Delete Task Successfully");
      queryClient.invalidateQueries({ queryKey: ["tasks", listId] });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Delete Task Failed");
    },
  });
};
