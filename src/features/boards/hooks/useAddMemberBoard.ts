import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardApi } from "../api/board-api";

type ApiError = {
  response?: {
    status?: number;
    data?: { message?: string };
  };
};

export const useAddMemberBoard = (boardId: string, projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => boardApi.addMember(boardId, userId),
    onSuccess: () => {
      toast.success("Add Member Successfully");
      queryClient.invalidateQueries({
        queryKey: ["board-members", boardId],
      });
      queryClient.invalidateQueries({
        queryKey: ["boards-members", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["board", boardId],
      });
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || "Add Member Failed";
      if (
        errorMessage.includes("Already in board") ||
        error.response?.status === 409
      ) {
        toast.error("Already in board");
      } else if (error.response?.status === 404) {
        toast.error("No valid board or user found.");
      } else {
        toast.error("Add member to board fail");
      }
    },
  });
};
