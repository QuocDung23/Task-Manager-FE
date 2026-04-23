import { Navigate, Outlet, useLocation } from "react-router-dom";
import { APP_ROUTES } from "@/features/auth/constans";
import { authStorage } from "@/features/auth/storage/auth-storage";

export function ProtectedRoute() {
  const token = authStorage.getValidToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to={APP_ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function AuthRedirectRoute() {
  const token = authStorage.getValidToken();

  if (token) {
    return <Navigate to={APP_ROUTES.PROJECTS} replace />;
  }

  return <Outlet />;
}

export function RootRedirectRoute() {
  const token = authStorage.getValidToken();

  return (
    <Navigate
      to={token ? APP_ROUTES.PROJECTS : APP_ROUTES.LOGIN}
      replace
    />
  );
}
