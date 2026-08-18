import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  disconnectSocket,
  ensureSocketConnected,
  getSocket,
  refreshSocketAuth,
  type TypedSocket,
} from "../socket";
import { registerTagEventHandlers } from "../handlers/tag-event-handlers";
import { registerAssignmentEventHandlers } from "../handlers/assignment-event-handlers";
import { registerCreateEventHandlers } from "../handlers/create-event-handlers";
import { registerStatusActionEventHandlers } from "../handlers/status-action-event-handlers";
import {
  clearJoinedBoardRooms,
  rejoinBoardRooms,
  resetBoardRooms,
} from "../rooms/board-room-registry";
import type { ServerToClientEvents } from "../contracts/realtime-events";
import { applyCanonicalTaskSnapshot } from "@/features/tasks/utils/task-cache";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";
import type { TaskApiResponse, TaskResponse } from "@/features/tasks/types";
import {
  AUTH_TOKEN_CHANGED_EVENT,
  authStorage,
} from "@/features/auth/storage/auth-storage";

const taskRoomRefcounts = new Map<string, number>();

function emitTaskJoin(socket: TypedSocket, taskId: string): void {
  socket.emit("task:join", { taskId }, (response) => {
    if (import.meta.env.DEV)
      console.debug("[realtime] task:join ack", taskId, response);
    if (!response.success && response.code === "FORBIDDEN") {
      toast.error("You do not have permission to view this task.");
    }
  });
}

function updateTaskFieldsAcrossCaches(
  queryClient: QueryClient,
  taskId: string,
  patch: Partial<TaskResponse>,
): void {
  queryClient.setQueriesData<TaskApiResponse | undefined>(
    { queryKey: taskKeys.lists() },
    (old) => {
      if (!old) return old;
      let changed = false;
      const data = old.data.map((task) => {
        if (task.id !== taskId) return task;
        changed = true;
        return { ...task, ...patch };
      });
      return changed ? { ...old, data } : old;
    },
  );

  queryClient.setQueryData<TaskResponse | undefined>(
    taskKeys.detail(taskId),
    (old) => (old ? { ...old, ...patch } : old),
  );
}

export function joinTaskRoom(socket: TypedSocket, taskId: string): void {
  const next = (taskRoomRefcounts.get(taskId) ?? 0) + 1;
  taskRoomRefcounts.set(taskId, next);
  if (next === 1 && socket.connected) emitTaskJoin(socket, taskId);
}

export function leaveTaskRoom(socket: TypedSocket, taskId: string): void {
  const current = taskRoomRefcounts.get(taskId);
  if (!current) return;
  if (current > 1) {
    taskRoomRefcounts.set(taskId, current - 1);
    return;
  }
  taskRoomRefcounts.delete(taskId);
  if (socket.connected) socket.emit("task:leave", { taskId }, () => undefined);
}

export function rejoinTaskRooms(socket: TypedSocket): void {
  for (const [taskId, count] of taskRoomRefcounts) {
    if (count > 0) emitTaskJoin(socket, taskId);
  }
}

function taskFromPayload(payload: {
  taskId: string;
  task: TaskResponse;
}): TaskResponse {
  return { ...payload.task, tagVersion: payload.task.tagVersion ?? 0 };
}

export function registerTaskEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const applyTaskPayload = (payload: {
    taskId: string;
    task: TaskResponse;
  }): void => {
    const task = taskFromPayload(payload);
    if (task.id !== payload.taskId) return;
    applyCanonicalTaskSnapshot(queryClient, task, { source: "socket" });
  };

  const handleScheduleUpdated: ServerToClientEvents["task:schedule_updated"] = (
    payload,
  ) => applyTaskPayload(payload);
  const handleRescheduled: ServerToClientEvents["task:rescheduled"] = (
    payload,
  ) => applyTaskPayload(payload);
  const handleUnlocked: ServerToClientEvents["task:unlocked"] = (payload) => {
    applyTaskPayload(payload);
    toast.success("Task unlocked");
  };
  const handleDueSoon: ServerToClientEvents["task:due_soon"] = (payload) => {
    updateTaskFieldsAcrossCaches(queryClient, payload.taskId, {
      scheduleState: "due_soon",
      dueDate: payload.dueDate,
      reminderAt: payload.reminderAt,
    });
  };
  const handleOverdueLocked: ServerToClientEvents["task:overdue_locked"] = (
    payload,
  ) => {
    updateTaskFieldsAcrossCaches(queryClient, payload.taskId, {
      scheduleState: "overdue_locked",
      lockStatus: payload.lockStatus,
      lockedAt: payload.lockedAt,
      dueDate: payload.dueDate,
      isLocked: true,
      isOverdue: true,
    });
  };
  const handleNotification: ServerToClientEvents["notification:new"] = (
    payload,
  ) => {
    if (payload.type.startsWith("TASK_"))
      toast(payload.title, { description: payload.body });
  };

  socket.on("task:schedule_updated", handleScheduleUpdated);
  socket.on("task:rescheduled", handleRescheduled);
  socket.on("task:unlocked", handleUnlocked);
  socket.on("task:due_soon", handleDueSoon);
  socket.on("task:overdue_locked", handleOverdueLocked);
  socket.on("notification:new", handleNotification);
  return () => {
    socket.off("task:schedule_updated", handleScheduleUpdated);
    socket.off("task:rescheduled", handleRescheduled);
    socket.off("task:unlocked", handleUnlocked);
    socket.off("task:due_soon", handleDueSoon);
    socket.off("task:overdue_locked", handleOverdueLocked);
    socket.off("notification:new", handleNotification);
  };
}

export function useAutoJoinVisibleTaskRooms(): void {
  const queryClient = useQueryClient();
  const joinedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    ensureSocketConnected();
    const socket = getSocket();
    const reconcile = (): void => {
      const visibleTaskIds = new Set<string>();
      for (const entry of queryClient
        .getQueryCache()
        .findAll({ queryKey: taskKeys.lists() })) {
        const data = entry.state.data as TaskApiResponse | undefined;
        for (const task of data?.data ?? []) visibleTaskIds.add(task.id);
      }
      for (const taskId of visibleTaskIds) {
        if (!joinedRef.current.has(taskId)) joinTaskRoom(socket, taskId);
      }
      for (const taskId of joinedRef.current) {
        if (!visibleTaskIds.has(taskId)) leaveTaskRoom(socket, taskId);
      }
      joinedRef.current = visibleTaskIds;
    };

    reconcile();
    const listsPrefix = taskKeys.lists();
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const key = event.query?.queryKey;
      if (!key || key.length < listsPrefix.length) return;
      if (listsPrefix.every((segment, index) => key[index] === segment))
        reconcile();
    });

    return () => {
      unsubscribe();
      for (const taskId of joinedRef.current) leaveTaskRoom(socket, taskId);
      joinedRef.current = new Set();
    };
  }, [queryClient]);
}

export function useGlobalRealtime(): void {
  const queryClient = useQueryClient();
  const hasTokenRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const socket = getSocket();
    const unregisterTaskHandlers = registerTaskEventHandlers(
      socket,
      queryClient,
    );
    const unregisterTagHandlers = registerTagEventHandlers(socket, queryClient);
    const unregisterAssignmentHandlers = registerAssignmentEventHandlers(
      socket,
      queryClient,
    );
    const unregisterCreateHandlers = registerCreateEventHandlers(
      socket,
      queryClient,
    );
    const unregisterStatusActionHandlers = registerStatusActionEventHandlers(
      socket,
      queryClient,
    );
    const onConnect = (): void => {
      rejoinTaskRooms(socket);
      rejoinBoardRooms(socket);
    };
    const onDisconnect = (): void => clearJoinedBoardRooms();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const tick = (): void => {
      const hasToken = Boolean(authStorage.getValidToken());
      if (hasToken && !hasTokenRef.current) {
        refreshSocketAuth();
        ensureSocketConnected();
        hasTokenRef.current = true;
      } else if (!hasToken && hasTokenRef.current) {
        disconnectSocket();
        resetBoardRooms();
        hasTokenRef.current = false;
      } else if (hasToken && !socket.connected) {
        refreshSocketAuth();
        ensureSocketConnected();
      }
    };

    tick();
    const interval = window.setInterval(tick, 30_000);
    window.addEventListener("storage", tick);
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", tick);
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, tick);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      unregisterTaskHandlers();
      unregisterTagHandlers();
      unregisterAssignmentHandlers();
      unregisterCreateHandlers();
      unregisterStatusActionHandlers();
    };
  }, [queryClient]);
}

export function useTaskSocket(taskId: string | null): void {
  const joinedTaskIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!taskId) return;
    ensureSocketConnected();
    const socket = getSocket();
    joinedTaskIdRef.current = taskId;
    joinTaskRoom(socket, taskId);
    return () => {
      if (joinedTaskIdRef.current)
        leaveTaskRoom(socket, joinedTaskIdRef.current);
      joinedTaskIdRef.current = null;
    };
  }, [taskId]);
}
