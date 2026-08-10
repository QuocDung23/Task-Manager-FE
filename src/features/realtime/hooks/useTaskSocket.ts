import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  disconnectSocket,
  ensureSocketConnected,
  getSocket,
  refreshSocketAuth,
} from "../socket";
import type {
  ClientToServerTaskEvents,
  ServerToClientTaskEvents,
} from "../socket";
import type { Socket } from "socket.io-client";
import {
  replaceTaskAcrossCaches,
} from "@/features/tasks/utils/task-cache";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";
import type { TaskApiResponse, TaskResponse } from "@/features/tasks/types";
import {
  AUTH_TOKEN_CHANGED_EVENT,
  authStorage,
} from "@/features/auth/storage/auth-storage";

type TypedSocket = Socket<ServerToClientTaskEvents, ClientToServerTaskEvents>;

// Module-level refcount for task rooms so multiple consumers (the board
// auto-join hook + the dialog `useTaskSocket`) can independently request
// joins without dropping the room on remount or spamming duplicate emits.
// When a task room's refcount drops to zero the leave event is sent and
// the room forgotten.
const roomRefcounts = new Map<string, number>();

function emitTaskJoin(socket: TypedSocket, taskId: string): void {
  if (import.meta.env.DEV) {
    console.debug("[realtime] task:join →", taskId);
  }
  socket.emit("task:join", { taskId }, (response) => {
    if (import.meta.env.DEV) {
      console.debug("[realtime] task:join ack", taskId, response);
    }
    if (response && response.success === false) {
      roomRefcounts.delete(taskId);
      toast.error(response.error ?? "Could not subscribe to live updates.");
    }
  });
}

function bump(socket: TypedSocket, taskId: string): void {
  const next = (roomRefcounts.get(taskId) ?? 0) + 1;
  roomRefcounts.set(taskId, next);
  if (next === 1 && socket.connected) {
    emitTaskJoin(socket, taskId);
  }
}

function drop(socket: TypedSocket, taskId: string): void {
  const current = roomRefcounts.get(taskId);
  if (!current) return;
  const next = current - 1;
  if (next <= 0) {
    roomRefcounts.delete(taskId);
    if (import.meta.env.DEV) {
      console.debug("[realtime] task:leave →", taskId);
    }
    if (socket.connected) {
      socket.emit("task:leave", { taskId }, () => undefined);
    }
  } else {
    roomRefcounts.set(taskId, next);
  }
}

export function joinTaskRoom(socket: TypedSocket, taskId: string): void {
  bump(socket, taskId);
}

export function leaveTaskRoom(socket: TypedSocket, taskId: string): void {
  drop(socket, taskId);
}

/** Rejoin active task rooms after Socket.IO creates a new connection. */
export function rejoinTaskRooms(socket: TypedSocket): void {
  for (const [taskId, count] of roomRefcounts) {
    if (count > 0) emitTaskJoin(socket, taskId);
  }
}

function getTaskFromPayload(payload: unknown): TaskResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const task = (payload as { task?: unknown }).task;
  if (!task || typeof task !== "object") return null;
  const candidate = task as Partial<TaskResponse>;
  if (typeof candidate.id !== "string" || typeof candidate.listId !== "string") {
    return null;
  }
  return task as TaskResponse;
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

  const detail = queryClient.getQueryData<TaskResponse>(taskKeys.detail(taskId));
  if (detail) {
    queryClient.setQueryData<TaskResponse>(taskKeys.detail(taskId), {
      ...detail,
      ...patch,
    });
  }
}

/**
 * Register the task events once for the app. Joining a room without these
 * listeners means Socket.IO receives the event but React Query never changes,
 * which is why a board-only tab appeared stale after another tab scheduled a
 * task.
 */
export function registerTaskEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const applyTaskPayload = (event: string, payload: unknown) => {
    const task = getTaskFromPayload(payload);
    if (!task) {
      if (import.meta.env.DEV) {
        console.debug("[realtime] ignored invalid task payload", event, payload);
      }
      return;
    }
    if (import.meta.env.DEV) {
      console.debug("[realtime] task payload received", event, task.id);
    }
    replaceTaskAcrossCaches(queryClient, task);
  };

  const handleScheduleUpdated: ServerToClientTaskEvents["task:schedule_updated"] =
    (payload) => applyTaskPayload("task:schedule_updated", payload);
  const handleRescheduled: ServerToClientTaskEvents["task:rescheduled"] =
    (payload) => applyTaskPayload("task:rescheduled", payload);
  const handleUnlocked: ServerToClientTaskEvents["task:unlocked"] = (payload) => {
    applyTaskPayload("task:unlocked", payload);
    toast.success("Task unlocked");
  };
  const handleDueSoon: ServerToClientTaskEvents["task:due_soon"] = (payload) => {
    if (import.meta.env.DEV) {
      console.debug("[realtime] task:due_soon", payload.taskId);
    }
    updateTaskFieldsAcrossCaches(queryClient, payload.taskId, {
      scheduleState: "due_soon",
      dueDate: payload.dueDate,
      reminderAt: payload.reminderAt ?? null,
    });
  };
  const handleOverdueLocked: ServerToClientTaskEvents["task:overdue_locked"] = (
    payload,
  ) => {
    if (import.meta.env.DEV) {
      console.debug("[realtime] task:overdue_locked", payload.taskId);
    }
    updateTaskFieldsAcrossCaches(queryClient, payload.taskId, {
      scheduleState: "overdue_locked",
      lockStatus: payload.lockStatus,
      lockedAt: payload.lockedAt,
      dueDate: payload.dueDate,
      isLocked: true,
      isOverdue: true,
    });
  };
  const handleNotification: ServerToClientTaskEvents["notification:new"] = (
    payload,
  ) => {
    if (payload.type.startsWith("TASK_")) {
      toast(payload.title, { description: payload.body });
    }
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

/**
 * Joins the realtime room for every task id currently present in the
 * TanStack Query cache (i.e. tasks rendered on the visible board). Use
 * once per board mount so cross-tab realtime works even when no task
 * detail dialog is open. Cleanup is automatic: when the component unmounts
 * the local refcount drops to zero and the rooms are left.
 */
export function useAutoJoinVisibleTaskRooms(): void {
  const queryClient = useQueryClient();
  const joinedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    ensureSocketConnected();
    const socket = getSocket();

    const reconcile = () => {
      const tasks: TaskResponse[] = [];
      for (const entry of queryClient.getQueryCache().findAll({
        queryKey: taskKeys.lists(),
      })) {
        const data = entry.state.data as { data?: TaskResponse[] } | undefined;
        if (data?.data?.length) {
          tasks.push(...data.data);
        }
      }
      const next = new Set(tasks.map((task) => task.id));
      // Join newly appeared tasks.
      for (const id of next) {
        if (!joinedRef.current.has(id)) {
          joinTaskRoom(socket, id);
        }
      }
      // Leave tasks that disappeared from the cache.
      for (const id of joinedRef.current) {
        if (!next.has(id)) {
          leaveTaskRoom(socket, id);
        }
      }
      joinedRef.current = next;
    };

    reconcile();

    // Re-run on every list-query update so newly arrived tasks (via HTTP or
    // realtime) automatically join their rooms without explicit consumer code.
    const listsPrefix = taskKeys.lists();
    const unsubscribeQueryCache = queryClient.getQueryCache().subscribe(
      (event) => {
        if (!event?.query) return;
        const key = event.query.queryKey;
        // Match queries that start with the lists prefix, e.g.
        // ["tasks","list",listId,filters].
        const matches = key.length >= listsPrefix.length &&
          listsPrefix.every((seg, idx) => key[idx] === seg);
        if (matches) reconcile();
      },
    );

    return () => {
      unsubscribeQueryCache();
      // Release refcounted rooms when the board unmounts. The refcount in
      // `joinTaskRoom` / `leaveTaskRoom` keeps rooms joined if any other
      // hook (e.g. `useTaskSocket`) still references them.
      for (const id of joinedRef.current) {
        leaveTaskRoom(socket, id);
      }
      joinedRef.current = new Set();
    };
  }, [queryClient]);
}

/**
 * Connects the singleton socket as soon as a valid token exists.
 * Mount this once near the application root so realtime is available
 * even when no task detail dialog is open (board view, notifications,
 * due_soon/overdue_locked broadcasts, etc.).
 *
 * The socket lazily rebuilds itself whenever auth is refreshed (see
 * `refreshSocketAuth` in `socket.ts`); this hook is just responsible for
 * the initial `connect()` and a graceful `disconnect()` on logout / token
 * loss.
 */
export function useGlobalRealtime(): void {
  const queryClient = useQueryClient();
  const hasTokenRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const socket = getSocket();
    const unregisterTaskHandlers = registerTaskEventHandlers(socket, queryClient);
    const onConnect = () => rejoinTaskRooms(socket);
    socket.on("connect", onConnect);

    const tick = () => {
      const token = authStorage.getValidToken();
      const hasToken = Boolean(token);
      if (hasToken && !hasTokenRef.current) {
        refreshSocketAuth();
        ensureSocketConnected();
        hasTokenRef.current = true;
      } else if (!hasToken && hasTokenRef.current) {
        disconnectSocket();
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
      unregisterTaskHandlers();
    };
  }, [queryClient]);
}

export function useTaskSocket(taskId: string | null): void {
  const joinedTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    ensureSocketConnected();
    const socket = getSocket();

    // Record the subscription before the connection finishes. The global
    // connect handler will join every task with a positive refcount.
    joinedTaskIdRef.current = taskId;
    joinTaskRoom(socket, taskId);

    return () => {
      if (joinedTaskIdRef.current) {
        leaveTaskRoom(socket, joinedTaskIdRef.current);
        joinedTaskIdRef.current = null;
      }
    };
  }, [taskId]);
}
