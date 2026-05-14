import { axiosLocal } from "@/services/axios";
import type { ApiResponse, UserResponse } from "../types";
import type { UserUpdatePayload } from "../types";

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
  }
};
