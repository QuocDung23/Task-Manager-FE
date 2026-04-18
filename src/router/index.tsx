import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from "../pages/auth/login-page";
import { RegisterPage } from '../pages/auth/register-page';
import { TestPage } from '../layouts/auth/components/test';

export const router = createBrowserRouter([
    {
        path: "/",
        element: <TestPage />
    },
    {
        path: "/login",
        element: <LoginPage/>
    },
    {
        path: "/register",
        element: <RegisterPage/>
    },

])
