import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateListRequest } from "../types";
import { listApi } from "../api/list-api";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";

export const useUpdateList = (boardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateListRequest }) =>
      listApi.update(id, data),
    onSuccess: () => {
      toast.success(t("toast.listUpdated"));
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(error, "Update Failed"));
    },
  });
};
