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

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
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
