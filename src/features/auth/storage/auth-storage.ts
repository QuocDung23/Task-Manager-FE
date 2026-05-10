import { AUTH_TOKEN_KEY } from "../../../router/constans";

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

function isExpiredJwtToken(token: string): boolean {
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
  },
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },
  getValidToken() {
    const token = this.getToken();
    if (!token) return null;

    if (isExpiredJwtToken(token)) {
      this.clearToken();
      return null;
    }

    return token;
  },
  hasValidToken() {
    return !!this.getValidToken();
  },
  clearToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },
};
