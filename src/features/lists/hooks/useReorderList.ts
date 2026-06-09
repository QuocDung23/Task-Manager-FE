import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReorderListsRequest } from "../types";
import { listApi } from "../api/list-api";
import { toast } from "sonner";

export const useReorderList = (boardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderListsRequest) => listApi.reorder(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Reorder List Failed");
    },
  });
};

export { useReorderList as useReoderList };
