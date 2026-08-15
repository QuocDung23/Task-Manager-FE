import type { TaskListFilters } from "../types";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (listId: string, filters?: TaskListFilters) =>
    [...taskKeys.lists(), listId, cleanFilters(filters) ?? {}] as const,
  detail: (taskId: string) => [...taskKeys.all, "detail", taskId] as const,
};

export function filtersAreEqual(
  left: TaskListFilters | undefined,
  right: TaskListFilters | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;

  if (left.scheduleState !== right.scheduleState) return false;
  if (left.lockStatus !== right.lockStatus) return false;
  if (left.dueBefore !== right.dueBefore) return false;
  if (left.dueAfter !== right.dueAfter) return false;

  const leftTagIds = left.tagIds ? [...left.tagIds].sort() : undefined;
  const rightTagIds = right.tagIds ? [...right.tagIds].sort() : undefined;
  if (leftTagIds?.join(",") !== rightTagIds?.join(",")) return false;

  if (left.tagMode !== right.tagMode) return false;

  return true;
}

export function cleanFilters(filters?: TaskListFilters): TaskListFilters | undefined {
  if (!filters) return undefined;
  const result: TaskListFilters = {};
  if (filters.scheduleState) result.scheduleState = filters.scheduleState;
  if (filters.lockStatus) result.lockStatus = filters.lockStatus;
  if (filters.dueBefore) result.dueBefore = filters.dueBefore;
  if (filters.dueAfter) result.dueAfter = filters.dueAfter;
  if (filters.tagIds && filters.tagIds.length > 0) {
    result.tagIds = [...new Set(filters.tagIds)];
    if (filters.tagMode) result.tagMode = filters.tagMode;
  }
  return Object.keys(result).length === 0 ? undefined : result;
}