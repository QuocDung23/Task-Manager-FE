import axios from "axios";
import { authStorage } from "../features/auth/storage/auth-storage";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const axiosLocal = axios.create({
    baseURL: apiBaseUrl,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    }
})

axiosLocal.interceptors.request.use((config) => {
    const url = config.url ?? "";
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register");

    const token = authStorage.getValidToken();
    if (token && !isAuthEndpoint) {
        config.headers.Authorization = `Bearer ${token}`
    }

    if (config.data instanceof FormData && config.headers) {
        delete config.headers["Content-Type"];
    }

    return config
})

axiosLocal.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const requestUrl = String(error?.config?.url ?? "");
        const isAuthEndpoint =
            requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");

        if (status === 401 && !isAuthEndpoint) {
            authStorage.clearToken();

            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
)
