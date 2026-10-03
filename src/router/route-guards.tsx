import { Navigate, Outlet, useLocation } from "react-router-dom";
import { APP_ROUTES } from "@/router/constans";
import { authStorage } from "@/features/auth/storage/auth-storage";
import {
  useIsSessionRestoring,
  useSessionRestore,
} from "@/features/auth/hooks/session-restore";
import type { TokenPayload } from "@/features/auth/types";
import { useEffect, useRef, type JSX } from "react";

function SessionLoadingScreen(): JSX.Element {
  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <div
        role="status"
        aria-label="Checking session"
        className="flex flex-col items-center gap-3"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-border border-t-ring" />
        <span className="text-sm text-muted-foreground">
          Checking session...
        </span>
      </div>
    </div>
  );
}

type GuardSessionState =
  | { phase: "checking" }
  | { phase: "ready"; payload: TokenPayload | null };

function useGuardSession(): GuardSessionState {
  const { restoreSession } = useSessionRestore();
  const isRestoring = useIsSessionRestoring();
  const restoreAttemptedRef = useRef(false);

  const token = authStorage.getToken();
  const hasExpiredToken = authStorage.hasExpiredToken(token);

  useEffect(() => {
    if (!hasExpiredToken) {
      restoreAttemptedRef.current = false;
      return;
    }

    if (restoreAttemptedRef.current || isRestoring) {
      return;
    }
    restoreAttemptedRef.current = true;
    void restoreSession();
  }, [hasExpiredToken, isRestoring, restoreSession]);

  if (isRestoring) {
    return { phase: "checking" };
  }

  return { phase: "ready", payload: authStorage.getTokenPayload() };
}

export function ProtectedRoute(): JSX.Element {
  const session = useGuardSession();
  const location = useLocation();

  if (session.phase === "checking") {
    return <SessionLoadingScreen />;
  }

  const tokenPayload = session.payload;

  if (!tokenPayload) {
    return (
      <Navigate to={APP_ROUTES.LOGIN} replace state={{ from: location }} />
    );
  }

  if (!tokenPayload.verify || tokenPayload.status !== "ACTIVE") {
    return (
      <Navigate
        to={`${APP_ROUTES.VERIFY_ACCOUNT}?email=${encodeURIComponent(tokenPayload.email)}&flow=verify-account`}
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

export function AuthRedirectRoute(): JSX.Element {
  const session = useGuardSession();

  if (session.phase === "checking") {
    return <SessionLoadingScreen />;
  }

  const tokenPayload = session.payload;

  if (tokenPayload?.verify && tokenPayload?.status === "ACTIVE") {
    return <Navigate to={APP_ROUTES.MAIN} replace />;
  }

  if (tokenPayload && !tokenPayload.verify) {
    return (
      <Navigate
        to={`${APP_ROUTES.VERIFY_ACCOUNT}?email=${encodeURIComponent(tokenPayload.email)}&flow=verify-account`}
        replace
      />
    );
  }

  return <Outlet />;
}

export function RootRedirectRoute(): JSX.Element {
  const session = useGuardSession();

  if (session.phase === "checking") {
    return <SessionLoadingScreen />;
  }

  const tokenPayload = session.payload;

  if (tokenPayload?.verify && tokenPayload?.status === "ACTIVE") {
    return <Navigate to={APP_ROUTES.MAIN} replace />;
  }

  if (tokenPayload && !tokenPayload.verify) {
    return (
      <Navigate
        to={`${APP_ROUTES.VERIFY_ACCOUNT}?email=${encodeURIComponent(tokenPayload.email)}&flow=verify-account`}
        replace
      />
    );
  }

  return <Navigate to={APP_ROUTES.LOGIN} replace />;
}
