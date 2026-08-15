import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { replaceTaskAcrossCaches } from "../utils/task-cache";

export const useReplaceTaskTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      tagIds,
    }: {
      taskId: string;
      tagIds: string[];
    }) => {
      const uniqueTagIds = [...new Set(tagIds)];
      return taskApi.replaceTags(taskId, { tagIds: uniqueTagIds });
    },
    onSuccess: (response) => {
      const updatedTask = response.data;
      replaceTaskAcrossCaches(queryClient, updatedTask);
      toast.success("Tags updated successfully");
      return updatedTask;
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to update tags";

      if (message.toLowerCase().includes("overdue")) {
        toast.error("This task is overdue. Reschedule it before changing tags.");
      } else if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("forbidden")) {
        toast.error("You do not have permission to update tags");
      } else if (message.toLowerCase().includes("not found")) {
        toast.error("Task or tag not found");
      } else if (message.toLowerCase().includes("invalid")) {
        toast.error("Invalid tag selection");
      } else {
        toast.error(message);
      }
    },
  });
};

export const useAttachTaskTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      taskApi.attachTag(taskId, tagId),
    onSuccess: (response) => {
      const updatedTask = response.data;
      replaceTaskAcrossCaches(queryClient, updatedTask);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to attach tag";
      if (message.toLowerCase().includes("overdue")) {
        toast.error("This task is overdue. Reschedule it before changing tags.");
      } else {
        toast.error(message);
      }
    },
  });
};

export const useDetachTaskTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      taskApi.detachTag(taskId, tagId),
    onSuccess: (response) => {
      const updatedTask = response.data;
      replaceTaskAcrossCaches(queryClient, updatedTask);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to remove tag";
      if (message.toLowerCase().includes("not found")) {
        toast.error("Tag not found on this task");
      } else {
        toast.error(message);
      }
    },
  });
};
