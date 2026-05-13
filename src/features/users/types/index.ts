export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type UserResponse = {
  id: string;
  name: string;
  email: string;
  bio?: string | null;
  address?: string | null;
  phoneNumber?: number | null;
  avatar?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type UserUpdatePayload = {
  name?: string;
  bio?: string | null;
  address?: string | null;
  phoneNumber?: number | null;
  avatar?: string | null;
};
