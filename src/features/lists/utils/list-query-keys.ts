import type { ListStatus } from "../types";

export const listKeys = {
  all: ["lists"] as const,
  boardPrefix: (boardId: string) => ["lists", boardId] as const,
  board: (
    boardId: string,
    page?: number,
    limit?: number,
    name?: string,
    status?: ListStatus,
  ) =>
    ["lists", boardId, page ?? 1, limit ?? 12, name ?? "", status ?? ""] as const,
};
