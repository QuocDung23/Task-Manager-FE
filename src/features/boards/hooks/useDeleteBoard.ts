import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { boardApi } from "../api/board-api";
import { boardKeys } from "../utils/board-query-keys";
import { applyBoardDeleted } from "../utils/board-cache";

type ApiError = { response?: { data?: { message?: string } } };

export const useDeleteBoard = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => boardApi.delete(id),
    onSuccess: (_response, boardId) => {
      toast.success("Delete Successfully");
      applyBoardDeleted(queryClient, projectId, boardId);
      void queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message ?? "Delete Failed");
    },
  });
};
