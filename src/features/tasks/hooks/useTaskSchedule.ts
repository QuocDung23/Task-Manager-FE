import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import {
  removeTaskAcrossCaches,
  applyCanonicalTaskSnapshot,
} from "../utils/task-cache";
import type { ApiError } from "@/lib/api-error";
import type {
  ClearTaskScheduleRequest,
  SetTaskScheduleRequest,
  UnlockTaskRequest,
} from "../types";

function getErrorMessage(error: ApiError, fallback: string): string {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

export type ScheduleIntent = "set" | "reschedule";

export type SetScheduleVariables = {
  taskId: string;
  intent: ScheduleIntent;
  data: SetTaskScheduleRequest;
};

export function useSetTaskSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, intent, data }: SetScheduleVariables) =>
      intent === "reschedule"
        ? taskApi.reschedule(taskId, data)
        : taskApi.setSchedule(taskId, data),
    onSuccess: (response, variables) => {
      applyCanonicalTaskSnapshot(queryClient, response.data, { source: "http" });
      toast.success(
        variables.intent === "reschedule"
          ? "Task rescheduled"
          : "Schedule set",
      );
    },
    onError: (error: ApiError, variables) => {
      const status = error.response?.status;
      if (status === 400) {
        toast.error(
          getErrorMessage(
            error,
            variables.intent === "reschedule"
              ? "Could not reschedule the task."
              : "Could not set the schedule.",
          ),
        );
        return;
      }
      if (status === 403) {
        toast.error("You don't have permission to change the schedule.");
        return;
      }
      if (status === 404) {
        toast.error("Task no longer exists.");
        removeTaskAcrossCaches(queryClient, variables.taskId);
        return;
      }
      toast.error(
        getErrorMessage(
          error,
          variables.intent === "reschedule"
            ? "Could not reschedule the task."
            : "Could not set the schedule.",
        ),
      );
    },
  });
}

export type ClearScheduleVariables = {
  taskId: string;
  data?: ClearTaskScheduleRequest;
};

export function useClearTaskSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: ClearScheduleVariables) =>
      taskApi.clearSchedule(taskId, data),
    onSuccess: (response) => {
      applyCanonicalTaskSnapshot(queryClient, response.data, { source: "http" });
      toast.success("Schedule cleared");
    },
    onError: (error: ApiError, variables) => {
      const status = error.response?.status;
      if (status === 400) {
        toast.error(getErrorMessage(error, "Could not clear the schedule."));
        return;
      }
      if (status === 403) {
        toast.error("You don't have permission to clear the schedule.");
        return;
      }
      if (status === 404) {
        toast.error("Task no longer exists.");
        removeTaskAcrossCaches(queryClient, variables.taskId);
        return;
      }
      toast.error(getErrorMessage(error, "Could not clear the schedule."));
    },
  });
}

export type UnlockVariables = {
  taskId: string;
  data: UnlockTaskRequest;
};

export function useUnlockTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: UnlockVariables) =>
      taskApi.unlock(taskId, data),
    onSuccess: (response) => {
      applyCanonicalTaskSnapshot(queryClient, response.data, { source: "http" });
      toast.success("Task unlocked");
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, "Could not unlock the task."));
    },
  });
}
