export type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: PaginationResponse;
};

export type BoardResponse = {
  id: string;
  name: string;
  description?: string;
  projectId: string;
};

export type BoardRequest = {
  id: string;
  name: string;
  description?: string;
};

export type PaginationResponse = {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
};

export type BoardListResult = {
  boards: BoardResponse[];
  pagination: PaginationResponse | null;
};

export type BoardMemberUser = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  boardMemberId: string;
  roleId: string;
  status: string;
};
