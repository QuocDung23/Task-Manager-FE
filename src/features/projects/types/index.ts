export type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: PaginationResponse;
};

export type ProjectResponse = {
  id: string;
  name: string;
  description?: string;
};

export type ProjectRequest = {
  id: string
  name: string;
  description?: string;
};

export type PaginationResponse = {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
}

export type ProjectListResult = {
  projects: ProjectResponse[];
  pagination: PaginationResponse | null;
};


