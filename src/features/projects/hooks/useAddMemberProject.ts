import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../api/project-api";
import type { AddProjectMemberRequest } from "../types";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";

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
    onSuccess: (_, variables) => {
      toast.success("Add Member Successfully");
      queryClient.invalidateQueries({
        queryKey: ["project-member", variables.projectId],
      });
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
