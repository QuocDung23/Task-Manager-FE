import type { QueryClient } from "@tanstack/react-query";
import type { BoardResponse } from "@/features/boards/types";
import type { ListResponse } from "@/features/lists/types";
import type { TaskResponse } from "@/features/tasks/types";
import { boardKeys } from "@/features/boards/utils/board-query-keys";
import { listKeys } from "@/features/lists/utils/list-query-keys";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";
import { projectKeys } from "./project-query-keys";

export function clearProjectAccessCache(queryClient: QueryClient, projectId: string): string[] {
  const boardIds = new Set<string>();
  for (const query of queryClient.getQueryCache().findAll({ queryKey: boardKeys.lists() })) {
    if (query.queryKey[2] !== projectId) continue;
    const data = query.state.data as { data?: BoardResponse[] } | undefined;
    for (const board of data?.data ?? []) boardIds.add(board.id);
    queryClient.removeQueries({ queryKey: query.queryKey });
  }
  for (const query of queryClient.getQueryCache().findAll({ queryKey: ["board"] })) {
    if (query.queryKey[0] !== "board") continue;
    const data = query.state.data as { data?: BoardResponse } | undefined;
    if (data?.data?.projectId === projectId) boardIds.add(data.data.id);
  }
  for (const boardId of boardIds) {
    for (const query of queryClient.getQueryCache().findAll({ queryKey: listKeys.boardPrefix(boardId) })) {
      const data = query.state.data as { data?: ListResponse[] } | undefined;
      for (const list of data?.data ?? []) {
        for (const taskQuery of queryClient.getQueryCache().findAll({ queryKey: [...taskKeys.lists(), list.id] })) {
          const taskData = taskQuery.state.data as { data?: TaskResponse[] } | undefined;
          for (const task of taskData?.data ?? []) queryClient.removeQueries({ queryKey: taskKeys.detail(task.id) });
        }
        queryClient.removeQueries({ queryKey: [...taskKeys.lists(), list.id] });
      }
    }
    queryClient.removeQueries({ queryKey: listKeys.boardPrefix(boardId) });
    queryClient.removeQueries({ queryKey: boardKeys.detail(boardId) });
    queryClient.removeQueries({ queryKey: boardKeys.members(boardId) });
  }
  queryClient.removeQueries({ queryKey: boardKeys.membersByProject(projectId) });
  queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
  queryClient.removeQueries({ queryKey: projectKeys.members(projectId) });
  return [...boardIds];
}
