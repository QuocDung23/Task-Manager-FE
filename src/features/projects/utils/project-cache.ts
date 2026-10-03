import type { QueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "../types";
import type {
  ProjectMemberResponse,
  ProjectMemberUser,
  ProjectResponse,
} from "../types";
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
  const rawStatus = (project as { status?: string }).status;
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

      if (current && !matchesFilter) {
        return {
          ...old,
          data: old.data.filter((p) => p.id !== project.id),
        };
      }

      if (current) {
        const next = [...old.data];
        next[currentIndex] = { ...current, ...project };
        return { ...old, data: next };
      }

      const page = typeof key[2] === "number" ? key[2] : null;
      const isFiltering = typeof key[4] === "string" && key[4].length > 0;
      if (!isFiltering && page !== null && page > 1) {
        return old;
      }

      if (!matchesFilter) return old;
      return {
        ...old,
        data: [project, ...old.data],
        pagination: bumpPaginationTotal(old.pagination, 1),
      };
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

function upsertMemberInProjectLists(
  queryClient: QueryClient,
  projectId: string,
  member: ProjectMemberUser,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: projectKeys.lists() });

  for (const entry of queries) {
    queryClient.setQueryData<ProjectListCache>(entry.queryKey, (old) => {
      if (!old) return old;
      let mutated = false;
      const next = old.data.map((project) => {
        if (project.id !== projectId) return project;
        const currentMembers = project.members ?? [];
        const existsIndex = currentMembers.findIndex((m) => m.id === member.id);
        if (existsIndex >= 0) {
          mutated = true;
          return {
            ...project,
            members: currentMembers.map((m) =>
              m.id === member.id ? { ...m, ...member } : m,
            ),
          };
        }
        mutated = true;
        return {
          ...project,
          members: [...currentMembers, member],
        };
      });
      if (!mutated) return old;
      return { ...old, data: next };
    });
  }
}

function removeMemberFromProjectLists(
  queryClient: QueryClient,
  projectId: string,
  memberId: string,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: projectKeys.lists() });

  for (const entry of queries) {
    queryClient.setQueryData<ProjectListCache>(entry.queryKey, (old) => {
      if (!old) return old;
      let mutated = false;
      const next = old.data.map((project) => {
        if (project.id !== projectId) return project;
        if (!project.members) return project;
        const filtered = project.members.filter((m) => m.id !== memberId);
        if (filtered.length === project.members.length) return project;
        mutated = true;
        return { ...project, members: filtered };
      });
      if (!mutated) return old;
      return { ...old, data: next };
    });
  }
}

function toMemberUser(member: ProjectMemberResponse): ProjectMemberUser {
  return {
    id: member.userId,
    name: member.name,
    email: member.email,
    avatar: member.avatar,
  };
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
  upsertMemberInProjectLists(
    queryClient,
    member.projectId,
    toMemberUser(member),
  );
}

export function applyProjectMemberRemoved(
  queryClient: QueryClient,
  projectId: string,
  memberId: string,
  userId: string,
): void {
  if (!projectId || !memberId) return;
  const delta = removeMemberFromMembersCache(queryClient, projectId, memberId);
  if (delta === -1) {
    adjustMembersTotal(queryClient, projectId, -1);
    // ProjectCard lưu ProjectMemberUser (id = userId) trong cache list,
    // nên phải filter bằng userId, không phải memberId.
    removeMemberFromProjectLists(queryClient, projectId, userId || memberId);
  }
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
