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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#f9fafb",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #e5e7eb",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ color: "#6b7280", fontSize: "14px" }}>
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
