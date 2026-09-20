import { createBrowserRouter } from "react-router-dom";
import { LoginPage } from "../pages/auth/login-page";
import { RegisterPage } from "../pages/auth/register-page";
import { ForgotPasswordPage } from "../pages/auth/sendOtp-page";
import { VerifyAccountPage } from "../pages/auth/verify-account-page";
import { VerifyOtpPage } from "../pages/auth/verify-otp-page";
import { ResetPasswordPage } from "../pages/auth/reset-password-page";
import { MainPage } from "@/pages/mainSpace/main-page";
import {
  AuthRedirectRoute,
  ProtectedRoute,
  RootRedirectRoute,
} from "./route-guards";
import { MainLayout } from "@/layouts/main-layout";
import { DetailProject } from "@/components/projects/detail-project";
import { APP_ROUTES } from "./constans";
import { BoardPage } from "@/pages/board/board-page";

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
      {
        path: `${APP_ROUTES.FORGOT_PASSWORD}`,
        element: <ForgotPasswordPage />,
      },
      {
        path: `${APP_ROUTES.VERIFY_ACCOUNT}`,
        element: <VerifyAccountPage />,
      },
      {
        path: `${APP_ROUTES.VERIFY_OTP}`,
        element: <VerifyOtpPage />,
      },
      {
        path: `${APP_ROUTES.RESET_PASSWORD}`,
        element: <ResetPasswordPage />,
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
      {
        path: `/${APP_ROUTES.BOARD}/:boardId`,
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <BoardPage />,
          },
        ],
      }
    ],
  },
]);
