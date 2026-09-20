import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { refreshAccessToken } from "@/services/axios";
import { authStorage } from "../storage/auth-storage";
import {
  beginRestore,
  SessionRestoreContext,
  type SessionRestoreStatus,
} from "./session-restore";

interface SessionRestoreProviderProps {
  children: ReactNode;
}

function getInitialStatus(): SessionRestoreStatus {
  const token = authStorage.getToken();
  if (!token) {
    return "none";
  }
  return authStorage.hasExpiredToken(token) ? "checking" : "unchanged";
}

export function SessionRestoreProvider({
  children,
}: SessionRestoreProviderProps): JSX.Element {
  const [status, setStatus] = useState<SessionRestoreStatus>(() =>
    getInitialStatus(),
  );
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
    const currentToken = authStorage.getToken();
    if (currentToken && !authStorage.hasExpiredToken(currentToken)) {
      return Promise.resolve(true);
    }
    return beginRestore(doRestore);
  }, [doRestore]);

  useEffect(() => {
    mountedRef.current = true;

    const existingToken = authStorage.getToken();
    if (existingToken && authStorage.hasExpiredToken(existingToken)) {
      void beginRestore(doRestore);
    }

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