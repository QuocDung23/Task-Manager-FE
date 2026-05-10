import { axiosLocal } from "@/services/axios";
import type { ApiResponse, BoardRequest, BoardResponse } from "../types";

export const boardApi = {
  getAllByProjectId: async (
    projectId: string,
    page: number = 1,
    limit: number = 12,
    name?: string,
  ): Promise<ApiResponse<BoardResponse[]>> => {
    const response = await axiosLocal.get<ApiResponse<BoardResponse[]>>(
      `/board/${projectId}/getAlls`,
      {
        params: {
          page,
          limit,
          name: name || undefined,
        },
      },
    );
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<BoardResponse>> => {
    const response = await axiosLocal.get<ApiResponse<BoardResponse>>(
      `/board/${id}`,
    );
    return response.data;
  },
  create: async (data: Partial<BoardRequest>, projectId: string): Promise<BoardResponse> => {
    const response = await axiosLocal.post(`/project/${projectId}/boards`, data)
    return response.data
  },
  update: async (
    id: string,
    data: Partial<BoardRequest>,
  ): Promise<ApiResponse<BoardResponse>> => {
    const response = await axiosLocal.put<ApiResponse<BoardResponse>>(
      `/board/${id}/update`, data)
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<BoardResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<BoardResponse>>(
      `/board/${id}/delete`,
    );
    return response.data;
  },
};
