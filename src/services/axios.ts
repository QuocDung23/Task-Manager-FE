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

    const token = authStorage.getToken();
    if (token && !isAuthEndpoint) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})