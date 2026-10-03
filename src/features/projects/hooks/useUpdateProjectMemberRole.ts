import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../api/project-api";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";
import { applyProjectMemberRoleUpdated } from "../utils/project-cache";

export const useUpdateProjectMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      memberId,
      roleId,
    }: {
      projectId: string;
      memberId: string;
      roleId: string;
    }) => projectApi.updateMemberRole(projectId, memberId, { roleId }),
    onSuccess: (response) => {
      toast.success(t("toast.roleUpdated"));
      if (response?.data?.id) {
        applyProjectMemberRoleUpdated(queryClient, response.data);
      }
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(error, "Update Role Failed"));
    },
  });
};
