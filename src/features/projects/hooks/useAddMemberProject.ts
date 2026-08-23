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
      toast.success("Add Member Successfully");
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
      }
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || "Add Member Failed";
      if (
        errorMessage.includes("Already in project") ||
        error.response?.status === 409
      ) {
        toast.error("Already in project");
      } else if (error.response?.status === 404) {
        toast.error("No valid project or user found.");
      } else {
        toast.error("Add member to project fail");
      }
    },
  });
};
