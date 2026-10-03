import { authStorage } from "../features/auth/storage/auth-storage";

const REFRESH_LOCK_KEY = "auth-refresh-lock-v1";
const TAB_ID_KEY = "auth-refresh-tab-id";
const LOCK_TTL_MS = 10_000;
const POLL_INTERVAL_MS = 150;

type RefreshLock = {
  tabId: string;
  acquiredAt: number;
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getTabId(): string {
  const existing = sessionStorage.getItem(TAB_ID_KEY);
  if (existing) return existing;
  const tabId = createId();
  sessionStorage.setItem(TAB_ID_KEY, tabId);
  return tabId;
}

function readLock(): RefreshLock | null {
  const raw = localStorage.getItem(REFRESH_LOCK_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RefreshLock;
  } catch {
    return null;
  }
}

function isLockFree(lock: RefreshLock | null): boolean {
  if (!lock) return true;
  return Date.now() - lock.acquiredAt > LOCK_TTL_MS;
}

function acquireLock(): boolean {
  if (!isLockFree(readLock())) return false;
  const candidate: RefreshLock = { tabId: getTabId(), acquiredAt: Date.now() };
  localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(candidate));
  return readLock()?.tabId === getTabId();
}

function releaseLock(): void {
  const lock = readLock();
  if (lock && lock.tabId === getTabId()) {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export class AuthRefreshCoordinator {
  async coordinate(task: () => Promise<string | null>): Promise<string | null> {
    const initialToken = authStorage.getToken();
    if (!initialToken) {
      return null;
    }

    if (!acquireLock()) {
      const externalToken = await this.awaitExternalRefresh(initialToken);
      if (externalToken) {
        return externalToken;
      }
    }

    if (!acquireLock()) {
      return null;
    }

    try {
      return await task();
    } finally {
      releaseLock();
    }
  }

  private async awaitExternalRefresh(
    initialToken: string | null,
  ): Promise<string | null> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < LOCK_TTL_MS) {
      const currentToken = authStorage.getToken();
      if (currentToken && currentToken !== initialToken) {
        return currentToken;
      }
      if (isLockFree(readLock())) {
        return null;
      }
      await delay(POLL_INTERVAL_MS);
    }
    return null;
  }
}