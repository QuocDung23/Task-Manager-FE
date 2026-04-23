import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from "../pages/auth/login-page";
import { RegisterPage } from '../pages/auth/register-page';
import { ProjectPage } from '@/pages/projects/project-page';
import { MainLayout } from '@/layouts/main/main-layout';
import {
    AuthRedirectRoute,
    ProtectedRoute,
    RootRedirectRoute,
} from './route-guards';

export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootRedirectRoute />
    },
    {
        element: <AuthRedirectRoute />,
        children: [
            {
                path: "/login",
                element: <LoginPage />
            },
            {
                path: "/register",
                element: <RegisterPage />
            },
        ]
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/projects",
                element: <MainLayout />,
                children: [
                    {
                        index: true,
                        element: <ProjectPage />,
                    },
                ],
            },
        ]
    },
])
