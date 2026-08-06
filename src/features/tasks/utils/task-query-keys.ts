import type { TaskListFilters } from "../types";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (listId: string, filters?: TaskListFilters) =>
    [...taskKeys.lists(), listId, filters ?? {}] as const,
  detail: (taskId: string) => [...taskKeys.all, "detail", taskId] as const,
};

export function filtersAreEqual(
  left: TaskListFilters | undefined,
  right: TaskListFilters | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.scheduleState === right.scheduleState &&
    left.lockStatus === right.lockStatus &&
    left.dueBefore === right.dueBefore &&
    left.dueAfter === right.dueAfter
  );
}

export function cleanFilters(filters?: TaskListFilters): TaskListFilters | undefined {
  if (!filters) return undefined;
  const result: TaskListFilters = {};
  if (filters.scheduleState) result.scheduleState = filters.scheduleState;
  if (filters.lockStatus) result.lockStatus = filters.lockStatus;
  if (filters.dueBefore) result.dueBefore = filters.dueBefore;
  if (filters.dueAfter) result.dueAfter = filters.dueAfter;
  return Object.keys(result).length === 0 ? undefined : result;
}