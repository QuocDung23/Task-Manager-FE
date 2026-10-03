import type { RealtimeAck } from "../contracts/realtime-events";
import { getSocket, type TypedSocket } from "../socket";

export type BoardRoomState = {
  desiredRefs: Map<string, number>;
  joinedOnTransport: Set<string>;
};

const state: BoardRoomState = {
  desiredRefs: new Map(),
  joinedOnTransport: new Set(),
};

const reconcileHandlers = new Map<string, () => void>();
const reconcileTimers = new Map<string, number>();
const pendingJoins = new Map<string, number>();
const blockedBoards = new Set<string>();
const ACK_TIMEOUT_MS = 5_000;

function logJoinFailure(boardId: string, response?: RealtimeAck): void {
  if (import.meta.env.DEV) {
    console.debug("[realtime] board:join failed", {
      boardId,
      code: response?.code,
      error: response?.error,
    });
  }
}

function scheduleReconcile(boardId: string): void {
  const currentTimer = reconcileTimers.get(boardId);
  if (currentTimer !== undefined) window.clearTimeout(currentTimer);
  const timer = window.setTimeout(() => {
    reconcileTimers.delete(boardId);
    reconcileHandlers.get(boardId)?.();
  }, 100);
  reconcileTimers.set(boardId, timer);
}

function emitJoin(socket: TypedSocket, boardId: string): void {
  if (state.desiredRefs.get(boardId) === undefined) return;
  if (state.joinedOnTransport.has(boardId)) return;
  if (blockedBoards.has(boardId)) return;
  if (pendingJoins.has(boardId)) return;

  let completed = false;
  const timeoutId = window.setTimeout(() => {
    if (completed) return;
    completed = true;
    pendingJoins.delete(boardId);
    logJoinFailure(boardId);
  }, ACK_TIMEOUT_MS);
  pendingJoins.set(boardId, timeoutId);

  socket.emit("board:join", { boardId }, (response) => {
    if (completed) return;
    completed = true;
    window.clearTimeout(timeoutId);
    pendingJoins.delete(boardId);
    if (response.success) {
      if (state.desiredRefs.has(boardId)) {
        state.joinedOnTransport.add(boardId);
        scheduleReconcile(boardId);
      } else {
        socket.emit("board:leave", { boardId }, () => undefined);
      }
      return;
    }
    if (response.code === "FORBIDDEN" || response.code === "NOT_FOUND") {
      blockedBoards.add(boardId);
    }
    logJoinFailure(boardId, response);
  });
}

function emitLeave(socket: TypedSocket, boardId: string): void {
  if (!state.joinedOnTransport.has(boardId)) return;
  state.joinedOnTransport.delete(boardId);
  socket.emit("board:leave", { boardId }, () => undefined);
}

export function acquireBoardRoom(boardId: string): void {
  const current = state.desiredRefs.get(boardId) ?? 0;
  if (current === 0) blockedBoards.delete(boardId);
  const next = current + 1;
  state.desiredRefs.set(boardId, next);
  if (next === 1 && getSocket().connected) emitJoin(getSocket(), boardId);
}

export function releaseBoardRoom(boardId: string): void {
  const current = state.desiredRefs.get(boardId);
  if (!current) return;
  if (current > 1) {
    state.desiredRefs.set(boardId, current - 1);
    return;
  }
  state.desiredRefs.delete(boardId);
  blockedBoards.delete(boardId);
  const socket = getSocket();
  const pendingTimeout = pendingJoins.get(boardId);
  if (pendingTimeout !== undefined) window.clearTimeout(pendingTimeout);
  pendingJoins.delete(boardId);
  emitLeave(socket, boardId);
}

export function rejoinBoardRooms(socket: TypedSocket = getSocket()): void {
  for (const boardId of state.desiredRefs.keys()) emitJoin(socket, boardId);
}

export function clearJoinedBoardRooms(): void {
  state.joinedOnTransport.clear();
  for (const timeoutId of pendingJoins.values()) window.clearTimeout(timeoutId);
  pendingJoins.clear();
}

export function resetBoardRooms(): void {
  state.desiredRefs.clear();
  clearJoinedBoardRooms();
  for (const timer of reconcileTimers.values()) window.clearTimeout(timer);
  reconcileTimers.clear();
  reconcileHandlers.clear();
  blockedBoards.clear();
}

export function setBoardRoomReconcileHandler(
  boardId: string,
  handler: (() => void) | null,
): void {
  if (handler) reconcileHandlers.set(boardId, handler);
  else reconcileHandlers.delete(boardId);
}

export function getBoardRoomState(): BoardRoomState {
  return state;
}
