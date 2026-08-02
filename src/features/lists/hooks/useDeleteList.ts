import { useMutation, useQueryClient } from "@tanstack/react-query";
import { listApi } from "../api/list-api";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";

export const useDeleteList = (boardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => listApi.delete(id),
    onSuccess: () => {
      toast.success("Delete List Successfully");
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Delete Failed");
    },
  });
};
