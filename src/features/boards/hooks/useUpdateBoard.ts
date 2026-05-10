import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import { boardApi } from "../api/board-api";

export const useUpdateBoard = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      boardApi.update(id, data),
    onSuccess: () => {
      toast.success("Update Successfully");
      queryClient.invalidateQueries({ queryKey: ["boards", projectId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Update Failed");
    },
  });
};
