import { useQuery } from "@tanstack/react-query";

import { boardApi } from "@/features/boards/api/board-api";
import type { ProjectResponse } from "../types";


export function resolveProjectBoardCount(project: ProjectResponse): number | undefined {
  if (typeof project.boardCount === "number") return project.boardCount;
  if (project._count?.boards !== undefined) return project._count.boards;
  return undefined;
}

export interface UseProjectBoardCountsResult {
  getCount: (project: ProjectResponse) => number | undefined;
  isLoading: boolean;
}

export function useProjectBoardCounts(
  projects: ProjectResponse[],
): UseProjectBoardCountsResult {
  const missing = projects.filter(
    (p) => resolveProjectBoardCount(p) === undefined,
  );

  const query = useQuery({
    queryKey: ["project-board-counts", missing.map((p) => p.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        missing.map(async (p) => {
          try {
            const res = await boardApi.getAllByProjectId(p.id, 1, 1);
            return [p.id, res.pagination?.totalItems ?? 0] as const;
          } catch {
            return [p.id, 0] as const;
          }
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
    enabled: missing.length > 0,
    staleTime: 60_000,
  });

  const getCount = (project: ProjectResponse): number | undefined => {
    const fromPayload = resolveProjectBoardCount(project);
    if (fromPayload !== undefined) return fromPayload;
    return query.data?.[project.id];
  };

  return {
    getCount,
    isLoading: missing.length > 0 && query.isLoading,
  };
}
