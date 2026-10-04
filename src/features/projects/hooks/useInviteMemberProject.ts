import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";
import { projectApi } from "../api/project-api";
import type { InviteProjectMemberRequest } from "../types";
import { projectInvitationKeys } from "../utils/project-invitation-query-keys";

export const useInviteMemberProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: InviteProjectMemberRequest }) =>
      projectApi.inviteMember(projectId, data),
    onSuccess: (_response, { projectId }) => {
      toast.success(t("invitation.sent"));
      void queryClient.invalidateQueries({ queryKey: projectInvitationKeys.pending(projectId) });
    },
    onError: (error: ApiError, { projectId }) => {
      if (error.response?.status === 409) {
        toast.error(t("invitation.alreadyExists"));
        void queryClient.invalidateQueries({ queryKey: projectInvitationKeys.pending(projectId) });
      } else if (error.response?.status === 403) toast.error(t("invitation.forbidden"));
      else if (error.response?.status === 404) toast.error(t("invitation.missing"));
      else toast.error(t("invitation.sendFailed"));
    },
  });
};
