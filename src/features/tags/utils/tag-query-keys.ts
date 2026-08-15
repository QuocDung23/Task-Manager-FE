import type { GetTagsParams, GetTasksByTagParams } from "../types";

export const tagKeys = {
  all: ["task-tags"] as const,
  board: (boardId: string, params?: GetTagsParams) =>
    [...tagKeys.all, "board", boardId, params ?? {}] as const,
  tasks: (boardId: string, tagId: string, params?: GetTasksByTagParams) =>
    [...tagKeys.all, "tasks", boardId, tagId, params ?? {}] as const,
};
