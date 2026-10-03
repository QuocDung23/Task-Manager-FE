import type { QueryClient } from "@tanstack/react-query";
import type { TypedSocket } from "../socket";
import type {
  TaskCreatedPayload,
  ListCreatedPayload,
  ServerToClientEvents,
} from "../contracts/realtime-events";
import { applyCanonicalTaskSnapshot } from "@/features/tasks/utils/task-cache";
import { applyCreatedList } from "@/features/lists/utils/list-cache";
import { rememberEvent } from "../utils/event-dedupe";
import type { TaskResponse } from "@/features/tasks/types";

function isValidTaskPayload(
  payload: TaskCreatedPayload,
): payload is TaskCreatedPayload {
  if (!payload.data?.boardId || !payload.data?.listId || !payload.data?.task?.id) {
    if (import.meta.env.DEV) {
      console.warn("[realtime] Invalid task:created payload", payload);
    }
    return false;
  }
  const task: TaskResponse = payload.data.task;
  if (!task.listId || task.listId !== payload.data.listId) {
    if (import.meta.env.DEV) {
      console.warn("[realtime] task.listId mismatch in payload", {
        expected: payload.data.listId,
        actual: task.listId,
      });
    }
    return false;
  }
  return true;
}

function isValidListPayload(
  payload: ListCreatedPayload,
): payload is ListCreatedPayload {
  if (!payload.data?.boardId || !payload.data?.list?.id) {
    if (import.meta.env.DEV) {
      console.warn("[realtime] Invalid list:created payload", payload);
    }
    return false;
  }
  if (payload.data.list.boardId !== payload.data.boardId) {
    if (import.meta.env.DEV) {
      console.warn("[realtime] list.boardId mismatch in payload", {
        expected: payload.data.boardId,
        actual: payload.data.list.boardId,
      });
    }
    return false;
  }
  return true;
}

export function registerCreateEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleTaskCreated: ServerToClientEvents["task:created"] = (payload) => {
    if (!isValidTaskPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;

    const task: TaskResponse = {
      ...payload.data.task,
      tagVersion: payload.data.task.tagVersion ?? 0,
      assignmentVersion: payload.data.task.assignmentVersion ?? 0,
    };
    applyCanonicalTaskSnapshot(queryClient, task, { source: "socket" });
  };

  const handleListCreated: ServerToClientEvents["list:created"] = (payload) => {
    if (!isValidListPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;

    applyCreatedList(queryClient, payload.data.list);
  };

  socket.on("task:created", handleTaskCreated);
  socket.on("list:created", handleListCreated);

  return () => {
    socket.off("task:created", handleTaskCreated);
    socket.off("list:created", handleListCreated);
  };
}
