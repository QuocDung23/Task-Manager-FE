import type { QueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "../types";
import type { ProjectMemberResponse, ProjectResponse } from "../types";
import { projectKeys } from "./project-query-keys";

type ProjectListCache = ApiResponse<ProjectResponse[]> | undefined;
type ProjectDetailCache = ApiResponse<ProjectResponse> | undefined;
type ProjectMembersCache =
  | ApiResponse<{
      members: ProjectMemberResponse[];
      totalMembers: number;
    }>
  | undefined;

function isActiveProject(project: ProjectResponse): boolean {
  // ProjectResponse hiện không trả status rõ ràng từ BE; phòng khi BE bổ sung
  // status ở DTO thì reducer sẽ tự skip các bản ghi soft-delete.
  const rawStatus = (project as unknown as { status?: string }).status;
  return rawStatus === undefined || rawStatus === "ACTIVE";
}

function listMatchesNameFilter(
  queryKey: readonly unknown[],
  project: ProjectResponse,
): boolean {
  // key shape: ["projects", "list", page, limit, name?]
  const filterName = queryKey[4];
  if (typeof filterName !== "string" || filterName.length === 0) return true;
  const needle = filterName.toLowerCase();
  return (
    project.name.toLowerCase().includes(needle) ||
    (project.description ?? "").toLowerCase().includes(needle)
  );
}

function bumpPaginationTotal(
  pagination: ApiResponse<ProjectResponse[]>["pagination"] | undefined,
  delta: number,
): ApiResponse<ProjectResponse[]>["pagination"] | undefined {
  if (!pagination || delta === 0) return pagination;
  const totalItems = Math.max(0, pagination.totalItems + delta);
  return {
    ...pagination,
    totalItems,
    totalPages: Math.max(
      1,
      Math.ceil(totalItems / Math.max(1, pagination.itemsPerPage ?? 1)),
    ),
  };
}

function upsertProjectInLists(
  queryClient: QueryClient,
  project: ProjectResponse,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: projectKeys.lists() });

  for (const entry of queries) {
    const key = entry.queryKey;
    queryClient.setQueryData<ProjectListCache>(key, (old) => {
      if (!old) return old;
      const matchesFilter = listMatchesNameFilter(key, project);
      const currentIndex = old.data.findIndex((p) => p.id === project.id);
      const current = currentIndex >= 0 ? old.data[currentIndex] : undefined;

      if (currentIndex < 0) {
        if (!matchesFilter) return old;
        const next = [project, ...old.data];
        return {
          ...old,
          data: next,
          pagination: bumpPaginationTotal(old.pagination, 1),
        };
      }

      if (!matchesFilter) {
        const next = old.data.filter((p) => p.id !== project.id);
        return {
          ...old,
          data: next,
          pagination: bumpPaginationTotal(old.pagination, -1),
        };
      }

      const next = [...old.data];
      next[currentIndex] = { ...current, ...project };
      return { ...old, data: next };
    });
  }
}

function removeProjectFromLists(
  queryClient: QueryClient,
  projectId: string,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: projectKeys.lists() });

  for (const entry of queries) {
    queryClient.setQueryData<ProjectListCache>(entry.queryKey, (old) => {
      if (!old) return old;
      const before = old.data.length;
      const next = old.data.filter((p) => p.id !== projectId);
      if (next.length === before) return old;
      return {
        ...old,
        data: next,
        pagination: bumpPaginationTotal(
          old.pagination,
          -(before - next.length),
        ),
      };
    });
  }
}

function adjustMembersTotal(
  queryClient: QueryClient,
  projectId: string,
  delta: number,
): void {
  queryClient.setQueryData<ProjectDetailCache>(
    projectKeys.detail(projectId),
    (old) => {
      if (!old) return old;
      const detail = old.data as unknown as { totalMembers?: number };
      const next = (detail.totalMembers ?? 0) + delta;
      return {
        ...old,
        data: {
          ...(old.data as ProjectResponse),
          ...({ totalMembers: Math.max(0, next) } as object),
        } as ProjectResponse,
      };
    },
  );
}

function applyMemberToMembersCache(
  queryClient: QueryClient,
  member: ProjectMemberResponse,
): -1 | 0 | 1 {
  let delta: -1 | 0 | 1 = 0;
  queryClient.setQueryData<ProjectMembersCache>(
    projectKeys.members(member.projectId),
    (old) => {
      if (!old) return old;
      const index = old.data.members.findIndex((m) => m.id === member.id);
      const wasPresent = index >= 0;
      const nextMembers = wasPresent
        ? old.data.members.map((m) => (m.id === member.id ? member : m))
        : [...old.data.members, member];
      delta = wasPresent ? 0 : 1;
      return {
        ...old,
        data: {
          ...old.data,
          members: nextMembers,
          totalMembers: old.data.totalMembers + delta,
        },
      };
    },
  );
  return delta;
}

function removeMemberFromMembersCache(
  queryClient: QueryClient,
  projectId: string,
  memberId: string,
): -1 | 0 {
  let delta: -1 | 0 = 0;
  queryClient.setQueryData<ProjectMembersCache>(
    projectKeys.members(projectId),
    (old) => {
      if (!old) return old;
      const before = old.data.members.length;
      const next = old.data.members.filter((m) => m.id !== memberId);
      if (next.length === before) return old;
      delta = before - next.length === 1 ? -1 : 0;
      return {
        ...old,
        data: {
          ...old.data,
          members: next,
          totalMembers: Math.max(0, old.data.totalMembers + delta),
        },
      };
    },
  );
  return delta;
}

export function applyProjectCreated(
  queryClient: QueryClient,
  project: ProjectResponse,
): void {
  if (!project?.id || !project?.userId) {
    if (import.meta.env.DEV) {
      console.warn("[realtime] applyProjectCreated invalid project", project);
    }
    return;
  }
  if (!isActiveProject(project)) return;
  upsertProjectInLists(queryClient, project);
}

export function applyProjectUpdated(
  queryClient: QueryClient,
  project: ProjectResponse,
): void {
  if (!project?.id) {
    if (import.meta.env.DEV) {
      console.warn("[realtime] applyProjectUpdated invalid project", project);
    }
    return;
  }
  if (!isActiveProject(project)) {
    applyProjectDeleted(queryClient, project.id);
    return;
  }

  queryClient.setQueryData<ProjectDetailCache>(
    projectKeys.detail(project.id),
    (old) => (old ? { ...old, data: { ...old.data, ...project } } : old),
  );
  upsertProjectInLists(queryClient, project);
}

export function applyProjectDeleted(
  queryClient: QueryClient,
  projectId: string,
): void {
  if (!projectId) return;
  removeProjectFromLists(queryClient, projectId);
  queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
  queryClient.removeQueries({ queryKey: projectKeys.members(projectId) });
}

export function applyProjectMemberAdded(
  queryClient: QueryClient,
  member: ProjectMemberResponse,
): void {
  if (!member?.id || !member?.projectId || !member?.userId) {
    if (import.meta.env.DEV) {
      console.warn("[realtime] applyProjectMemberAdded invalid member", member);
    }
    return;
  }
  if (member.status !== undefined && member.status !== "ACTIVE") return;
  const delta = applyMemberToMembersCache(queryClient, member);
  if (delta === 1) {
    adjustMembersTotal(queryClient, member.projectId, 1);
  }
}

export function applyProjectMemberRemoved(
  queryClient: QueryClient,
  projectId: string,
  memberId: string,
  _userId: string,
): void {
  if (!projectId || !memberId) return;
  const delta = removeMemberFromMembersCache(queryClient, projectId, memberId);
  if (delta === -1) {
    adjustMembersTotal(queryClient, projectId, -1);
  }
  void _userId;
}

export function applyProjectMemberRoleUpdated(
  queryClient: QueryClient,
  member: ProjectMemberResponse,
): void {
  if (!member?.id || !member?.projectId) {
    if (import.meta.env.DEV) {
      console.warn(
        "[realtime] applyProjectMemberRoleUpdated invalid member",
        member,
      );
    }
    return;
  }
  applyMemberToMembersCache(queryClient, member);
}
