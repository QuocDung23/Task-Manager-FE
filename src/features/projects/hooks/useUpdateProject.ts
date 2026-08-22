import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projectApi } from "../api/project-api"
import { toast } from "sonner"
import type { ProjectRequest } from "../types"
import type { ApiError } from "@/lib/api-error"
import { applyProjectUpdated } from "../utils/project-cache"
import { projectKeys } from "../utils/project-query-keys"

export const useUpdateProject = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({id, data}: {id: string, data: Partial<ProjectRequest>}) => projectApi.update(id, data),
        onSuccess: (response, variables) => {
            toast.success('Update Successfully')
            if (response?.data) {
                applyProjectUpdated(queryClient, response.data)
            }
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) })
        },
        onError: (error: ApiError) => {
            toast.error(error.response?.data?.message || 'Update Failed')
        }
    })
}
