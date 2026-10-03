import type { GetTagsParams, GetTasksByTagParams } from "../types";

export const tagKeys = {
  all: ["task-tags"] as const,
  boards: () => [...tagKeys.all, "board"] as const,
  boardPrefix: (boardId: string) => [...tagKeys.boards(), boardId] as const,
  board: (boardId: string, params?: GetTagsParams) =>
    [...tagKeys.boardPrefix(boardId), params ?? {}] as const,
  tasksPrefix: (boardId: string) => [...tagKeys.all, "tasks", boardId] as const,
  tasks: (boardId: string, tagId: string, params?: GetTasksByTagParams) =>
    [...tagKeys.tasksPrefix(boardId), tagId, params ?? {}] as const,
};
