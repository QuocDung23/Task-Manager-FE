import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { BoardRequest } from "../types";
import { boardApi } from "../api/board-api";

type ApiError = { response?: { data?: { message?: string } } };

export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { data: BoardRequest; projectId: string }) =>
      boardApi.create(params.data, params.projectId),
    onSuccess: () => {
      toast.success("Create Successfully");
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message ?? "Create Failed");
    },
  });
};
