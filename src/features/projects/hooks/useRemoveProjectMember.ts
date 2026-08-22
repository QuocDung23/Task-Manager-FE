import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../api/project-api";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";
import { applyProjectMemberRemoved } from "../utils/project-cache";

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
      // BE trả về snapshot member đã soft-delete; dùng id + userId từ
      // payload để xoá khỏi members cache.
      const removed = response?.data;
      applyProjectMemberRemoved(
        queryClient,
        variables.projectId,
        variables.memberId,
        removed?.userId ?? "",
      );
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Remove Member Failed");
    },
  });
};