import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projectApi } from "../api/project-api"
import { toast } from "sonner"
import type { ProjectRequest } from "../types"
import type { ApiError } from "@/lib/api-error"

export const useUpdateProject = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({id, data}: {id: string, data: Partial<ProjectRequest>}) => projectApi.update(id, data),
        onSuccess: () => {
            toast.success('Update Successfully')
            queryClient.invalidateQueries({ queryKey: ['projects'] })
        },
        onError: (error: ApiError) => {
            toast.error(error.response?.data?.message || 'Update Failed')
        }
    })
}
