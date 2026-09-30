import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
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

export const useUpdateBoardMemberRole = (
  boardId: string,
  projectId: string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { userId: string; roleId: string }) =>
      boardApi.updateMemberRole(boardId, params.userId, params.roleId),
    onSuccess: (response) => {
      toast.success(t("toast.roleUpdated"));
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
      toast.error(getApiErrorMessage(error, "Update Member Role Failed"));
    },
  });
};
