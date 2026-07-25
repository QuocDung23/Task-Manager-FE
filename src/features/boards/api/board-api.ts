import { axiosLocal } from "@/services/axios";
import type {
  ApiResponse,
  BoardMemberUser,
  BoardRequest,
  BoardResponse,
} from "../types";

export const boardApi = {
  getAllByProjectId: async (
    projectId: string,
    page: number = 1,
    limit: number = 12,
    name?: string,
  ): Promise<ApiResponse<BoardResponse[]>> => {
    const response = await axiosLocal.get<ApiResponse<BoardResponse[]>>(
      "/board",
      {
        params: {
          projectId,
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
  create: async (
    data: Partial<BoardRequest>,
    projectId: string,
  ): Promise<ApiResponse<BoardResponse>> => {
    const response = await axiosLocal.post<ApiResponse<BoardResponse>>(
      `/project/${projectId}/boards`,
      data,
    );
    return response.data;
  },
  update: async (
    id: string,
    data: Partial<BoardRequest>,
  ): Promise<ApiResponse<BoardResponse>> => {
    const response = await axiosLocal.patch<ApiResponse<BoardResponse>>(
      `/board/${id}`,
      data,
    );
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<BoardResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<BoardResponse>>(
      `/board/${id}`,
    );
    return response.data;
  },

  /**
   * Lấy danh sách active members của 1 board.
   * Dùng cho picker assignee — user click chọn trực tiếp, không cần search email.
   */
  getMembers: async (
    boardId: string,
  ): Promise<ApiResponse<BoardMemberUser[]>> => {
    const response = await axiosLocal.get<ApiResponse<BoardMemberUser[]>>(
      `/board/${boardId}/members`,
    );
    return response.data;
  },
};
