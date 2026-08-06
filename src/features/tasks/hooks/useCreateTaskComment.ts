import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { ApiError } from "@/lib/api-error";
import { appendRootComment } from "./comment-cache";

function getApiErrorMessage(error: ApiError, fallback: string): string {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

type CreateTaskCommentVariables = {
  taskId: string;
  content: string;
};

export const useCreateTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: CreateTaskCommentVariables) =>
      taskApi.createComment(taskId, { content: content.trim() }),

    onSuccess: (res, variables) => {
      appendRootComment(queryClient, variables.taskId, res.data);
    },

    onError: (error: ApiError) => {
      toast.error(
        getApiErrorMessage(error, "Failed to post comment. Please retry."),
      );
    },
  });
};
