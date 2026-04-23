import { axiosLocal } from "@/services/axios";
import type { ApiResponse, ProjectRequest, ProjectResponse } from "../types";

export const projectApi = {
  getAll: async (
    page: number = 1,
    limit: number = 12,
    name: string,
  ): Promise<ApiResponse<ProjectResponse[]>> => {
    const response = await axiosLocal.get<ApiResponse<ProjectResponse[]>>(
      "/project/getAlls",
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
  create: async (data: ProjectRequest): Promise<ProjectResponse> => {
    const response = await axiosLocal.post("/auth/create-project", data);
    return response.data;
  },
  update: async (
    id: string,
    data: Partial<ProjectRequest>,
  ): Promise<ApiResponse<ProjectResponse>> => {
    const response = await axiosLocal.put<ApiResponse<ProjectResponse>>(
      `/project/${id}/update`,
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
};
