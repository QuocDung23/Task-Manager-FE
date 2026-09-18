import { Navigate, Outlet, useLocation } from "react-router-dom";
import { APP_ROUTES } from "@/router/constans";
import { authStorage } from "@/features/auth/storage/auth-storage";
import { useSessionRestore } from "@/features/auth/hooks/useSessionRestore";
import type { JSX } from "react";

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

function hasUsableToken(): boolean {
  const token = authStorage.getToken();
  if (!token) return false;
  return !authStorage.hasExpiredToken(token);
}

export function ProtectedRoute(): JSX.Element {
  const { isLoading } = useSessionRestore();
  const location = useLocation();

  if (isLoading) {
    return <SessionLoadingScreen />;
  }

  const tokenPayload = authStorage.getTokenPayload();

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
  const { isLoading } = useSessionRestore();

  if (isLoading) {
    return <SessionLoadingScreen />;
  }

  if (hasUsableToken()) {
    const tokenPayload = authStorage.getTokenPayload();
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
  }

  return <Outlet />;
}

export function RootRedirectRoute(): JSX.Element {
  const { isLoading } = useSessionRestore();

  if (isLoading) {
    return <SessionLoadingScreen />;
  }

  if (hasUsableToken()) {
    const tokenPayload = authStorage.getTokenPayload();
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
  }

  return <Navigate to={APP_ROUTES.LOGIN} replace />;
}
