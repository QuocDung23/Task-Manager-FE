import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateListRequest } from "../types";
import { listApi } from "../api/list-api";
import { toast } from "sonner";

export const useUpdateList = (boardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateListRequest }) =>
      listApi.update(id, data),
    onSuccess: () => {
      toast.success("Update List Successfully");
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
    onError: (error: any) => {
      toast.error(error.response.data.message || "Update Failed");
    },
  });
};
