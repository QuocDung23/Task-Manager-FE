/**
 * Centralised query-key factory cho feature project.
 * Bất kỳ nơi nào đọc/ghi cache của project phải đi qua factory này
 * để socket reducer và HTTP mutation cùng thấy một bề mặt key.
 */
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => ["projects", "list"] as const,
  list: (page: number, limit: number, name?: string) =>
    ["projects", "list", page, limit, name ?? null] as const,
  detail: (projectId: string) => ["project", projectId] as const,
  members: (projectId: string) => ["project-members", projectId] as const,
};