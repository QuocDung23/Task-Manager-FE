import axios from "axios";
import { authStorage } from "../features/auth/storage/auth-storage";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export const axiosLocal = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  withCredentials: true,
});

let refreshTokenPromise: Promise<string | null> | null = null;

const NO_REFRESHTOKEN_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
];

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshTokenPromise) {
    refreshTokenPromise = axiosLocal
      .post("/auth/refresh-token")
      .then((res) => {
        const newAccessToken = res.data.data.accessToken;
        authStorage.setToken(newAccessToken);
        return newAccessToken;
      })
      .catch(() => {
        authStorage.clearToken();
        return null;
      })
      .finally(() => {
        refreshTokenPromise = null;
      });
  }
  return refreshTokenPromise;
}

axiosLocal.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosLocal.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      NO_REFRESHTOKEN_ENDPOINTS.some((url) =>
        originalRequest.url?.includes(url),
      )
    ) {
      return Promise.reject(error);
    }

    const existingToken = authStorage.getToken();
    if (!existingToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosLocal(originalRequest);
    }

    // Refresh failed — propagate the original error to caller
    return Promise.reject(error);
  },
);
