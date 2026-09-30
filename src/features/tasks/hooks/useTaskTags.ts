import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { applyCanonicalTaskSnapshot } from "../utils/task-cache";

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
      applyCanonicalTaskSnapshot(queryClient, updatedTask, { source: "http" });
      toast.success(t("toast.tagsUpdated"));
      return updatedTask;
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to update tags";

      if (message.toLowerCase().includes("overdue")) {
        toast.error(t("toast.overdueTags"));
      } else if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("forbidden")) {
        toast.error(t("toast.tagsForbidden"));
      } else if (message.toLowerCase().includes("not found")) {
        toast.error(t("toast.taskTagMissing"));
      } else if (message.toLowerCase().includes("invalid")) {
        toast.error(t("toast.invalidTag"));
      } else {
        toast.error(getApiErrorMessage(error, "Failed to update tags"));
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
      applyCanonicalTaskSnapshot(queryClient, updatedTask, { source: "http" });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to attach tag";
      if (message.toLowerCase().includes("overdue")) {
        toast.error(t("toast.overdueTags"));
      } else {
        toast.error(getApiErrorMessage(error, "Failed to attach tag"));
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
      applyCanonicalTaskSnapshot(queryClient, updatedTask, { source: "http" });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to remove tag";
      if (message.toLowerCase().includes("not found")) {
        toast.error(t("toast.tagNotOnTask"));
      } else {
        toast.error(getApiErrorMessage(error, "Failed to remove tag"));
      }
    },
  });
};
