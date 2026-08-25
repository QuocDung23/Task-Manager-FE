import { io, Socket } from "socket.io-client";
import { authStorage } from "@/features/auth/storage/auth-storage";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./contracts/realtime-events";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function resolveSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  const apiUrl = configuredUrl || "http://localhost:3000";
  return apiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

let socket: TypedSocket | null = null;

function buildSocket(): TypedSocket {
  const token = authStorage.getValidToken();
  const url = resolveSocketUrl();
  const instance: TypedSocket = io(url, {
    autoConnect: false,
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_500,
    reconnectionDelayMax: 8_000,
  });

  if (import.meta.env.DEV) {
    instance.on("connect", () => {
      console.debug("[realtime] socket connected", { url, id: instance.id });
    });
    instance.on("disconnect", (reason) => {
      console.debug("[realtime] socket disconnected", reason);
    });
    instance.on("connect_error", (error) => {
      console.debug("[realtime] connect_error", error.message);
    });
  }

  instance.on("connect_error", () => {
    const current = authStorage.getValidToken();
    instance.auth = current ? { token: current } : {};
  });

  return instance;
}

export function getSocket(): TypedSocket {
  if (!socket) socket = buildSocket();
  return socket;
}

export function ensureSocketConnected(): void {
  const instance = getSocket();
  const token = authStorage.getValidToken();
  instance.auth = token ? { token } : {};
  if (!instance.connected) instance.connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
}

export function refreshSocketAuth(): void {
  if (!socket) return;
  const token = authStorage.getValidToken();
  socket.auth = token ? { token } : {};
  if (!socket.connected) {
    socket.connect();
  }
}
