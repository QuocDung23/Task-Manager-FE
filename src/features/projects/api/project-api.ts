import { axiosLocal } from "@/services/axios";
import type {
  InviteProjectMemberRequest,
  ApiResponse,
  CreateProjectDto,
  ProjectMemberListResponse,
  ProjectMemberResponse,
  ProjectInvitationResponse,
  ProjectInvitationStatus,
  ProjectResponse,
  UpdateProjectDto,
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
    data: CreateProjectDto,
  ): Promise<ApiResponse<ProjectResponse>> => {
    const response = await axiosLocal.post<ApiResponse<ProjectResponse>>(
      "/project",
      data,
    );
    return response.data;
  },
  update: async (
    id: string,
    data: UpdateProjectDto,
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
  inviteMember: async (
    projectId: string,
    data: InviteProjectMemberRequest,
  ): Promise<ApiResponse<ProjectInvitationResponse>> => {
    const response = await axiosLocal.post<ApiResponse<ProjectInvitationResponse>>(
      `/project/${projectId}/invitations`, data);
    return response.data;
  },
  getMyInvitations: async (status?: ProjectInvitationStatus): Promise<ApiResponse<ProjectInvitationResponse[]>> => {
    const response = await axiosLocal.get<ApiResponse<ProjectInvitationResponse[]>>(
      "/project/invitations/me", { params: { status } });
    return response.data;
  },
  acceptInvitation: async (invitationId: string): Promise<ApiResponse<ProjectMemberResponse>> => {
    const response = await axiosLocal.post<ApiResponse<ProjectMemberResponse>>(
      `/project/invitations/${invitationId}/accept`);
    return response.data;
  },
  declineInvitation: async (invitationId: string): Promise<ApiResponse<ProjectInvitationResponse>> => {
    const response = await axiosLocal.post<ApiResponse<ProjectInvitationResponse>>(
      `/project/invitations/${invitationId}/decline`);
    return response.data;
  },
  revokeInvitation: async (projectId: string, invitationId: string): Promise<ApiResponse<ProjectInvitationResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<ProjectInvitationResponse>>(
      `/project/${projectId}/invitations/${invitationId}`);
    return response.data;
  },
  leaveProject: async (projectId: string): Promise<ApiResponse<ProjectMemberResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<ProjectMemberResponse>>(
      `/project/${projectId}/members/me`);
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
  getProjectInvitations: async (
    projectId: string, status?: ProjectInvitationStatus,
  ): Promise<ApiResponse<ProjectInvitationResponse[]>> => {
    const response = await axiosLocal.get<
      ApiResponse<ProjectInvitationResponse[]>
    >(`/project/${projectId}/invitations`, {
      params: { status },
    });
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
