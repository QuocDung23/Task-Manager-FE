import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tagApi } from "../api/tag-api";
import { tagKeys } from "../utils/tag-query-keys";
import type { CreateTagRequest } from "../types";

export const useCreateTag = (boardId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagRequest) => tagApi.create(boardId!, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast.success(t("toast.tagCreated"));
      return response.data;
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to create tag";
      if (message.toLowerCase().includes("already exists")) {
        toast.error(t("toast.tagExists"));
      } else if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("forbidden")) {
        toast.error(t("toast.tagCreateForbidden"));
      } else {
        toast.error(getApiErrorMessage(error, "Failed to create tag"));
      }
    },
  });
};
