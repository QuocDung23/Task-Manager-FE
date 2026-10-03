import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/features/projects/utils/project-query-keys";
import { boardKeys } from "@/features/boards/utils/board-query-keys";
import {
  acquireProjectRoom,
  releaseProjectRoom,
  setProjectRoomReconcileHandler,
} from "../rooms/project-room-registry";
import type { BoardResponse } from "@/features/boards/types";

/**
 * Refcount join `project:{projectId}` socket room cho trang chi tiết project.
 *
 * Khi ack thành công sẽ gọi reconcile handler đã đăng ký để refetch
 * detail + members + boards list (cùng pattern với useBoardRoom).
 */
export function useProjectRoom(projectId: string | null | undefined): void {
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

      const boardIds = new Set<string>();
      for (const query of queryClient.getQueryCache().findAll({
        queryKey: boardKeys.lists(),
        predicate: (q) => q.queryKey[2] === projectId,
      })) {
        const cache = query.state.data as
          | { data?: BoardResponse[] }
          | undefined;
        for (const board of cache?.data ?? []) {
          if (board?.id && board.projectId === projectId) {
            boardIds.add(board.id);
          }
        }
        void queryClient.invalidateQueries({ queryKey: query.queryKey });
      }
      for (const boardId of boardIds) {
        void queryClient.invalidateQueries({
          queryKey: boardKeys.members(boardId),
        });
      }
    });

    return () => {
      setProjectRoomReconcileHandler(projectId, null);
      releaseProjectRoom(projectId);
    };
  }, [projectId, queryClient]);
}
