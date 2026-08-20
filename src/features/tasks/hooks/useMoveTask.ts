import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskApi } from "../api/task-api";
import { taskKeys } from "../utils/task-query-keys";
import type {
  ApiResponse,
  MoveTaskResponse,
  TaskApiResponse,
  TaskResponse,
} from "../types";
import { applyCanonicalTaskSnapshot } from "../utils/task-cache";

export type MoveTaskVariables = {
  taskId: string;
  sourceListId: string;
  targetListId: string;
  orderedTaskIds: string[];
};

type MoveTaskError = Error & {
  response?: { status?: number; data?: { message?: string } };
};

export const useMoveTask = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<MoveTaskResponse>,
    MoveTaskError,
    MoveTaskVariables
  >({
    mutationFn: ({ taskId, ...data }) => taskApi.move(taskId, data),
    onSuccess: (response, variables) => {
      const { sourceListId, targetListId } = variables;
      const data = response?.data;
      if (!data) {
        // Phòng trường hợp response malformed; invalidate để refetch.
        invalidateBothLists(queryClient, sourceListId, targetListId);
        return;
      }

      const moved = data.movedTask;
      const isSameList = sourceListId === targetListId;

      if (!isSameList) {
        replaceListTasks(queryClient, sourceListId, data.sourceTasks);
      }
      replaceListTasks(queryClient, targetListId, data.targetTasks);

      // Update task detail snapshot (chứa listId/orderTask canonical mới).
      applyCanonicalTaskSnapshot(queryClient, moved as TaskResponse, {
        source: "http",
      });
    },
    onError: (error, variables) => {
      const status = error.response?.status;
      // 400/403/404: invalidate related list queries để refetch canonical state.
      if (status === 400 || status === 403 || status === 404) {
        invalidateBothLists(
          queryClient,
          variables.sourceListId,
          variables.targetListId,
        );
      }
      toast.error(
        error.response?.data?.message ||
          "Failed to move task. Please try again.",
      );
    },
  });
};

function replaceListTasks(
  queryClient: ReturnType<typeof useQueryClient>,
  listId: string,
  tasks: TaskResponse[],
): void {
  // Lưu canonical vào query key mặc định (no filter) để BoardDndProvider
  // đọc được ngay. Với các query có filter, để handler realtime hoặc
  // invalidate tự xử lý để tránh sai lệch filter.
  queryClient.setQueryData<TaskApiResponse>(taskKeys.list(listId), (old) => {
    if (!old) return old;
    const sorted = [...tasks].sort(
      (left, right) => left.orderTask - right.orderTask,
    );
    return { ...old, data: sorted };
  });
  void queryClient.invalidateQueries({
    queryKey: taskKeys.list(listId),
    refetchType: "none",
  });
}

function invalidateBothLists(
  queryClient: ReturnType<typeof useQueryClient>,
  sourceListId: string,
  targetListId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: taskKeys.list(sourceListId) });
  if (sourceListId !== targetListId) {
    void queryClient.invalidateQueries({ queryKey: taskKeys.list(targetListId) });
  }
}