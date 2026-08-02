import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projectApi } from "../api/project-api"
import { toast } from "sonner"
import type { ApiError } from "@/lib/api-error"

export const useDeleteProject = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => projectApi.delete(id),
        onSuccess: () => {
            toast.success('Delete Successfully')
            queryClient.invalidateQueries({queryKey: ['projects']})
        },
        onError: (error: ApiError) => {
            toast.error(error.response?.data?.message || 'Delete Failed')
        }
    })
}
