import { useMutation, useQueryClient } from "@tanstack/react-query";
import { listApi } from "../api/list-api";
import { toast } from "sonner";

export const useDeleteList = (boardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => listApi.delete(id),
    onSuccess: () => {
      toast.success("Delete List Successfully");
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
    onError: (error: any) => {
      toast.error(error.response.data.message || "Delete Failed");
    },
  });
};
