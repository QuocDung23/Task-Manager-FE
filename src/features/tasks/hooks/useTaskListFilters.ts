import { useCallback, useMemo } from "react";
import type { TaskListFilters } from "../types";
import { cleanFilters, filtersAreEqual } from "../utils/task-query-keys";

export type TaskListFiltersState = TaskListFilters;

export type UseTaskListFiltersResult = {
  filters: TaskListFiltersState;
  setScheduleState: (state: TaskListFilters["scheduleState"] | undefined) => void;
  setLockStatus: (status: TaskListFilters["lockStatus"] | undefined) => void;
  setDueBefore: (value: string | undefined) => void;
  setDueAfter: (value: string | undefined) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
};

export function buildInitialFilters(input?: TaskListFilters): TaskListFiltersState {
  return cleanFilters(input) ?? {};
}

export function useTaskListFiltersState(
  initial?: TaskListFilters,
): UseTaskListFiltersResult {
  const initialRef = useMemo(() => buildInitialFilters(initial), [initial]);

  const merge = useCallback(
    (patch: Partial<TaskListFilters>): TaskListFiltersState => {
      const next: TaskListFilters = { ...initialRef, ...patch };
      return cleanFilters(next) ?? {};
    },
    [initialRef],
  );

  const setScheduleState = useCallback(
    (scheduleState: TaskListFilters["scheduleState"] | undefined) =>
      merge({ scheduleState }),
    [merge],
  );
  const setLockStatus = useCallback(
    (lockStatus: TaskListFilters["lockStatus"] | undefined) => merge({ lockStatus }),
    [merge],
  );
  const setDueBefore = useCallback(
    (dueBefore: string | undefined) => merge({ dueBefore }),
    [merge],
  );
  const setDueAfter = useCallback(
    (dueAfter: string | undefined) => merge({ dueAfter }),
    [merge],
  );
  const resetFilters = useCallback(() => initialRef, [initialRef]);

  return {
    filters: initialRef,
    setScheduleState,
    setLockStatus,
    setDueBefore,
    setDueAfter,
    resetFilters,
    hasActiveFilters: !filtersAreEqual(initialRef, {}),
  };
}