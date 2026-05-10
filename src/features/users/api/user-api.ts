import { axiosLocal } from "@/services/axios";
import type { ApiResponse, UserResponse } from "../types";

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
};
