import { Navigate, Outlet, useLocation } from "react-router-dom";
import { APP_ROUTES } from "@/router/constans";
import { authStorage } from "@/features/auth/storage/auth-storage";

export function ProtectedRoute() {
  const tokenPayload = authStorage.getTokenPayload();
  const location = useLocation();

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

export function AuthRedirectRoute() {
  const tokenPayload = authStorage.getTokenPayload();

  if (tokenPayload?.verify && tokenPayload?.status === "ACTIVE") {
    return <Navigate to={APP_ROUTES.MAIN} replace />;
  }

  if (tokenPayload && !tokenPayload.verify) {
    return <Navigate to={`${APP_ROUTES.VERIFY_ACCOUNT}?email=${encodeURIComponent(tokenPayload.email)}&flow=verify-account`} replace />;
  }

  return <Outlet />;
}

export function RootRedirectRoute() {
  const tokenPayload = authStorage.getTokenPayload();

  if (tokenPayload?.verify && tokenPayload?.status === "ACTIVE") {
    return <Navigate to={APP_ROUTES.MAIN} replace />;
  }

  if (tokenPayload && !tokenPayload.verify) {
    return <Navigate to={`${APP_ROUTES.VERIFY_ACCOUNT}?email=${encodeURIComponent(tokenPayload.email)}&flow=verify-account`} replace />;
  }

  return <Navigate to={APP_ROUTES.LOGIN} replace />;
}
