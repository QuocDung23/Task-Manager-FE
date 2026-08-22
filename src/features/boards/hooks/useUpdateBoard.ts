import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { BoardRequest, BoardResponse } from "../types";
import { boardApi } from "../api/board-api";
import { boardKeys } from "../utils/board-query-keys";
import { applyBoardUpdated } from "../utils/board-cache";

type ApiError = { response?: { data?: { message?: string } } };

export const useUpdateBoard = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BoardRequest }) =>
      boardApi.update(id, data),
    onSuccess: (response, variables) => {
      toast.success("Update Successfully");
      const board: BoardResponse | undefined = response?.data;
      if (board) {
        applyBoardUpdated(queryClient, projectId, board);
      }
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(variables.id),
      });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message ?? "Update Failed");
    },
  });
};
