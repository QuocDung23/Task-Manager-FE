import { axiosLocal } from "@/services/axios";
import type {
  AddProjectMemberRequest,
  AddProjectMemberResponse,
  ApiResponse,
  ProjectMemberListResponse,
  ProjectMemberResponse,
  ProjectRequest,
  ProjectResponse,
} from "../types";

export const projectApi = {
  getAll: async (
    page: number = 1,
    limit: number = 12,
    name?: string,
  ): Promise<ApiResponse<ProjectResponse[]>> => {
    const response = await axiosLocal.get<ApiResponse<ProjectResponse[]>>(
      "/project",
      {
        params: {
          page,
          limit,
          name: name || undefined,
          _t: Date.now(),
        },
      },
    );
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<ProjectResponse>> => {
    const response = await axiosLocal.get<ApiResponse<ProjectResponse>>(
      `/project/${id}`,
    );
    return response.data;
  },
  create: async (
    data: ProjectRequest,
  ): Promise<ApiResponse<ProjectResponse>> => {
    const response = await axiosLocal.post<ApiResponse<ProjectResponse>>(
      "/project",
      data,
    );
    return response.data;
  },
  update: async (
    id: string,
    data: Partial<ProjectRequest>,
  ): Promise<ApiResponse<ProjectResponse>> => {
    const response = await axiosLocal.patch<ApiResponse<ProjectResponse>>(
      `/project/${id}`,
      data,
    );
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<ProjectResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<ProjectResponse>>(
      `/project/${id}`,
    );
    return response.data;
  },
  addMember: async (
    projectId: string,
    data: AddProjectMemberRequest,
  ): Promise<ApiResponse<AddProjectMemberResponse>> => {
    const response = await axiosLocal.post<
      ApiResponse<AddProjectMemberResponse>
    >(`/project/${projectId}/members`, data);
    return response.data;
  },
  getMembers: async (
    projectId: string,
  ): Promise<ApiResponse<ProjectMemberListResponse>> => {
    const response = await axiosLocal.get<
      ApiResponse<ProjectMemberListResponse>
    >(`/project/${projectId}/members`);
    return response.data;
  },
  updateMemberRole: async (
    projectId: string,
    memberId: string,
    data: { roleId: string },
  ): Promise<ApiResponse<ProjectMemberResponse>> => {
    const response = await axiosLocal.patch<
      ApiResponse<ProjectMemberResponse>
    >(`/project/${projectId}/members/${memberId}`, data);
    return response.data;
  },
  removeMember: async (
    projectId: string,
    memberId: string,
  ): Promise<ApiResponse<ProjectMemberResponse>> => {
    const response = await axiosLocal.delete<
      ApiResponse<ProjectMemberResponse>
    >(`/project/${projectId}/members/${memberId}`);
    return response.data;
  },
};
