import type { RealtimeAck } from "../contracts/realtime-events";
import { getSocket, type TypedSocket } from "../socket";

export type ProjectRoomState = {
  desiredRefs: Map<string, number>;
  joinedOnTransport: Set<string>;
};

const state: ProjectRoomState = {
  desiredRefs: new Map(),
  joinedOnTransport: new Set(),
};

const reconcileHandlers = new Map<string, () => void>();
const reconcileTimers = new Map<string, number>();
const pendingJoins = new Map<string, number>();
const blockedProjects = new Set<string>();
const ACK_TIMEOUT_MS = 5_000;

function logJoinFailure(projectId: string, response?: RealtimeAck): void {
  if (import.meta.env.DEV) {
    console.debug("[realtime] project:join failed", {
      projectId,
      code: response?.code,
      error: response?.error,
    });
  }
}

function scheduleReconcile(projectId: string): void {
  const currentTimer = reconcileTimers.get(projectId);
  if (currentTimer !== undefined) window.clearTimeout(currentTimer);
  const timer = window.setTimeout(() => {
    reconcileTimers.delete(projectId);
    reconcileHandlers.get(projectId)?.();
  }, 100);
  reconcileTimers.set(projectId, timer);
}

function emitJoin(socket: TypedSocket, projectId: string): void {
  if (state.desiredRefs.get(projectId) === undefined) return;
  if (state.joinedOnTransport.has(projectId)) return;
  if (blockedProjects.has(projectId)) return;
  if (pendingJoins.has(projectId)) return;

  let completed = false;
  const timeoutId = window.setTimeout(() => {
    if (completed) return;
    completed = true;
    pendingJoins.delete(projectId);
    logJoinFailure(projectId);
  }, ACK_TIMEOUT_MS);
  pendingJoins.set(projectId, timeoutId);

  socket.emit("project:join", { projectId }, (response) => {
    if (completed) return;
    completed = true;
    window.clearTimeout(timeoutId);
    pendingJoins.delete(projectId);
    if (response.success) {
      if (state.desiredRefs.has(projectId)) {
        state.joinedOnTransport.add(projectId);
        scheduleReconcile(projectId);
      } else {
        socket.emit("project:leave", { projectId }, () => undefined);
      }
      return;
    }
    if (response.code === "FORBIDDEN" || response.code === "NOT_FOUND") {
      blockedProjects.add(projectId);
    }
    logJoinFailure(projectId, response);
  });
}

function emitLeave(socket: TypedSocket, projectId: string): void {
  if (!state.joinedOnTransport.has(projectId)) return;
  state.joinedOnTransport.delete(projectId);
  socket.emit("project:leave", { projectId }, () => undefined);
}

export function acquireProjectRoom(projectId: string): void {
  const current = state.desiredRefs.get(projectId) ?? 0;
  if (current === 0) blockedProjects.delete(projectId);
  const next = current + 1;
  state.desiredRefs.set(projectId, next);
  if (next === 1 && getSocket().connected) emitJoin(getSocket(), projectId);
}

export function releaseProjectRoom(projectId: string): void {
  const current = state.desiredRefs.get(projectId);
  if (!current) return;
  if (current > 1) {
    state.desiredRefs.set(projectId, current - 1);
    return;
  }
  state.desiredRefs.delete(projectId);
  blockedProjects.delete(projectId);
  const socket = getSocket();
  const pendingTimeout = pendingJoins.get(projectId);
  if (pendingTimeout !== undefined) window.clearTimeout(pendingTimeout);
  pendingJoins.delete(projectId);
  emitLeave(socket, projectId);
}

export function rejoinProjectRooms(socket: TypedSocket = getSocket()): void {
  for (const projectId of state.desiredRefs.keys()) emitJoin(socket, projectId);
}

export function clearJoinedProjectRooms(): void {
  state.joinedOnTransport.clear();
  for (const timeoutId of pendingJoins.values()) window.clearTimeout(timeoutId);
  pendingJoins.clear();
}

export function resetProjectRooms(): void {
  state.desiredRefs.clear();
  clearJoinedProjectRooms();
  for (const timer of reconcileTimers.values()) window.clearTimeout(timer);
  reconcileTimers.clear();
  reconcileHandlers.clear();
  blockedProjects.clear();
}

export function setProjectRoomReconcileHandler(
  projectId: string,
  handler: (() => void) | null,
): void {
  if (handler) reconcileHandlers.set(projectId, handler);
  else reconcileHandlers.delete(projectId);
}

export function getProjectRoomState(): ProjectRoomState {
  return state;
}