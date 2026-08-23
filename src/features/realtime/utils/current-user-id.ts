import type { TypedSocket } from "../socket";

interface JwtPayload {
  sub?: string;
  id?: string;
  userId?: string;
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return atob(padded + "=".repeat(padLength));
}

function readUserIdFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const segments = token.split(".");
  if (segments.length < 2) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(segments[1])) as JwtPayload;
    return payload.sub ?? payload.id ?? payload.userId ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve current userId của socket hiện tại. Socket client không giữ `data.user.id`
 * (chỉ server) nên ta đọc từ `socket.auth.token` (JWT đã được server verify khi
 * connect). Fallback về `null` nếu không parse được — caller sẽ bỏ qua branch
 * "current user" và chỉ patch members cache như trước.
 */
export function getCurrentUserId(socket: TypedSocket): string | null {
  const auth = socket.auth as { token?: string } | undefined;
  return readUserIdFromToken(auth?.token);
}