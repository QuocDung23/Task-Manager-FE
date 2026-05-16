import { axiosLocal } from "../../../services/axios";
import type {
  ApiResponse,
  SendOtpRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  Verify,
  VerifyOtpResponse,
  VerifyAccountResponse,
} from "../types";

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosLocal.post<ApiResponse<LoginResponse>>(
      "/auth/login",
      data,
    );
    return response.data.data;
  },
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await axiosLocal.post<ApiResponse<RegisterResponse>>(
      "/auth/register",
      data,
    );
    return response.data.data;
  },
  logout: async (): Promise<void> => {
    const response = await axiosLocal.post("/auth/logout");
    return response.data;
  },
  refreshToken: async (): Promise<LoginResponse> => {
    const response = await axiosLocal.post<ApiResponse<LoginResponse>>(
      "/auth/refresh-token",
    );
    return response.data.data;
  },
  sendOtp: async (data: SendOtpRequest): Promise<ForgotPasswordResponse> => {
    const response = await axiosLocal.post<ApiResponse<ForgotPasswordResponse>>(
      "/auth/sendOtp",
      data,
    );
    return response.data.data;
  },
  verifyOtp: async (data: Verify): Promise<VerifyOtpResponse> => {
    const response = await axiosLocal.post<ApiResponse<VerifyOtpResponse>>(
      "/auth/verifyOtp",
      data,
    );
    return response.data.data;
  },
  verifyAccount: async (
    data: Verify,
  ): Promise<VerifyAccountResponse> => {
    const response = await axiosLocal.post<ApiResponse<VerifyAccountResponse>>(
      "/auth/verify",
      data,
    );
    return response.data.data;
  },
  resetPassword: async (
    data: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> => {
    const response = await axiosLocal.post<ApiResponse<ResetPasswordResponse>>(
      "/auth/resetPassword",
      data,
    );
    return response.data.data;
  },
};
