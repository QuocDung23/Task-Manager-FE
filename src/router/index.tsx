import { createBrowserRouter } from "react-router-dom";
import { LoginPage } from "../pages/auth/login-page";
import { RegisterPage } from "../pages/auth/register-page";
import { MainPage } from "@/pages/mainSpace/main-page";
import {
  AuthRedirectRoute,
  ProtectedRoute,
  RootRedirectRoute,
} from "./route-guards";
import { MainLayout } from "@/layouts/main-layout";
import { DetailProject } from "@/components/projects/detail-project";
import { APP_ROUTES } from "./constans";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirectRoute />,
  },
  {
    element: <AuthRedirectRoute />,
    children: [
      {
        path: `${APP_ROUTES.LOGIN}`,
        element: <LoginPage />,
      },
      {
        path: `${APP_ROUTES.REGISTER}`,
        element: <RegisterPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: `/${APP_ROUTES.MAIN}`,
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <MainPage />,
          },
        ],
      },
      {
        path: `/${APP_ROUTES.PROJECT}/:projectId`,
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <DetailProject />,
          },
        ],
      },
    ],
  },
]);
