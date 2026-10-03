import { axiosLocal } from "@/services/axios";
import type {
  ApiResponse,
  CreateTagRequest,
  GetTagsParams,
  GetTasksByTagParams,
  GetTasksByTagResponse,
  TagResponse,
  UpdateTagRequest,
} from "../types";

export const tagApi = {
  getByBoard: async (
    boardId: string,
    params?: GetTagsParams,
  ): Promise<ApiResponse<TagResponse[]>> => {
    const response = await axiosLocal.get<ApiResponse<TagResponse[]>>(
      `/task/boards/${boardId}/tags`,
      { params },
    );
    return response.data;
  },

  create: async (
    boardId: string,
    data: CreateTagRequest,
  ): Promise<ApiResponse<TagResponse>> => {
    const response = await axiosLocal.post<ApiResponse<TagResponse>>(
      `/task/boards/${boardId}/tags`,
      data,
    );
    return response.data;
  },

  update: async (
    boardId: string,
    tagId: string,
    data: UpdateTagRequest,
  ): Promise<ApiResponse<TagResponse>> => {
    const response = await axiosLocal.patch<ApiResponse<TagResponse>>(
      `/task/boards/${boardId}/tags/${tagId}`,
      data,
    );
    return response.data;
  },

  delete: async (
    boardId: string,
    tagId: string,
  ): Promise<ApiResponse<TagResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<TagResponse>>(
      `/task/boards/${boardId}/tags/${tagId}`,
    );
    return response.data;
  },

  getTasksByTag: async (
    boardId: string,
    tagId: string,
    params?: GetTasksByTagParams,
  ): Promise<ApiResponse<GetTasksByTagResponse>> => {
    const response = await axiosLocal.get<ApiResponse<GetTasksByTagResponse>>(
      `/task/boards/${boardId}/tags/${tagId}/tasks`,
      { params },
    );
    return response.data;
  },
};
