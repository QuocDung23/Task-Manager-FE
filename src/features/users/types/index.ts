export type ApiResponse<T> = {
    success: boolean;
    data: T;
  };

export type UserResponse = {
    id: string;
    name: string;
    email: string;
    bio?: string | null;
    avatar?: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}