import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateListRequest } from "../types"
import { listApi } from "../api/list-api"
import { toast } from "sonner"

export const useCreateList = (boardId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateListRequest) => listApi.create(boardId, data),
        onSuccess: () => {
            toast.success("Create Successfully");
            queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
        },
        onError: (error: any) => {
            toast.error(error.response.data.message || 'Create Failed');
        }
    })
}