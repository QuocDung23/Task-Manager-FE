import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { BoardRequest, BoardResponse } from "../types";
import { boardApi } from "../api/board-api";
import { boardKeys } from "../utils/board-query-keys";
import { applyBoardCreated } from "../utils/board-cache";

type ApiError = { response?: { data?: { message?: string } } };

export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { data: BoardRequest; projectId: string }) =>
      boardApi.create(params.data, params.projectId),
    onSuccess: (response, variables) => {
      toast.success(t("toast.created"));
      const board: BoardResponse | undefined = response?.data;
      if (board) {
        applyBoardCreated(queryClient, variables.projectId, board);
      }
      void queryClient.invalidateQueries({
        queryKey: boardKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: boardKeys.membersByProject(variables.projectId),
      });
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(error, "Create Failed"));
    },
  });
};