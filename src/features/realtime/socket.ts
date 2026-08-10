import { io, Socket } from "socket.io-client";
import { authStorage } from "@/features/auth/storage/auth-storage";

export type ServerToClientTaskEvents = {
  "task:schedule_updated": (payload: { taskId: string; task: unknown }) => void;
  "task:rescheduled": (payload: { taskId: string; task: unknown }) => void;
  "task:unlocked": (payload: { taskId: string; task: unknown }) => void;
  "task:due_soon": (payload: {
    taskId: string;
    dueDate: string;
    reminderAt: string | null;
  }) => void;
  "task:overdue_locked": (payload: {
    taskId: string;
    dueDate: string;
    lockedAt: string;
    lockStatus: "OVERDUE_LOCKED" | "MANUAL_LOCKED" | "UNLOCKED";
  }) => void;
  "notification:new": (payload: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) => void;
};

export type ClientToServerTaskEvents = {
  "task:join": (
    payload: { taskId: string },
    ack?: (response: { success: boolean; error?: string }) => void,
  ) => void;
  "task:leave": (
    payload: { taskId: string },
    ack?: (response: { success: boolean; error?: string }) => void,
  ) => void;
};

function resolveSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  const apiUrl = configuredUrl || "http://localhost:3000";
  return apiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

let socket: Socket<ServerToClientTaskEvents, ClientToServerTaskEvents> | null = null;

function buildSocket(): Socket<ServerToClientTaskEvents, ClientToServerTaskEvents> {
  const token = authStorage.getValidToken();
  const url = resolveSocketUrl();
  const instance: Socket<ServerToClientTaskEvents, ClientToServerTaskEvents> = io(
    url,
    {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_500,
      reconnectionDelayMax: 8_000,
    },
  );

  if (import.meta.env.DEV) {
    instance.on("connect", () => {
      console.debug("[realtime] socket connected", { url, id: instance.id });
    });
    instance.on("disconnect", (reason) => {
      console.debug("[realtime] socket disconnected", reason);
    });
  }

  instance.on("connect_error", (err) => {
    if (import.meta.env.DEV) {
      console.debug("[realtime] connect_error", err?.message ?? err);
    }
    const current = authStorage.getValidToken();
    if (current) {
      instance.auth = { token: current };
    }
  });

  return instance;
}

export function getSocket(): Socket<ServerToClientTaskEvents, ClientToServerTaskEvents> {
  if (!socket) {
    socket = buildSocket();
  }
  return socket;
}

export function ensureSocketConnected(): void {
  const instance = getSocket();
  // The singleton can be created on the login screen before a token exists.
  // Refresh the handshake auth immediately before connecting so the first
  // connection after login does not send an empty token.
  const token = authStorage.getValidToken();
  instance.auth = token ? { token } : {};
  if (!instance.connected) {
    instance.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
  }
}

export function refreshSocketAuth(): void {
  if (!socket) return;
  const token = authStorage.getValidToken();
  socket.auth = token ? { token } : {};
}
