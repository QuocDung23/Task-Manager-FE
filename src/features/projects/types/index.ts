export type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: PaginationResponse;
};

export type ProjectResponse = {
  id: string;
  name: string;
  description?: string;
  members?: ProjectMemberUser[];
};

export type ProjectMemberUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
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

export type AddProjectMemberRequest = {
  userId: string;
};

export type AddProjectMemberResponse = {
  id: string;
  userId: string;
  projectId: string;
  roleId: string;
};

