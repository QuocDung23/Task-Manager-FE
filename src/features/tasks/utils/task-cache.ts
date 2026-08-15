import type { QueryClient } from "@tanstack/react-query";
import type {
  TaskApiResponse,
  TaskListFilters,
  TaskResponse,
} from "../types";
import { taskKeys } from "./task-query-keys";

type TaskListCache = TaskApiResponse | undefined;

function matchesFilters(filters: TaskListFilters | undefined, task: TaskResponse): boolean {
  if (!filters) return true;
  if (filters.scheduleState && task.scheduleState !== filters.scheduleState) return false;
  if (filters.lockStatus && task.lockStatus !== filters.lockStatus) return false;
  if (filters.dueBefore && (!task.dueDate || task.dueDate > filters.dueBefore)) return false;
  if (filters.dueAfter && (!task.dueDate || task.dueDate < filters.dueAfter)) return false;

  if (filters.tagIds && filters.tagIds.length > 0) {
    const taskTagIds = new Set(task.tags.map((tag) => tag.id));
    const matchesAll = filters.tagIds.every((id) => taskTagIds.has(id));
    const matchesAny = filters.tagIds.some((id) => taskTagIds.has(id));
    if (filters.tagMode === "ALL" ? !matchesAll : !matchesAny) return false;
  }
  return true;
}

function mergeTaskSnapshot(current: TaskResponse | undefined, incoming: TaskResponse): TaskResponse {
  if (!current || incoming.tagVersion >= current.tagVersion) return incoming;
  return {
    ...current,
    ...incoming,
    tags: current.tags,
    tagVersion: current.tagVersion,
  };
}

function updatePagination(
  pagination: TaskApiResponse["pagination"],
  delta: number,
): TaskApiResponse["pagination"] {
  if (!pagination || delta === 0) return pagination;
  const totalItems = Math.max(0, pagination.totalItems + delta);
  return {
    ...pagination,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, pagination.limit))),
  };
}

function replaceTaskInList(
  old: TaskListCache,
  incoming: TaskResponse,
  filters: TaskListFilters | undefined,
): TaskListCache {
  if (!old) return old;
  const currentIndex = old.data.findIndex((item) => item.id === incoming.id);
  const current = currentIndex >= 0 ? old.data[currentIndex] : undefined;
  const task = mergeTaskSnapshot(current, incoming);
  const shouldInclude = matchesFilters(filters, task);

  if (currentIndex < 0) {
    if (!shouldInclude) return old;
    const data = [...old.data, task].sort((left, right) => left.orderTask - right.orderTask);
    return { ...old, data, pagination: updatePagination(old.pagination, 1) };
  }

  if (!shouldInclude) {
    const occurrences = old.data.filter((item) => item.id === incoming.id).length;
    const data = old.data.filter((item) => item.id !== incoming.id);
    return { ...old, data, pagination: updatePagination(old.pagination, -occurrences) };
  }

  const occurrences = old.data.filter((item) => item.id === incoming.id).length;
  const data = [...old.data.filter((item) => item.id !== incoming.id), task];
  data.sort((left, right) => left.orderTask - right.orderTask);
  return {
    ...old,
    data,
    pagination: updatePagination(old.pagination, 1 - occurrences),
  };
}

function isTaskListEntry(key: readonly unknown[]): boolean {
  return key.length >= 3 && key[0] === taskKeys.all[0] && key[1] === "list";
}

function extractFilters(key: readonly unknown[]): TaskListFilters | undefined {
  const candidate = key[key.length - 1];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return undefined;
  return candidate as TaskListFilters;
}

export function applyCanonicalTaskSnapshot(
  queryClient: QueryClient,
  task: TaskResponse,
  options: { source: "http" | "socket" } = { source: "socket" },
): void {
  void options;
  const canonicalTask: TaskResponse = {
    ...task,
    tagVersion: typeof task.tagVersion === "number" ? task.tagVersion : 0,
  };
  const queries = queryClient.getQueryCache().findAll({ queryKey: taskKeys.lists() });
  for (const entry of queries) {
    const key = entry.queryKey;
    if (!isTaskListEntry(key) || key[2] !== canonicalTask.listId) continue;
    queryClient.setQueryData<TaskListCache>(key, (old) =>
      replaceTaskInList(old, canonicalTask, extractFilters(key)),
    );
  }

  const currentDetail = queryClient.getQueryData<TaskResponse>(taskKeys.detail(canonicalTask.id));
  queryClient.setQueryData<TaskResponse>(
    taskKeys.detail(canonicalTask.id),
    mergeTaskSnapshot(currentDetail, canonicalTask),
  );
}

export const replaceTaskAcrossCaches = applyCanonicalTaskSnapshot;

export function removeTaskAcrossCaches(queryClient: QueryClient, taskId: string): void {
  const queries = queryClient.getQueryCache().findAll({ queryKey: taskKeys.lists() });
  for (const entry of queries) {
    const key = entry.queryKey;
    if (!isTaskListEntry(key)) continue;
    queryClient.setQueryData<TaskListCache>(key, (old) => {
      if (!old) return old;
      const occurrences = old.data.filter((task) => task.id === taskId).length;
      if (occurrences === 0) return old;
      return {
        ...old,
        data: old.data.filter((task) => task.id !== taskId),
        pagination: updatePagination(old.pagination, -occurrences),
      };
    });
  }
  queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });
}
