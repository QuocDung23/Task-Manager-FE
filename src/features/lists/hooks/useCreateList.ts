import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateListRequest } from "../types"
import { listApi } from "../api/list-api"
import { toast } from "sonner"
import type { ApiError } from "@/lib/api-error"
import { applyCreatedList } from "../utils/list-cache"

export const useCreateList = (boardId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateListRequest) => listApi.create(boardId, data),
        onSuccess: (response) => {
            toast.success("Create Successfully");
            applyCreatedList(queryClient, response.data);
        },
        onError: (error: ApiError) => {
            toast.error(error.response?.data?.message || 'Create Failed');
        }
    })
}
