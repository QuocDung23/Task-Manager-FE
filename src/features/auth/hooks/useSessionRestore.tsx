import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { refreshAccessToken } from "@/services/axios";
import { authStorage } from "../storage/auth-storage";

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

  isSessionRestored: boolean;

  isSessionExpired: boolean;
}

const SessionRestoreContext = createContext<SessionRestoreContextValue | null>(
  null,
);

export function useSessionRestoreContext(): SessionRestoreContextValue {
  const ctx = useContext(SessionRestoreContext);
  if (!ctx) {
    throw new Error(
      "useSessionRestoreContext must be used within SessionRestoreProvider",
    );
  }
  return ctx;
}

export function useSessionRestore(): SessionRestoreContextValue {
  return useSessionRestoreContext();
}

let sharedRestorePromise: Promise<boolean> | null = null;

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

    if (!sharedRestorePromise) {
      sharedRestorePromise = doRestore().finally(() => {
        sharedRestorePromise = null;
      });
    }

    void sharedRestorePromise;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const restoreSession = useCallback(async (): Promise<boolean> => {
    if (status === "restored" || status === "unchanged") {
      return true; // Already good
    }
    if (status === "initializing" || status === "checking") {
      // Wait for ongoing restore
      if (sharedRestorePromise) {
        return sharedRestorePromise;
      }
      setStatus("checking");
    } else {
      setStatus("checking");
    }
    const success = await doRestore();
    return success;
  }, [status, doRestore]);

  const isLoading = status === "initializing" || status === "checking";
  const isSessionRestored = status === "restored";
  const isSessionExpired = status === "failed";

  return (
    <SessionRestoreContext.Provider
      value={{
        status,
        isLoading,
        restoreSession,
        isSessionRestored,
        isSessionExpired,
      }}
    >
      {children}
    </SessionRestoreContext.Provider>
  );
}
