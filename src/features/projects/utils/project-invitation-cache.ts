import type { QueryClient } from "@tanstack/react-query";
import type { ApiResponse, ProjectInvitationResponse, ProjectInvitationStatus } from "../types";
import { projectInvitationKeys } from "./project-invitation-query-keys";
import { getCurrentUserId } from "@/lib/membership";

export function upsertInvitation(
  queryClient: QueryClient,
  invitationId: string,
  status: ProjectInvitationStatus,
  invitation?: ProjectInvitationResponse,
): void {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: projectInvitationKeys.all })) {
    const key = query.queryKey;
    if (invitation && key[1] === "project" && key[2] !== invitation.projectId) continue;
    if (invitation && key[1] === "mine" && key[2] !== undefined && invitation.inviteeId !== getCurrentUserId()) continue;
    queryClient.setQueryData<ApiResponse<ProjectInvitationResponse[]>>(key, (old) => {
      if (!old) return old;
      const statusFilter = key[1] === "project" ? key[3] : key[2];
      const current = old.data.find((entry) => entry.id === invitationId);
      if (typeof statusFilter === "string" && statusFilter !== "ALL" && statusFilter !== status) {
        return current ? { ...old, data: old.data.filter((entry) => entry.id !== invitationId) } : old;
      }
      if (!current && !invitation) return old;
      if (!current && invitation) return { ...old, data: [invitation, ...old.data] };
      return { ...old, data: old.data.map((entry) =>
        entry.id === invitationId ? { ...entry, ...invitation, status } : entry) };
    });
  }
}
