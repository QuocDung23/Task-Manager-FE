export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type ListStatus = "ACTIVE" | "INACTIVE";

export type ListResponse = {
  id: string;
  name: string;
  description: string;
  order: number;
  boardId: string;
  status: ListStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type GetListsParams = {
  boardId: string;
  page?: number;
  limit?: number;
  name?: string;
  status?: ListStatus;
};

export type CreateListRequest = {
  name: string;
  description?: string;
};

export type UpdateListRequest = {
  name?: string;
  description?: string;
  order?: number;
};

export type ReorderListsRequest = {
  listIds: string[];
};

export type ListApiResponse = {
  success: boolean;
  data: ListResponse[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
};
