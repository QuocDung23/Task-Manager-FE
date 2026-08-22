import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/features/projects/utils/project-query-keys";
import {
  acquireProjectRoom,
  releaseProjectRoom,
  setProjectRoomReconcileHandler,
} from "../rooms/project-room-registry";

/**
 * Refcount join `project:{projectId}` socket room cho trang chi tiết project.
 *
 * Khi ack thành công sẽ gọi reconcile handler đã đăng ký để refetch
 * detail + members + boards list (cùng pattern với useBoardRoom).
 */
export function useProjectRoom(
  projectId: string | null | undefined,
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    acquireProjectRoom(projectId);
    setProjectRoomReconcileHandler(projectId, () => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.members(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["boards", projectId],
      });
      // board-keys có scope project này cũng cần invalidate để board list
      // và các board members liên quan được làm mới.
      void queryClient.invalidateQueries({
        queryKey: ["board-members"],
      });
    });

    return () => {
      setProjectRoomReconcileHandler(projectId, null);
      releaseProjectRoom(projectId);
    };
  }, [projectId, queryClient]);
}