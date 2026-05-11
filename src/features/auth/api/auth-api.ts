import { axiosLocal } from "../../../services/axios";
import type {
    ApiResponse,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
} from "../types";

export const authApi = {
    login: async(data: LoginRequest): Promise<LoginResponse> => {
        const response = await axiosLocal.post<ApiResponse<LoginResponse>>('/auth/login', data)
        return response.data.data
    },
    register: async(data: RegisterRequest): Promise<RegisterResponse> => {
        const response = await axiosLocal.post<ApiResponse<RegisterResponse>>('/auth/register', data)
        return response.data.data
    },
    logout: async(): Promise<void> => {
        const response = await axiosLocal.post('/auth/logout')
        return response.data
    }
}
