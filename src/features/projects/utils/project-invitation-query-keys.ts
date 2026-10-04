export const projectInvitationKeys = {
  pending: (projectId: string) =>
    ["project-invitations", projectId, "PENDING"] as const,
};
