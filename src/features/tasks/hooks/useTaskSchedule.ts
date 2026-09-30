import { t } from "@/services/i18n";
import { getApiErrorMessage } from "@/lib/error-message";
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
  return getApiErrorMessage(error, fallback);
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
          ? t("toast.taskRescheduled")
          : t("toast.scheduleSet"),
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
        toast.error(t("toast.scheduleForbidden"));
        return;
      }
      if (status === 404) {
        toast.error(t("toast.taskMissing"));
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
      toast.success(t("toast.scheduleCleared"));
    },
    onError: (error: ApiError, variables) => {
      const status = error.response?.status;
      if (status === 400) {
        toast.error(getErrorMessage(error, "Could not clear the schedule."));
        return;
      }
      if (status === 403) {
        toast.error(t("toast.clearScheduleForbidden"));
        return;
      }
      if (status === 404) {
        toast.error(t("toast.taskMissing"));
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
      toast.success(t("toast.taskUnlocked"));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, "Could not unlock the task."));
    },
  });
}
