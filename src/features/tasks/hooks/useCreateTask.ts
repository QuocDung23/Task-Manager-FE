import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { CreateTaskRequest } from "../types";

export const useCreateTask = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.create(listId, data),
    onSuccess: () => {
      toast.success("Create Task Successfully");
      queryClient.invalidateQueries({ queryKey: ["tasks", listId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Create Task Failed");
    },
  });
};
