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
  if (filters.scheduleState && task.scheduleState !== filters.scheduleState) {
    return false;
  }
  if (filters.lockStatus && task.lockStatus !== filters.lockStatus) {
    return false;
  }
  if (filters.dueBefore && (!task.dueDate || task.dueDate > filters.dueBefore)) {
    return false;
  }
  if (filters.dueAfter && (!task.dueDate || task.dueDate < filters.dueAfter)) {
    return false;
  }
  return true;
}

function replaceTaskInList(
  old: TaskListCache,
  task: TaskResponse,
  filters: TaskListFilters | undefined,
): TaskListCache {
  if (!old) return old;
  const data = old.data;
  const index = data.findIndex((item) => item.id === task.id);

  if (index < 0) {
    if (!matchesFilters(filters, task)) return old;
    return { ...old, data: [...data, task] };
  }

  if (!matchesFilters(filters, task)) {
    const next = [...data];
    next.splice(index, 1);
    return { ...old, data: next };
  }

  const next = [...data];
  next[index] = task;
  return { ...old, data: next };
}

function isTaskListEntry(key: readonly unknown[]): boolean {
  if (key.length < 2) return false;
  if (key[0] !== taskKeys.all[0]) return false;
  if (key[1] !== "list") return false;
  return true;
}

function extractFilters(key: readonly unknown[]): TaskListFilters | undefined {
  const filtersIndex = key.length - 1;
  const candidate = key[filtersIndex];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return undefined;
  }
  return candidate as TaskListFilters;
}

export function replaceTaskAcrossCaches(
  queryClient: QueryClient,
  task: TaskResponse,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: taskKeys.lists() });

  for (const entry of queries) {
    const key = entry.queryKey;
    if (!isTaskListEntry(key)) continue;
    const listId = key[2];
    if (typeof listId !== "string" || listId !== task.listId) continue;
    const filters = extractFilters(key);
    queryClient.setQueryData<TaskListCache>(key, (old) =>
      replaceTaskInList(old, task, filters),
    );
  }

  // Always overwrite the detail cache with the freshly returned task. Using
  // an "old ?? task" updater would short-circuit subsequent mutations and
  // leave stale data in the detail cache, which in turn starves any
  // consumer (e.g. `TaskDetailContent`) that syncs from it.
  queryClient.setQueryData<TaskResponse>(taskKeys.detail(task.id), task);
}

export function removeTaskAcrossCaches(queryClient: QueryClient, taskId: string): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: taskKeys.lists() });

  for (const entry of queries) {
    const key = entry.queryKey;
    if (!isTaskListEntry(key)) continue;
    queryClient.setQueryData<TaskListCache>(key, (old) => {
      if (!old) return old;
      const index = old.data.findIndex((item) => item.id === taskId);
      if (index < 0) return old;
      const next = [...old.data];
      next.splice(index, 1);
      return { ...old, data: next };
    });
  }

  queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });
}