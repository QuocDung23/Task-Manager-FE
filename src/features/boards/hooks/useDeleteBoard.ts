import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { boardApi } from "../api/board-api";

type ApiError = { response?: { data?: { message?: string } } };

export const useDeleteBoard = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => boardApi.delete(id),
    onSuccess: () => {
      toast.success("Delete Successfully");
      queryClient.invalidateQueries({ queryKey: ["boards", projectId] });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message ?? "Delete Failed");
    },
  });
};
