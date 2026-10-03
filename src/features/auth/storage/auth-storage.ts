import { AUTH_TOKEN_KEY } from "../../../router/constans";
import type { TokenPayload } from "../types";

export const AUTH_TOKEN_CHANGED_EVENT = "auth-token-changed";

function notifyTokenChanged(): void {
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export function decodeTokenPayload(
  token: string,
): Record<string, unknown> | null {
  return decodeJwtPayload(token);
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;

  if (typeof exp !== "number") {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
}

export const authStorage = {
  setToken(token: string) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    notifyTokenChanged();
  },
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  hasExpiredToken(token?: string | null): boolean {
    const t = token ?? this.getToken();
    if (!t) return true;
    return isTokenExpired(t);
  },

  getUsableToken() {
    const token = this.getToken();
    if (!token) return null;
    if (isTokenExpired(token)) return null;
    return token;
  },
  getTokenPayload(): TokenPayload | null {
    const token = this.getToken();
    if (!token) return null;
    if (isTokenExpired(token)) return null;
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    return payload as TokenPayload;
  },
  clearToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    notifyTokenChanged();
  },
};
