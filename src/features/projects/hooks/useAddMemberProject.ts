import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../api/project-api";
import type {
  AddProjectMemberRequest,
  AddProjectMemberResponse,
  ProjectMemberResponse,
} from "../types";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";
import { applyProjectMemberAdded } from "../utils/project-cache";
import { projectKeys } from "../utils/project-query-keys";

function isFullProjectMember(value: unknown): value is ProjectMemberResponse {
  if (!value || typeof value !== "object") return false;
  const member = value as Partial<ProjectMemberResponse>;
  return (
    typeof member.id === "string" &&
    typeof member.userId === "string" &&
    typeof member.projectId === "string" &&
    typeof member.roleId === "string" &&
    typeof member.name === "string" &&
    typeof member.email === "string"
  );
}

export const useAddMemberProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: AddProjectMemberRequest;
    }) => projectApi.addMember(projectId, data),
    onSuccess: (response, variables) => {
      toast.success(t("toast.memberAdded"));
      const raw = response?.data as
        | ProjectMemberResponse
        | AddProjectMemberResponse
        | undefined;
      if (raw && isFullProjectMember(raw)) {
        applyProjectMemberAdded(queryClient, raw);
      } else {
        void queryClient.invalidateQueries({
          queryKey: projectKeys.members(variables.projectId),
        });
        void queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });
      }
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || "Add Member Failed";
      if (
        errorMessage.includes("Already in project") ||
        error.response?.status === 409
      ) {
        toast.error(t("toast.alreadyInProject"));
      } else if (error.response?.status === 404) {
        toast.error(t("toast.projectUserMissing"));
      } else {
        toast.error(t("toast.projectAddFailed"));
      }
    },
  });
};
