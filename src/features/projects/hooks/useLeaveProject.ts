import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { t } from "@/services/i18n";
import type { ApiError } from "@/lib/api-error";
import { projectApi } from "../api/project-api";
import { applyProjectDeleted, applyProjectMemberRemoved } from "../utils/project-cache";
import { projectKeys } from "../utils/project-query-keys";
import { clearProjectAccessCache } from "../utils/clear-project-access-cache";
import { revokeProjectRoomAccess } from "@/features/realtime/rooms/project-room-registry";
import { revokeBoardRoomAccess } from "@/features/realtime/rooms/board-room-registry";

export function useLeaveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectApi.leaveProject(projectId),
    onSuccess: (response, projectId) => {
      applyProjectMemberRemoved(queryClient, projectId, response.data.id, response.data.userId);
      const boardIds = clearProjectAccessCache(queryClient, projectId);
      revokeProjectRoomAccess(projectId);
      for (const boardId of boardIds) revokeBoardRoomAccess(boardId);
      applyProjectDeleted(queryClient, projectId);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success(t("leave.projectDone"));
    },
    onError: (error: ApiError, projectId) => {
      const status = error.response?.status;
      toast.error(status === 409 ? t("leave.ownsBoards") : status === 403 ? t("leave.owner") : status === 404 ? t("leave.missing") : t("leave.failed"));
      if (status === 404) void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      if (status === 404) queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
