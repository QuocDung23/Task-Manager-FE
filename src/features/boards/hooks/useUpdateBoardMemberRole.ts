import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardApi } from "../api/board-api";
import { boardKeys } from "../utils/board-query-keys";
import { applyBoardMemberRoleUpdated } from "../utils/board-cache";
import type { BoardMemberUser } from "../types";

type ApiError = {
  response?: {
    status?: number;
    data?: { message?: string };
  };
};

/**
 * Cập nhật role của một board member.
 *
 * Endpoint BE theo plan realtime-board §5.6 — sẽ được bổ sung ở Phase 3 BE.
 * onSuccess áp dụng `applyBoardMemberRoleUpdated` để cache đồng bộ với
 * socket event `board:member_role_updated`.
 */
export const useUpdateBoardMemberRole = (
  boardId: string,
  projectId: string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { userId: string; roleId: string }) =>
      boardApi.updateMemberRole(boardId, params.userId, params.roleId),
    onSuccess: (response) => {
      toast.success("Update Member Role Successfully");
      const member: BoardMemberUser | undefined = response?.data;
      if (member) {
        applyBoardMemberRoleUpdated(queryClient, boardId, member);
      } else {
        void queryClient.invalidateQueries({
          queryKey: boardKeys.members(boardId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: boardKeys.membersByProject(projectId),
      });
    },
    onError: (error: ApiError) => {
      toast.error(
        error.response?.data?.message ?? "Update Member Role Failed",
      );
    },
  });
};
