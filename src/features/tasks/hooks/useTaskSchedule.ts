import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { updateTaskInListCache } from "../utils/task-cache";
import type { ApiError } from "@/lib/api-error";
import type { SetTaskScheduleRequest } from "../types";

function getErrorMessage(error: ApiError, fallback: string): string {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

export function useSetTaskSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      data,
      isReschedule,
    }: {
      taskId: string;
      data: SetTaskScheduleRequest;
      isReschedule?: boolean;
    }) =>
      isReschedule
        ? taskApi.reschedule(taskId, data)
        : taskApi.setSchedule(taskId, data),
    onSuccess: (response) => {
      updateTaskInListCache(queryClient, response.data);
      toast.success("Due date updated");
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, "Could not update the due date."));
    },
  });
}

export function useClearTaskSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      taskApi.clearSchedule(taskId),
    onSuccess: (response) => {
      updateTaskInListCache(queryClient, response.data);
      toast.success("Due date cleared");
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, "Could not clear the due date."));
    },
  });
}
