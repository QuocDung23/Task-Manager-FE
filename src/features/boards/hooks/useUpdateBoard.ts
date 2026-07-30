import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { BoardRequest } from "../types";
import { boardApi } from "../api/board-api";

type ApiError = { response?: { data?: { message?: string } } };

export const useUpdateBoard = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BoardRequest }) =>
      boardApi.update(id, data),
    onSuccess: () => {
      toast.success("Update Successfully");
      queryClient.invalidateQueries({ queryKey: ["boards", projectId] });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message ?? "Update Failed");
    },
  });
};
