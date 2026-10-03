import type { QueryClient } from "@tanstack/react-query";
import type {
  BoardTasksReorderedPayload,
  ServerToClientEvents,
} from "../contracts/realtime-events";
import {
  applyCanonicalListTaskSnapshot,
  applyCanonicalTaskSnapshot,
} from "@/features/tasks/utils/task-cache";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";
import { rememberEvent } from "../utils/event-dedupe";
import { tryAdvanceBoardRevision } from "../utils/board-revision";
import type { TaskResponse } from "@/features/tasks/types";
import type { TypedSocket } from "../socket";

function isTask(value: unknown): value is TaskResponse {
  if (!value || typeof value !== "object") return false;
  const t = value as Partial<TaskResponse>;
  return (
    typeof t.id === "string" &&
    typeof t.listId === "string" &&
    typeof t.orderTask === "number" &&
    Array.isArray(t.tags) &&
    Array.isArray(t.assign)
  );
}

function isPayload(value: unknown): value is BoardTasksReorderedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BoardTasksReorderedPayload>;
  const data = payload.data;
  if (typeof payload.eventId !== "string") return false;
  if (typeof data?.boardId !== "string") return false;
  if (typeof data?.orderVersion !== "number") return false;
  if (typeof data?.taskId !== "string") return false;
  if (typeof data?.sourceListId !== "string") return false;
  if (typeof data?.targetListId !== "string") return false;
  if (!isTask(data?.movedTask)) return false;
  if (data.movedTask.id !== data.taskId) return false;
  if (data.movedTask.listId !== data.targetListId) return false;
  if (!Array.isArray(data?.sourceTasks)) return false;
  if (!Array.isArray(data?.targetTasks)) return false;
  for (const task of data.sourceTasks) {
    if (!isTask(task) || task.listId !== data.sourceListId) return false;
  }
  for (const task of data.targetTasks) {
    if (!isTask(task) || task.listId !== data.targetListId) return false;
  }
  return true;
}

function applySourceAndTargetSnapshots(
  queryClient: QueryClient,
  data: BoardTasksReorderedPayload["data"],
  options: { fallbackInvalidate?: boolean },
): void {
  const isSameList = data.sourceListId === data.targetListId;

  if (!isSameList) {
    const sourceResult = applyCanonicalListTaskSnapshot(
      queryClient,
      data.sourceListId,
      data.sourceTasks,
      options,
    );
    if (sourceResult === "invalidated") {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.list(data.sourceListId),
      });
    }
  }

  const targetResult = applyCanonicalListTaskSnapshot(
    queryClient,
    data.targetListId,
    data.targetTasks,
    options,
  );
  if (targetResult === "invalidated") {
    void queryClient.invalidateQueries({
      queryKey: taskKeys.list(data.targetListId),
    });
  }
}

export function applyBoardTasksReordered(
  queryClient: QueryClient,
  payload: BoardTasksReorderedPayload,
  options: { fallbackInvalidate?: boolean } = {},
): void {
  if (!isPayload(payload)) return;
  if (!rememberEvent(payload.eventId)) return;

  // Revision gate: skip stale snapshots from a delayed socket frame.
  if (!tryAdvanceBoardRevision(boardIdFrom(payload), payload.data.orderVersion)) {
    if (import.meta.env.DEV) {
      console.debug("[realtime] board:tasks_reordered stale revision", {
        boardId: payload.data.boardId,
        eventId: payload.eventId,
        taskId: payload.data.taskId,
        revision: payload.data.orderVersion,
      });
    }
    return;
  }

  applySourceAndTargetSnapshots(queryClient, payload.data, options);

  // Update task detail to keep the open detail dialog in sync with the
  // canonical moved task (listId + orderTask).
  applyCanonicalTaskSnapshot(queryClient, payload.data.movedTask, {
    source: "socket",
  });
}

function boardIdFrom(payload: BoardTasksReorderedPayload): string {
  return payload.data.boardId;
}

export function registerTaskOrderEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleTasksReordered: ServerToClientEvents["board:tasks_reordered"] = (
    payload,
  ) => {
    applyBoardTasksReordered(queryClient, payload);
  };

  socket.on("board:tasks_reordered", handleTasksReordered);
  return () => {
    socket.off("board:tasks_reordered", handleTasksReordered);
  };
}
