import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { ApiError } from "@/lib/api-error";
import { getApiErrorMessage } from "@/lib/error-message";
import { applyDeleteComment } from "./comment-cache";

type DeleteTaskCommentVariables = {
  taskId: string;
  commentId: string;
};

export const useDeleteTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, commentId }: DeleteTaskCommentVariables) =>
      taskApi.deleteComment(taskId, commentId),

    onSuccess: (res, variables) => {
      applyDeleteComment(queryClient, variables.taskId, res.data);
    },

    onError: (error: ApiError) => {
      const status = error.response?.status;
      if (status === 403) {
        toast.error("You do not have permission to delete this comment.");
        return;
      }
      if (status === 404) {
        toast.error("Comment no longer exists.");
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to delete comment."));
    },
  });
};
