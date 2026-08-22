import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projectApi } from "../api/project-api"
import { toast } from "sonner"
import type { ApiError } from "@/lib/api-error"
import { applyProjectDeleted } from "../utils/project-cache"
import { projectKeys } from "../utils/project-query-keys"

export const useDeleteProject = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => projectApi.delete(id),
        onSuccess: (_response, id) => {
            toast.success('Delete Successfully')
            applyProjectDeleted(queryClient, id)
            queryClient.invalidateQueries({ queryKey: projectKeys.all })
        },
        onError: (error: ApiError) => {
            toast.error(error.response?.data?.message || 'Delete Failed')
        }
    })
}
