import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../api/project-api";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";
import { applyProjectMemberRemoved } from "../utils/project-cache";
import { projectKeys } from "../utils/project-query-keys";

export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      memberId,
    }: {
      projectId: string;
      memberId: string;
    }) => projectApi.removeMember(projectId, memberId),
    onSuccess: (response, variables) => {
      toast.success(t("toast.memberRemoved"));

      const removed = response?.data;
      applyProjectMemberRemoved(
        queryClient,
        variables.projectId,
        variables.memberId,
        removed?.userId ?? "",
      );
      if (!removed?.userId) {
        void queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });
      }
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(error, "Remove Member Failed"));
    },
  });
};
