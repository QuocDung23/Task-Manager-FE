export const boardKeys = {
  all: ["boards"] as const,
  lists: () => ["boards", "list"] as const,
  list: (projectId: string, page: number, limit: number, name?: string) =>
    ["boards", "list", projectId, page, limit, name ?? null] as const,
  detail: (boardId: string) => ["board", boardId] as const,
  members: (boardId: string) => ["board-members", boardId] as const,
  membersByProject: (projectId: string) =>
    ["boards-members", projectId] as const,
};
