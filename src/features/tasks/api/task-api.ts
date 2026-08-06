import { axiosLocal } from "@/services/axios";
import type {
  ApiResponse,
  AssignTaskRequest,
  ClearTaskScheduleRequest,
  CreateTaskCommentRequest,
  CreateTaskRequest,
  DeleteTaskCommentResponse,
  GetTaskCommentRepliesParams,
  GetTaskCommentsParams,
  MoveTaskRequest,
  MoveTaskResponse,
  SetTaskScheduleRequest,
  TaskApiResponse,
  TaskComment,
  TaskCommentsResponse,
  TaskListFilters,
  TaskResponse,
  UnlockTaskRequest,
  UpdateTaskCommentRequest,
} from "../types";

export type UpdateTaskRequest = {
  name?: string;
  description?: string;
};

function buildListParams(filters?: TaskListFilters): Record<string, string> {
  if (!filters) return {};
  const params: Record<string, string> = {};
  if (filters.scheduleState) params.scheduleState = filters.scheduleState;
  if (filters.lockStatus) params.lockStatus = filters.lockStatus;
  if (filters.dueBefore) params.dueBefore = filters.dueBefore;
  if (filters.dueAfter) params.dueAfter = filters.dueAfter;
  return params;
}

export const taskApi = {
  getAllByListId: async (
    listId: string,
    filters?: TaskListFilters,
  ): Promise<TaskApiResponse> => {
    const response = await axiosLocal.get<TaskApiResponse>(
      `/task/${listId}/tasks`,
      { params: buildListParams(filters) },
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

  assign: async (
    taskId: string,
    data: AssignTaskRequest,
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.patch<ApiResponse<TaskResponse>>(
      `/task/${taskId}/assign`,
      data,
    );
    return response.data;
  },

  unassign: async (
    taskId: string,
    userId: string,
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<TaskResponse>>(
      `/task/${taskId}/assign/${userId}`,
    );
    return response.data;
  },

  setSchedule: async (
    taskId: string,
    data: SetTaskScheduleRequest,
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.patch<ApiResponse<TaskResponse>>(
      `/task/${taskId}/schedule`,
      data,
    );
    return response.data;
  },

  reschedule: async (
    taskId: string,
    data: SetTaskScheduleRequest,
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.patch<ApiResponse<TaskResponse>>(
      `/task/${taskId}/reschedule`,
      data,
    );
    return response.data;
  },

  clearSchedule: async (
    taskId: string,
    data?: ClearTaskScheduleRequest,
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<TaskResponse>>(
      `/task/${taskId}/schedule`,
      { data: data ?? {} },
    );
    return response.data;
  },

  unlock: async (
    taskId: string,
    data: UnlockTaskRequest,
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await axiosLocal.patch<ApiResponse<TaskResponse>>(
      `/task/${taskId}/unlock`,
      data,
    );
    return response.data;
  },

  getComments: async (
    taskId: string,
    params?: GetTaskCommentsParams,
  ): Promise<ApiResponse<TaskCommentsResponse>> => {
    const response = await axiosLocal.get<ApiResponse<TaskCommentsResponse>>(
      `/task/${taskId}/comments`,
      { params },
    );
    return response.data;
  },

  createComment: async (
    taskId: string,
    data: CreateTaskCommentRequest,
  ): Promise<ApiResponse<TaskComment>> => {
    const response = await axiosLocal.post<ApiResponse<TaskComment>>(
      `/task/${taskId}/comments`,
      data,
    );
    return response.data;
  },

  getCommentReplies: async (
    taskId: string,
    commentId: string,
    params?: GetTaskCommentRepliesParams,
  ): Promise<ApiResponse<TaskCommentsResponse>> => {
    const response = await axiosLocal.get<ApiResponse<TaskCommentsResponse>>(
      `/task/${taskId}/comments/${commentId}/replies`,
      { params },
    );
    return response.data;
  },

  createCommentReply: async (
    taskId: string,
    commentId: string,
    data: CreateTaskCommentRequest,
  ): Promise<ApiResponse<TaskComment>> => {
    const response = await axiosLocal.post<ApiResponse<TaskComment>>(
      `/task/${taskId}/comments/${commentId}/replies`,
      data,
    );
    return response.data;
  },

  updateComment: async (
    taskId: string,
    commentId: string,
    data: UpdateTaskCommentRequest,
  ): Promise<ApiResponse<TaskComment>> => {
    const response = await axiosLocal.patch<ApiResponse<TaskComment>>(
      `/task/${taskId}/comments/${commentId}`,
      data,
    );
    return response.data;
  },

  deleteComment: async (
    taskId: string,
    commentId: string,
  ): Promise<ApiResponse<DeleteTaskCommentResponse>> => {
    const response = await axiosLocal.delete<
      ApiResponse<DeleteTaskCommentResponse>
    >(`/task/${taskId}/comments/${commentId}`);
    return response.data;
  },
};