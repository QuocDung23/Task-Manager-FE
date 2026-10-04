import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { t } from "@/services/i18n";
import type { ApiError } from "@/lib/api-error";
import { projectApi } from "../api/project-api";
import { projectInvitationKeys } from "../utils/project-invitation-query-keys";
import { projectKeys } from "../utils/project-query-keys";
import { upsertInvitation } from "../utils/project-invitation-cache";

function handleInvitationError(error: ApiError, refresh: () => void): void {
  const status = error.response?.status;
  if (status === 409 || status === 410 || status === 404) {
    toast.error(status === 404 ? t("invitation.missing") : t("invitation.changed"));
    refresh();
  } else if (status === 403) toast.error(t("invitation.forbidden"));
  else toast.error(t("invitation.actionFailed"));
}

export function useMyProjectInvitations(enabled = true) {
  return useQuery({
    queryKey: projectInvitationKeys.mine(),
    queryFn: () => projectApi.getMyInvitations(),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useAcceptProjectInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => projectApi.acceptInvitation(invitationId),
    onSuccess: (response, invitationId) => {
      toast.success(t("invitation.acceptedToast"));
      const member = response.data;
      upsertInvitation(queryClient, invitationId, "ACCEPTED");
      void queryClient.invalidateQueries({ queryKey: projectInvitationKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(member.projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(member.projectId) });
    },
    onError: (error: ApiError) => handleInvitationError(error, () => {
      void queryClient.invalidateQueries({ queryKey: projectInvitationKeys.all });
    }),
  });
}

export function useDeclineProjectInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => projectApi.declineInvitation(invitationId),
    onSuccess: (response) => {
      toast.success(t("invitation.declinedToast"));
      upsertInvitation(queryClient, response.data.id, response.data.status, response.data);
      void queryClient.invalidateQueries({ queryKey: projectInvitationKeys.mine() });
    },
    onError: (error: ApiError) => handleInvitationError(error, () => {
      void queryClient.invalidateQueries({ queryKey: projectInvitationKeys.mine() });
    }),
  });
}

export function useRevokeProjectInvitation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => projectApi.revokeInvitation(projectId, invitationId),
    onSuccess: (response) => {
      toast.success(t("invitation.revokedToast"));
      upsertInvitation(queryClient, response.data.id, response.data.status, response.data);
      void queryClient.invalidateQueries({ queryKey: projectInvitationKeys.pending(projectId) });
    },
    onError: (error: ApiError) => handleInvitationError(error, () => {
      void queryClient.invalidateQueries({ queryKey: projectInvitationKeys.pending(projectId) });
    }),
  });
}
