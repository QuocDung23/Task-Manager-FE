import { useQuery } from "@tanstack/react-query";
import { projectApi } from "../api/project-api";
import { projectInvitationKeys } from "../utils/project-invitation-query-keys";

export function usePendingProjectInvitations(
  projectId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: projectInvitationKeys.pending(projectId ?? ""),
    queryFn: () => projectApi.getPendingInvitations(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 0,
    meta: { silentError: true },
  });
}
