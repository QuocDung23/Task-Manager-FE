export const projectInvitationKeys = {
  all: ["project-invitations"] as const,
  mine: (status?: string) => ["project-invitations", "mine", status ?? "ALL"] as const,
  project: (projectId: string, status?: string) =>
    ["project-invitations", "project", projectId, status ?? "ALL"] as const,
  pending: (projectId: string) =>
    ["project-invitations", "project", projectId, "PENDING"] as const,
};
