import { axiosLocal } from "@/services/axios";
import type {
  ApiResponse,
  CreateTaskRequest,
  MoveTaskRequest,
  MoveTaskResponse,
  TaskApiResponse,
  TaskResponse,
} from "../types";

export type UpdateTaskRequest = {
  name?: string;
  description?: string;
  dueDate?: string;
};

export const taskApi = {
  getAllByListId: async (listId: string): Promise<TaskApiResponse> => {
    const response = await axiosLocal.get<TaskApiResponse>(
      `/task/${listId}/tasks`,
    );
    return response.data;
  },
  create: async (
    listId: string,
    data: CreateTaskRequest,
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.post<ApiResponse<TaskResponse>>(
      `/task/${listId}/tasks`,
      data,
    );
    return response.data;
  },
  update: async (
    id: string,
    data: UpdateTaskRequest,
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.put<ApiResponse<TaskResponse>>(
      `/task/${id}`,
      data,
    );
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.get<ApiResponse<TaskResponse>>(
      `/task/${id}`,
    );
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<TaskResponse>>(
      `/task/${id}`,
    );
    return response.data;
  },
  move: async (
    taskId: string,
    data: MoveTaskRequest,
  ): Promise<ApiResponse<MoveTaskResponse>> => {
    const response = await axiosLocal.patch<ApiResponse<MoveTaskResponse>>(
      `/task/${taskId}/move`,
      data,
    );
    return response.data;
  },
};
