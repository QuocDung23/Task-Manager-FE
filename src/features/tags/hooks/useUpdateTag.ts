import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tagApi } from "../api/tag-api";
import { tagKeys } from "../utils/tag-query-keys";
import type { UpdateTagRequest, TagResponse } from "../types";

export const useUpdateTag = (boardId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: UpdateTagRequest }) =>
      tagApi.update(boardId!, tagId, data),
    onMutate: async ({ tagId, data }) => {
      await queryClient.cancelQueries({ queryKey: tagKeys.all });

      const previousTags = queryClient.getQueryData<TagResponse[]>(
        tagKeys.board(boardId ?? ""),
      );

      queryClient.setQueryData<TagResponse[]>(
        tagKeys.board(boardId ?? ""),
        (old) =>
          old?.map((tag) =>
            tag.id === tagId ? { ...tag, ...data } : tag,
          ),
      );

      return { previousTags };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast.success(t("toast.tagUpdated"));
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(
          tagKeys.board(boardId ?? ""),
          context.previousTags,
        );
      }
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to update tag";
      if (message.toLowerCase().includes("already exists")) {
        toast.error(t("toast.tagExists"));
      } else if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("forbidden")) {
        toast.error(t("toast.tagsForbidden"));
      } else if (message.toLowerCase().includes("not found")) {
        toast.error(t("toast.tagMissing"));
      } else {
        toast.error(getApiErrorMessage(error, "Failed to update tag"));
      }
    },
  });
};
