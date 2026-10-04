import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { t } from "@/services/i18n";
import type { ApiError } from "@/lib/api-error";
import { boardApi } from "../api/board-api";
import { applyBoardMemberRemoved } from "../utils/board-cache";
import { boardKeys } from "../utils/board-query-keys";
import { listKeys } from "@/features/lists/utils/list-query-keys";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";

export function useLeaveBoard(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => boardApi.leaveBoard(boardId),
    onSuccess: async (response, boardId) => {
      applyBoardMemberRemoved(queryClient, boardId, response.data.boardMemberId, response.data.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardKeys.members(boardId) }),
        queryClient.invalidateQueries({ queryKey: boardKeys.membersByProject(projectId) }),
        queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
        queryClient.invalidateQueries({ queryKey: listKeys.boardPrefix(boardId) }),
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
      ]);
      toast.success(t("leave.boardDone"));
    },
    onError: (error: ApiError) => {
      const status = error.response?.status;
      toast.error(status === 403 ? t("leave.owner") : status === 404 ? t("leave.missing") : t("leave.failed"));
    },
  });
}
