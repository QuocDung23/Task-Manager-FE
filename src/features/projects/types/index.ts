export type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: PaginationResponse;
};

export type ProjectResponse = {
  id: string;
  name: string;
  description?: string;
  userId: string;
  role?: string;
  status?: "ACTIVE" | "INACTIVE";
  members?: ProjectMemberUser[];
  boardCount?: number;
  _count?: { boards?: number };
  totalMembers?: number;
};

export type ProjectMemberUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
};

export type ProjectMemberResponse = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
  projectId: string;
  roleId: string;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export type ProjectMemberListResponse = {
  members: ProjectMemberResponse[];
  totalMembers: number;
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

