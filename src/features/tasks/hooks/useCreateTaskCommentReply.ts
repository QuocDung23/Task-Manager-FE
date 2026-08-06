import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import type { ApiError } from "@/lib/api-error";
import {
  appendReply,
  incrementRootReplyCount,
} from "./comment-cache";

function getApiErrorMessage(error: ApiError, fallback: string): string {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

type CreateTaskCommentReplyVariables = {
  taskId: string;
  parentCommentId: string;
  content: string;
};

export const useCreateTaskCommentReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      parentCommentId,
      content,
    }: CreateTaskCommentReplyVariables) =>
      taskApi.createCommentReply(taskId, parentCommentId, {
        content: content.trim(),
      }),

    onSuccess: (res, variables) => {
      const reply = res.data;
      appendReply(queryClient, variables.taskId, variables.parentCommentId, reply);
      incrementRootReplyCount(
        queryClient,
        variables.taskId,
        variables.parentCommentId,
      );
    },

    onError: (error: ApiError) => {
      toast.error(
        getApiErrorMessage(error, "Failed to post reply. Please retry."),
      );
    },
  });
};
