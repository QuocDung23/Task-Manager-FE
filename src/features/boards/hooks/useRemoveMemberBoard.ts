import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardApi } from "../api/board-api";
import { boardKeys } from "../utils/board-query-keys";
import { applyBoardMemberRemoved } from "../utils/board-cache";
import type { BoardMemberUser } from "../types";

type ApiError = {
  response?: {
    status?: number;
    data?: { message?: string };
  };
};

/**
 * Xoá một member khỏi board.
 *
 * Endpoint BE theo plan realtime-board §5.7 — sẽ được bổ sung ở Phase 3 BE.
 * onSuccess áp dụng `applyBoardMemberRemoved` để cache đồng bộ với socket
 * event `board:member_removed`.
 */
export const useRemoveMemberBoard = (boardId: string, projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => boardApi.removeMember(boardId, userId),
    onSuccess: (response, userId) => {
      toast.success("Remove Member Successfully");
      const member: BoardMemberUser | undefined = response?.data;
      if (member?.boardMemberId) {
        applyBoardMemberRemoved(
          queryClient,
          boardId,
          member.boardMemberId,
          member.id,
        );
      } else {
        // Fallback khi server không trả DTO: invalidate để refetch.
        void queryClient.invalidateQueries({
          queryKey: boardKeys.members(boardId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: boardKeys.membersByProject(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
      void userId;
    },
    onError: (error: ApiError) => {
      const message =
        error.response?.data?.message ?? "Remove Member Failed";
      if (error.response?.status === 404) {
        toast.error("Member not found in board.");
      } else {
        toast.error(message);
      }
    },
  });
};
