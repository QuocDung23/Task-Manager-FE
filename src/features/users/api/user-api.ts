import { axiosLocal } from "@/services/axios";
import type { ApiResponse, UserResponse } from "../types";
import type { ChangePasswordPayload, UserUpdatePayload } from "../types";

export const userApi = {
  getAll: async (
    email?: string,
    status: string = "ACTIVE",
  ): Promise<ApiResponse<UserResponse[]>> => {
    const response = await axiosLocal.get<ApiResponse<UserResponse[]>>("/user",{
        params: {
            email: email || undefined,
            status
        }
    });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<UserResponse>> => {
    const response = await axiosLocal.get<ApiResponse<UserResponse>>(
      `/user/${id}`,
    );
    return response.data;
  },
  getMe: async (): Promise<ApiResponse<UserResponse>> => {
    const response = await axiosLocal.get<ApiResponse<UserResponse>>('/user/me');
    return response.data;
  },
  updateMe: async (data: UserUpdatePayload): Promise<ApiResponse<UserResponse>> => {
    const response = await axiosLocal.patch<ApiResponse<UserResponse>>('/user/me', data);
    return response.data;
  },
  updateMyAvatar: async (file: File): Promise<ApiResponse<{ avatar: string }>> => {
    const formData = new FormData()
    formData.append("avatar", file)
    const response = await axiosLocal.patch<ApiResponse<{ avatar: string }>>('/user/me/avatar', formData)
    return response.data;
  },
  // BE trả body `{ "success": true }` vì service return `data: undefined`,
  // nên không có key `data` trong response — dùng `ApiResponse<void>`.
  changePassword: async (data: ChangePasswordPayload): Promise<ApiResponse<void>> => {
    const response = await axiosLocal.patch<ApiResponse<void>>('/user/me/password', data);
    return response.data;
  }
};
