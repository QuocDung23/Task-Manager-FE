import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { ApiError } from "@/lib/api-error";
import {
  replaceReply,
  replaceRootComment,
} from "./comment-cache";

function getApiErrorMessage(error: ApiError, fallback: string): string {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

type UpdateTaskCommentVariables = {
  taskId: string;
  commentId: string;
  parentCommentId: string | null;
  content: string;
};

export const useUpdateTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
      content,
    }: UpdateTaskCommentVariables) =>
      taskApi.updateComment(taskId, commentId, {
        content: content.trim(),
      }),

    onSuccess: (res, variables) => {
      const updated = res.data;
      if (variables.parentCommentId) {
        replaceReply(
          queryClient,
          variables.taskId,
          variables.parentCommentId,
          updated,
        );
      } else {
        replaceRootComment(queryClient, variables.taskId, updated);
      }
    },

    onError: (error: ApiError) => {
      const status = error.response?.status;
      if (status === 403) {
        toast.error("You can only edit your own comments.");
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to update comment."));
    },
  });
};
