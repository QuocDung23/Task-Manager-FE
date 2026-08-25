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
      toast.success("Remove Member Successfully");

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
      toast.error(error.response?.data?.message || "Remove Member Failed");
    },
  });
};
