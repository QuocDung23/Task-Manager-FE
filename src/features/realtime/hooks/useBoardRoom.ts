import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";
import { tagKeys } from "@/features/tags/utils/tag-query-keys";
import { listKeys } from "@/features/lists/utils/list-query-keys";
import {
  acquireBoardRoom,
  releaseBoardRoom,
  setBoardRoomReconcileHandler,
} from "../rooms/board-room-registry";

export function useBoardRoom(
  boardId: string | null | undefined,
  listIds: readonly string[] = [],
): void {
  const queryClient = useQueryClient();
  const normalizedListIds = [...new Set(listIds)];
  const listIdsKey = normalizedListIds.join("|");

  useEffect(() => {
    if (!boardId) return;
    acquireBoardRoom(boardId);
    setBoardRoomReconcileHandler(boardId, () => {
      void queryClient.invalidateQueries({ queryKey: tagKeys.boardPrefix(boardId) });
      void queryClient.invalidateQueries({ queryKey: tagKeys.tasksPrefix(boardId) });
      // Invalidate list queries for the board to sync new lists
      void queryClient.invalidateQueries({ queryKey: listKeys.boardPrefix(boardId) });
      // Invalidate task queries for known listIds
      for (const listId of listIdsKey ? listIdsKey.split("|") : []) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.list(listId) });
      }
      // Invalidate task detail queries
      for (const query of queryClient.getQueryCache().findAll({ queryKey: taskKeys.all })) {
        const key = query.queryKey;
        if (key[1] !== "detail" || typeof key[2] !== "string") continue;
        void queryClient.invalidateQueries({ queryKey: key });
      }
    });

    return () => {
      setBoardRoomReconcileHandler(boardId, null);
      releaseBoardRoom(boardId);
    };
  }, [boardId, listIdsKey, queryClient]);
}
