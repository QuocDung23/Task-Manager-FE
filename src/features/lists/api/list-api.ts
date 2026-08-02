import { axiosLocal } from "@/services/axios";
import type { ApiResponse, CreateListRequest, ListApiResponse, ListResponse, ListStatus, ReorderListsRequest, UpdateListRequest } from "../types";

export const listApi = {
    getAllByBoardId: async (boardId: string, page: number = 1, limit: number = 12, name?: string, status?: ListStatus): Promise<ListApiResponse> => {
        const response = await axiosLocal.get<ListApiResponse>(`/list/${boardId}/getAllList`, {
            params: {page: page, limit: limit, name: name || undefined, status: status || undefined}
        })
        return response.data
    },
    getById: async (id: string): Promise<ApiResponse<ListResponse>> => {
        const response = await axiosLocal.get<ApiResponse<ListResponse>>(`/list/${id}/getListById`)
        return response.data
    },
    create: async (boardId: string, data: CreateListRequest): Promise<ApiResponse<ListResponse>> => {
        const response = await axiosLocal.post<ApiResponse<ListResponse>>(`/board/${boardId}/lists`, data)
        return response.data
    },
    update: async (id: string, data: UpdateListRequest): Promise<ApiResponse<ListResponse>> => {
        const response = await axiosLocal.put<ApiResponse<ListResponse>>(`/list/${id}/update`, data)
        return response.data
    },
    delete: async (id: string): Promise<ApiResponse<ListResponse>> => {
        const response = await axiosLocal.delete<ApiResponse<ListResponse>>(`/list/${id}/delete`)
        return response.data
    },
    reorder: async (boardId: string, data: ReorderListsRequest): Promise<ApiResponse<ListResponse[]>> => {
        const response = await axiosLocal.patch<ApiResponse<ListResponse[]>>(`/list/${boardId}/reorderList`, data)
        return response.data
    }
}