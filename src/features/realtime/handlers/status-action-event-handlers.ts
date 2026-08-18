import type { QueryClient } from "@tanstack/react-query";
import type { TaskResponse, TaskStatusAction } from "@/features/tasks/types";
import { TASK_STATUS_ACTION_VALUES } from "@/features/tasks/utils/status-action";
import { applyCanonicalTaskSnapshot } from "@/features/tasks/utils/task-cache";
import { rememberEvent } from "../utils/event-dedupe";
import type {
  ServerToClientEvents,
  TaskStatusActionUpdatedPayload,
} from "../contracts/realtime-events";
import type { TypedSocket } from "../socket";

function isKnownStatusAction(value: unknown): value is TaskStatusAction {
  return (
    typeof value === "string" &&
    (TASK_STATUS_ACTION_VALUES as readonly string[]).includes(value)
  );
}

function isTask(value: unknown): value is TaskResponse {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<TaskResponse>;
  return (
    typeof task.id === "string" &&
    typeof task.listId === "string" &&
    typeof task.tagVersion === "number" &&
    typeof task.assignmentVersion === "number" &&
    Array.isArray(task.tags) &&
    Array.isArray(task.assign)
  );
}

function isValidPayload(
  value: unknown,
): value is TaskStatusActionUpdatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<TaskStatusActionUpdatedPayload>;
  const data = payload.data;

  if (typeof payload.eventId !== "string") return false;
  if (typeof data?.boardId !== "string") return false;
  if (typeof data?.taskId !== "string") return false;
  if (!isTask(data?.task)) return false;
  if (data.task.id !== data.taskId) return false;
  if (!isKnownStatusAction(data.statusAction)) return false;
  if (data.statusAction !== data.task.statusAction) return false;

  return true;
}

export function applyTaskStatusActionUpdated(
  queryClient: QueryClient,
  payload: TaskStatusActionUpdatedPayload,
): void {
  if (!isValidPayload(payload) || !rememberEvent(payload.eventId)) return;

  if (import.meta.env.DEV) {
    console.debug("[realtime] task:status_action_updated", {
      eventId: payload.eventId,
      taskId: payload.data.taskId,
      actorId: payload.actorId,
      statusAction: payload.data.statusAction,
    });
  }

  applyCanonicalTaskSnapshot(queryClient, payload.data.task, {
    source: "socket",
  });
}

export function registerStatusActionEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleStatusActionUpdated: ServerToClientEvents["task:status_action_updated"] =
    (payload) => {
      applyTaskStatusActionUpdated(queryClient, payload);
    };

  socket.on("task:status_action_updated", handleStatusActionUpdated);
  return () => {
    socket.off("task:status_action_updated", handleStatusActionUpdated);
  };
}
