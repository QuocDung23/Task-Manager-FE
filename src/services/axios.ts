import axios from "axios";
import { authStorage } from "../features/auth/storage/auth-storage";
import { AuthRefreshCoordinator } from "./auth-refresh-coordinator";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export const axiosLocal = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  withCredentials: true,
});

let refreshTokenPromise: Promise<string | null> | null = null;
const refreshCoordinator = new AuthRefreshCoordinator();

const NO_REFRESHTOKEN_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
];

function isAuthRejection(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}

async function performRefreshRequest(): Promise<string | null> {
  try {
    const response = await axiosLocal.post("/auth/refresh-token");
    const newAccessToken: unknown = response.data?.data?.accessToken;
    if (typeof newAccessToken !== "string" || !newAccessToken) {
      authStorage.clearToken();
      return null;
    }
    authStorage.setToken(newAccessToken);
    return newAccessToken;
  } catch (error) {
    if (isAuthRejection(error)) {
      authStorage.clearToken();
    }
    return null;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshTokenPromise) {
    refreshTokenPromise = refreshCoordinator
      .coordinate(performRefreshRequest)
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

    return Promise.reject(error);
  },
);