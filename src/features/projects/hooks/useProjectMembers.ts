import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { projectApi } from "../api/project-api";
import { projectKeys } from "../utils/project-query-keys";
import type { ApiResponse, ProjectMemberListResponse } from "../types";

/**
 * Lấy danh sách members active của 1 project.
 * Mirror `useBoardMembers`: staleTime dài vì danh sách ít khi đổi trong
 * một phiên; refetch qua socket event hoặc explicit mutation.
 */
export function useProjectMembers(
  projectId: string | null | undefined,
): UseQueryResult<ApiResponse<ProjectMemberListResponse>> {
  return useQuery({
    queryKey: projectKeys.members(projectId ?? ""),
    queryFn: async () => {
      if (!projectId) {
        return {
          success: true,
          data: { members: [], totalMembers: 0 },
        };
      }
      return projectApi.getMembers(projectId);
    },
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}