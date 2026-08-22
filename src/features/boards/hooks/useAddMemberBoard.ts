import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardApi } from "../api/board-api";
import { boardKeys } from "../utils/board-query-keys";
import { applyBoardMemberAdded } from "../utils/board-cache";
import type { BoardMemberUser } from "../types";

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
    onSuccess: (response, userId) => {
      toast.success("Add Member Successfully");
      const member: BoardMemberUser | undefined = response?.data;
      if (member) {
        applyBoardMemberAdded(queryClient, boardId, member);
      } else {
        // Fallback khi server không trả DTO: invalidate như cũ.
        void queryClient.invalidateQueries({
          queryKey: boardKeys.members(boardId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: boardKeys.membersByProject(projectId),
      });
      // Board detail có thể đếm memberCount qua derived hook, invalidate
      // để useBoardMembers ở grid refresh.
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
      // Suppress unused var lint khi TS narrowing userId ở nhánh fallback.
      void userId;
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
