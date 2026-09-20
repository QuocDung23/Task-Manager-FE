import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  useState,
  type JSX,
  type ReactNode,
} from "react";

import { authStorage } from "../storage/auth-storage";
import { refreshAccessToken } from "@/services/axios";

export type SessionRestoreStatus =
  | "initializing"
  | "checking"
  | "restored"
  | "unchanged"
  | "failed"
  | "none";

interface SessionRestoreContextValue {
  status: SessionRestoreStatus;
  isLoading: boolean;
  restoreSession: () => Promise<boolean>;
}

const SessionRestoreContext = createContext<SessionRestoreContextValue | null>(
  null,
);

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

function beginRestore(task: () => Promise<boolean>): Promise<boolean> {
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

interface SessionRestoreProviderProps {
  children: ReactNode;
}

export function SessionRestoreProvider({
  children,
}: SessionRestoreProviderProps): JSX.Element {
  const [status, setStatus] = useState<SessionRestoreStatus>("initializing");
  const mountedRef = useRef(true);

  const doRestore = useCallback(async (): Promise<boolean> => {
    const newToken = await refreshAccessToken();
    if (newToken) {
      if (mountedRef.current) setStatus("restored");
      return true;
    }
    if (mountedRef.current) setStatus("failed");
    return false;
  }, []);

  const restoreSession = useCallback((): Promise<boolean> => {
    // Base the decision on the live token instead of the mount-time status:
    // a valid access token means there is nothing to refresh, an expired one
    // means we refresh no matter what the previous provider status was.
    const currentToken = authStorage.getToken();
    if (currentToken && !authStorage.hasExpiredToken(currentToken)) {
      return Promise.resolve(true);
    }
    return beginRestore(doRestore);
  }, [doRestore]);

  useEffect(() => {
    mountedRef.current = true;

    const existingToken = authStorage.getToken();

    if (!existingToken) {
      setStatus("none");
      return;
    }

    const isExpired = authStorage.hasExpiredToken(existingToken);

    if (!isExpired) {
      setStatus("unchanged");
      return;
    }

    setStatus("checking");
    void beginRestore(doRestore);

    return () => {
      mountedRef.current = false;
    };
  }, [doRestore]);

  const isLoading = status === "initializing" || status === "checking";

  return (
    <SessionRestoreContext.Provider
      value={{
        status,
        isLoading,
        restoreSession,
      }}
    >
      {children}
    </SessionRestoreContext.Provider>
  );
}