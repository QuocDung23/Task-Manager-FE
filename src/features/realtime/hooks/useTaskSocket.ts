import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ensureSocketConnected, getSocket } from "../socket";
import type {
  ClientToServerTaskEvents,
  ServerToClientTaskEvents,
} from "../socket";
import type { Socket } from "socket.io-client";
import {
  replaceTaskAcrossCaches,
} from "@/features/tasks/utils/task-cache";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";
import type { TaskResponse } from "@/features/tasks/types";
import { useTaskDetail } from "@/components/tasks/use-task-detail";
import { authStorage } from "@/features/auth/storage/auth-storage";

type TypedSocket = Socket<ServerToClientTaskEvents, ClientToServerTaskEvents>;

// Module-level refcount for task rooms so multiple consumers (the board
// auto-join hook + the dialog `useTaskSocket`) can independently request
// joins without dropping the room on remount or spamming duplicate emits.
// When a task room's refcount drops to zero the leave event is sent and
// the room forgotten.
const roomRefcounts = new Map<string, number>();

function bump(socket: TypedSocket, taskId: string): void {
  const next = (roomRefcounts.get(taskId) ?? 0) + 1;
  roomRefcounts.set(taskId, next);
  if (next === 1) {
    if (import.meta.env.DEV) {
      console.debug("[realtime] task:join →", taskId);
    }
    socket.emit("task:join", { taskId }, (response) => {
      if (import.meta.env.DEV) {
        console.debug("[realtime] task:join ack", taskId, response);
      }
      if (response && response.success === false) {
        roomRefcounts.set(taskId, 0);
        toast.error(response.error ?? "Could not subscribe to live updates.");
      }
    });
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
    socket.emit("task:leave", { taskId }, () => undefined);
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

function applyTaskPayload(
  queryClient: ReturnType<typeof useQueryClient>,
  task: TaskResponse,
): void {
  replaceTaskAcrossCaches(queryClient, task);
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
  const hasTokenRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tick = () => {
      const hasToken = authStorage.hasValidToken();
      if (hasToken && !hasTokenRef.current) {
        ensureSocketConnected();
        hasTokenRef.current = true;
      } else if (!hasToken && hasTokenRef.current) {
        // Token expired or user logged out. The socket instance will
        // detach naturally on the next `connect_error`; we only need to
        // forget we ever had one so a future login reconnects.
        hasTokenRef.current = false;
      }
    };

    tick();
    const interval = window.setInterval(tick, 30_000);
    window.addEventListener("storage", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", tick);
    };
  }, []);
}

export function useTaskSocket(taskId: string | null): void {
  const queryClient = useQueryClient();
  const { updateSelectedTask, selectedTask } = useTaskDetail();
  const selectedTaskRef = useRef<TaskResponse | null>(selectedTask);
  const updateSelectedTaskRef = useRef(updateSelectedTask);
  const joinedTaskIdRef = useRef<string | null>(null);

  // Keep refs in sync so event handlers see the latest task without
  // tearing down the socket subscription on every prop change.
  useEffect(() => {
    selectedTaskRef.current = selectedTask;
    updateSelectedTaskRef.current = updateSelectedTask;
  }, [selectedTask, updateSelectedTask]);

  useEffect(() => {
    if (!taskId) return;
    ensureSocketConnected();
    const socket = getSocket();

    const syncFromCache = (incomingId: string) => {
      const current = selectedTaskRef.current;
      if (!current || current.id !== incomingId) return;
      const cached = queryClient.getQueryData<TaskResponse>(
        taskKeys.detail(incomingId),
      );
      if (cached && cached !== current) {
        updateSelectedTaskRef.current(cached);
      }
    };

    const applyAndSync = (payload: { taskId: string; task: unknown }) => {
      if (import.meta.env.DEV) {
        console.debug("[realtime] task payload received", payload.taskId);
      }
      const task = payload.task as TaskResponse;
      applyTaskPayload(queryClient, task);
      const current = selectedTaskRef.current;
      if (current && task.id === current.id) {
        updateSelectedTaskRef.current(task);
      }
      syncFromCache(payload.taskId);
    };

    const handleScheduleUpdated: ServerToClientTaskEvents["task:schedule_updated"] =
      applyAndSync;

    const handleRescheduled: ServerToClientTaskEvents["task:rescheduled"] =
      applyAndSync;

    const handleUnlocked: ServerToClientTaskEvents["task:unlocked"] = (
      payload,
    ) => {
      applyAndSync(payload);
      toast.success("Task unlocked");
    };

    const handleDueSoon: ServerToClientTaskEvents["task:due_soon"] = (
      payload,
    ) => {
      if (import.meta.env.DEV) {
        console.debug("[realtime] task:due_soon", payload.taskId);
      }
      queryClient.setQueriesData<{ data: TaskResponse[] } | undefined>(
        { queryKey: taskKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((task) =>
              task.id === payload.taskId
                ? {
                    ...task,
                    scheduleState: "due_soon",
                    dueDate: payload.dueDate,
                    reminderAt: payload.reminderAt ?? task.reminderAt,
                  }
                : task,
            ),
          };
        },
      );
      syncFromCache(payload.taskId);
    };

    const handleOverdueLocked: ServerToClientTaskEvents["task:overdue_locked"] = (
      payload,
    ) => {
      if (import.meta.env.DEV) {
        console.debug("[realtime] task:overdue_locked", payload.taskId);
      }
      queryClient.setQueriesData<{ data: TaskResponse[] } | undefined>(
        { queryKey: taskKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((task) =>
              task.id === payload.taskId
                ? {
                    ...task,
                    scheduleState: "overdue_locked",
                    lockStatus: payload.lockStatus,
                    lockedAt: payload.lockedAt,
                    dueDate: payload.dueDate,
                    isLocked: true,
                    isOverdue: true,
                  }
                : task,
            ),
          };
        },
      );
      syncFromCache(payload.taskId);
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

    // Set the ref BEFORE registering the connect handler so a race where
    // the socket connects between `getSocket()` and `.on("connect", …)`
    // does not drop the join request.
    joinedTaskIdRef.current = taskId;

    const onConnect = () => {
      if (joinedTaskIdRef.current) {
        joinTaskRoom(socket, joinedTaskIdRef.current);
      }
    };
    socket.on("connect", onConnect);

    if (socket.connected) {
      joinTaskRoom(socket, taskId);
    } else {
      // Ensure the socket is actually trying to connect. ensureSocketConnected
      // is a no-op when already connecting/connected, but in case a previous
      // disconnect happened (e.g. logout → login) we re-trigger it.
      ensureSocketConnected();
    }

    return () => {
      if (joinedTaskIdRef.current) {
        leaveTaskRoom(socket, joinedTaskIdRef.current);
        joinedTaskIdRef.current = null;
      }
      socket.off("task:schedule_updated", handleScheduleUpdated);
      socket.off("task:rescheduled", handleRescheduled);
      socket.off("task:unlocked", handleUnlocked);
      socket.off("task:due_soon", handleDueSoon);
      socket.off("task:overdue_locked", handleOverdueLocked);
      socket.off("notification:new", handleNotification);
      socket.off("connect", onConnect);
    };
  }, [queryClient, taskId]);
}