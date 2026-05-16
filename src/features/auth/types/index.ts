export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
};

export type SendOtpRequest = {
  email: string;
};

export type Verify = {
  email: string;
  otp: string;
};

export type ResetPasswordRequest = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  email: string;
  verify: boolean;
  status?: string;
};

export type RegisterResponse = {
  id: string;
  userId: string;
  email: string;
  name: string;
  bio: string;
  avatar: string;
  verify: boolean;
  status?: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type VerifyOtpResponse = {
  email: string;
  isValid: boolean;
};

export type ResetPasswordResponse = {
  email: string;
  isReset: boolean;
};

export type VerifyAccountResponse = {
  id: string;
  userId: string;
  email: string;
  name: string;
  bio: string;
  avatar: string;
  verify: boolean;
  status?: string;
  accessToken: string;
  refreshToken: string;
};

export type TokenPayload = {
  userId: string;
  email: string;
  verify: boolean;
  status: string;
  exp: number;
};