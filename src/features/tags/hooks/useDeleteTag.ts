import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tagApi } from "../api/tag-api";
import { tagKeys } from "../utils/tag-query-keys";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";

export const useDeleteTag = (boardId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => tagApi.delete(boardId!, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success(t("toast.tagDeleted"));
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to delete tag";
      if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("forbidden")) {
        toast.error(t("toast.tagDeleteForbidden"));
      } else if (message.toLowerCase().includes("not found")) {
        toast.error(t("toast.tagMissing"));
      } else {
        toast.error(getApiErrorMessage(error, "Failed to delete tag"));
      }
    },
  });
};
