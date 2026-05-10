import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BoardRequest } from "../types";
import { boardApi } from "../api/board-api";
import { toast } from "sonner";

export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { data: BoardRequest; projectId: string }) =>
      boardApi.create(params.data, params.projectId),
    onSuccess: () => {
      toast.success("Create Successfully");
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Create Failed");
    },
  });
};
