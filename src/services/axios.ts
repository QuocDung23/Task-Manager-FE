import axios from "axios";
import { authStorage } from "../features/auth/storage/auth-storage";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export const axiosLocal = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let refreshTokenPromise: Promise<string | null> | null = null;

const NO_REFRESHTOKEN_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
];

axiosLocal.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    Promise.reject(error);
  },
);


axiosLocal.interceptors.response.use(
  (response) => response,
  async (error) => {
    //original = ban đầu
    const originalRequest = error.config;

    //1 check condition bo qa refresh
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

    originalRequest._retry = true;

    //2 activate or await to response
    if (!refreshTokenPromise) {
      refreshTokenPromise = axiosLocal
        .post("/auth/refresh-token")
        .then((res) => {
          const newAccessToken = res.data.data.accessToken;
          authStorage.setToken(newAccessToken);
          return newAccessToken;
        })
        .finally(() => {
          refreshTokenPromise = null;
        });
    }
    try {
      const newAccessToken = await refreshTokenPromise;
      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosLocal(originalRequest);
      }
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
    return Promise.reject(error);
  },
);
