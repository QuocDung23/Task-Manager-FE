import type { QueryClient } from "@tanstack/react-query";
import type { TaskResponse } from "@/features/tasks/types";
import { applyCanonicalTaskSnapshot } from "@/features/tasks/utils/task-cache";
import { rememberEvent } from "../utils/event-dedupe";
import type {
  ServerToClientEvents,
  TaskAssignmentsUpdatedPayload,
} from "../contracts/realtime-events";
import type { TypedSocket } from "../socket";

function isValidPayload(value: unknown): value is TaskAssignmentsUpdatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<TaskAssignmentsUpdatedPayload>;
  const data = payload.data;

  if (typeof payload.eventId !== "string") return false;
  if (typeof data?.boardId !== "string") return false;
  if (typeof data?.taskId !== "string") return false;
  if (!isTask(data?.task)) return false;
  if (data.task.id !== data.taskId) return false;
  if (!Array.isArray(data.task.assign)) return false;
  if (typeof data.task.assignmentVersion !== "number") return false;

  return true;
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

export function applyTaskAssignmentsUpdated(
  queryClient: QueryClient,
  payload: TaskAssignmentsUpdatedPayload,
): void {
  if (!isValidPayload(payload) || !rememberEvent(payload.eventId)) return;

  if (import.meta.env.DEV) {
    console.debug("[realtime] task:assignments_updated", {
      eventId: payload.eventId,
      taskId: payload.data.taskId,
      actorId: payload.actorId,
      assign: payload.data.task.assign,
      assignmentVersion: payload.data.task.assignmentVersion,
    });
  }

  applyCanonicalTaskSnapshot(queryClient, payload.data.task, {
    source: "socket",
  });
}

export function registerAssignmentEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleTaskAssignmentsUpdated: ServerToClientEvents["task:assignments_updated"] = (
    payload: TaskAssignmentsUpdatedPayload,
  ) => {
    applyTaskAssignmentsUpdated(queryClient, payload);
  };

  socket.on("task:assignments_updated", handleTaskAssignmentsUpdated);
  return () => {
    socket.off("task:assignments_updated", handleTaskAssignmentsUpdated);
  };
}
