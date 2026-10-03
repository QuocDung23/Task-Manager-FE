import {
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";

export type SessionRestoreStatus =
  | "initializing"
  | "checking"
  | "restored"
  | "unchanged"
  | "failed"
  | "none";

export interface SessionRestoreContextValue {
  status: SessionRestoreStatus;
  isLoading: boolean;
  restoreSession: () => Promise<boolean>;
}

export const SessionRestoreContext =
  createContext<SessionRestoreContextValue | null>(null);

export function useSessionRestore(): SessionRestoreContextValue {
  const ctx = useContext(SessionRestoreContext);
  if (!ctx) {
    throw new Error(
      "useSessionRestore must be used within SessionRestoreProvider",
    );
  }
  return ctx;
}

let sharedRestorePromise: Promise<boolean> | null = null;
const restoreListeners = new Set<() => void>();

function notifyRestoreListeners(): void {
  restoreListeners.forEach((listener) => listener());
}

function subscribeToRestore(callback: () => void): () => void {
  restoreListeners.add(callback);
  return () => {
    restoreListeners.delete(callback);
  };
}

function getIsRestoringSnapshot(): boolean {
  return sharedRestorePromise !== null;
}

export function beginRestore(task: () => Promise<boolean>): Promise<boolean> {
  if (sharedRestorePromise) {
    return sharedRestorePromise;
  }
  sharedRestorePromise = task().finally(() => {
    sharedRestorePromise = null;
    notifyRestoreListeners();
  });
  notifyRestoreListeners();
  return sharedRestorePromise;
}

export function useIsSessionRestoring(): boolean {
  return useSyncExternalStore(subscribeToRestore, getIsRestoringSnapshot);
}